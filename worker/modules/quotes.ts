import { Hono } from "hono";
import { formatCep, formatPhone, isSpCapitalCep } from "../../shared/br";
import { formatProtocol, submitQuoteSchema, type SubmitQuoteData, type SubmitQuoteResult } from "../../shared/quote";
import { newQuoteToSales, quoteConfirmationToCustomer } from "../emails";
import type { AppEnv } from "../env";
import type { FieldCipher, Hasher } from "../platform/crypto";
import { clientIp, HttpError, readJson } from "../platform/http";
import { outboxInsert } from "../platform/mail";
import { hitRateLimit, RATE } from "../platform/rate-limit";
import { assertHuman, type CaptchaVerifier } from "../platform/turnstile";
import { activeProductsByRefs } from "./catalog";
import { deps } from "./deps";

export const quoteAad = (field: string, id: string) => `quotes.${field}:${id}`;

/** Ano corrente no fuso de São Paulo (UTC−3). */
const spYear = (now: Date) => new Date(now.getTime() - 3 * 3600_000).getUTCFullYear();

export async function nextProtocol(db: D1Database, now: Date): Promise<string> {
  const year = spYear(now);
  const row = await db
    .prepare(
      `INSERT INTO counters (name, value) VALUES (?, 1)
       ON CONFLICT (name) DO UPDATE SET value = value + 1 RETURNING value`,
    )
    .bind(`quote-${year}`)
    .first<{ value: number }>();
  return formatProtocol(year, row!.value);
}

export interface SubmitQuoteDeps {
  db: D1Database;
  cipher: FieldCipher;
  hasher: Hasher;
  captcha: CaptchaVerifier;
  appUrl: string;
  salesEmail: string;
}

export interface SubmitContext {
  ip: string;
  ipHash: string;
  idempotencyKey: string;
  now?: Date;
}

/** Caso de uso: valida, numera, cifra, grava cotação + itens + evento + e-mails numa transação. */
export async function submitQuote(d: SubmitQuoteDeps, input: SubmitQuoteData, ctx: SubmitContext): Promise<SubmitQuoteResult> {
  const now = ctx.now ?? new Date();

  // R-COT-8: reenvio com a mesma chave devolve a mesma cotação.
  const existing = await d.db
    .prepare("SELECT protocol, is_sp_capital FROM quotes WHERE idempotency_key = ?")
    .bind(ctx.idempotencyKey)
    .first<{ protocol: string; is_sp_capital: number }>();
  if (existing) return { protocol: existing.protocol, isSpCapital: existing.is_sp_capital === 1 };

  if (input.website) throw new HttpError(422, "validation", "Não foi possível enviar"); // honeypot
  await assertHuman(d.captcha, input.turnstileToken, ctx.ip);
  await hitRateLimit(d.db, RATE.quoteSubmit(ctx.ipHash));

  const products = await activeProductsByRefs(d.db, input.items.map((i) => i.ref));
  const unavailable = input.items.filter((i) => !products.has(i.ref)).map((i) => i.ref);
  if (unavailable.length) {
    throw new HttpError(409, "unavailable_items", "Alguns produtos não estão mais disponíveis", {
      items: unavailable.join(","),
    });
  }

  const id = crypto.randomUUID();
  const protocol = await nextProtocol(d.db, now);
  const c = input.customer;
  const isSpCapital = isSpCapitalCep(c.cep);
  const at = now.toISOString();
  const enc = (field: string, v: string | undefined) => d.cipher.encryptOpt(v, quoteAad(field, id));

  const items = input.items.map((i, position) => {
    const p = products.get(i.ref)!;
    return { productId: p.id, ref: p.ref, name: p.name, unit: p.unit, quantity: i.quantity, position };
  });

  const queueMail = outboxInsert(d.db, d.cipher);
  const statements: D1PreparedStatement[] = [
    d.db
      .prepare(
        `INSERT INTO quotes (id, protocol, status, idempotency_key, name_enc, email_enc, email_hash, phone_enc,
           company_enc, cnpj_enc, message_enc, cep, is_sp_capital, consent_at, ip_hash, created_at, updated_at)
         VALUES (?, ?, 'recebida', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        protocol,
        ctx.idempotencyKey,
        await enc("name", c.name),
        await enc("email", c.email),
        await d.hasher.hash("email", c.email),
        await enc("phone", formatPhone(c.phone)),
        await enc("company", c.company),
        await enc("cnpj", c.cnpj),
        await enc("message", c.message),
        formatCep(c.cep),
        isSpCapital ? 1 : 0,
        at,
        ctx.ipHash,
        at,
        at,
      ),
    ...items.map((i) =>
      d.db
        .prepare("INSERT INTO quote_items (quote_id, product_id, ref, name, unit, quantity, position) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, i.productId, i.ref, i.name, i.unit, i.quantity, i.position),
    ),
    d.db.prepare("INSERT INTO quote_events (quote_id, from_status, to_status, created_at) VALUES (?, NULL, 'recebida', ?)").bind(id, at),
    await queueMail(
      "quote.new",
      newQuoteToSales({
        to: d.salesEmail,
        protocol,
        name: c.name,
        company: c.company ?? null,
        email: c.email,
        phone: formatPhone(c.phone),
        cep: formatCep(c.cep),
        isSpCapital,
        message: c.message ?? null,
        items,
        adminUrl: `${d.appUrl}/admin/cotacoes/${id}`,
      }),
    ),
    await queueMail("quote.confirmation", quoteConfirmationToCustomer({ to: c.email, name: c.name, protocol, items })),
  ];

  try {
    await d.db.batch(statements); // D1 executa o batch como uma transação
  } catch (err) {
    // Corrida entre dois envios com a mesma chave: o perdedor devolve o vencedor.
    const winner = await d.db
      .prepare("SELECT protocol, is_sp_capital FROM quotes WHERE idempotency_key = ?")
      .bind(ctx.idempotencyKey)
      .first<{ protocol: string; is_sp_capital: number }>();
    if (winner) return { protocol: winner.protocol, isSpCapital: winner.is_sp_capital === 1 };
    throw err;
  }

  return { protocol, isSpCapital };
}

const idempotencyKeyPattern = /^[A-Za-z0-9_-]{16,64}$/;

export const quoteRoutes = new Hono<AppEnv>().post("/quotes", async (c) => {
  const idempotencyKey = c.req.header("idempotency-key") ?? "";
  if (!idempotencyKeyPattern.test(idempotencyKey)) throw new HttpError(400, "idempotency", "Cabeçalho Idempotency-Key ausente");

  const input = await readJson(c, submitQuoteSchema);
  const { cipher, hasher, captcha } = deps(c.env);
  const result = await submitQuote(
    { db: c.env.DB, cipher, hasher, captcha, appUrl: c.env.APP_URL, salesEmail: c.env.MAIL_TO_SALES },
    input,
    { ip: clientIp(c), ipHash: c.get("ipHash"), idempotencyKey },
  );
  c.executionCtx.waitUntil(deps(c.env).flushOutbox());
  return c.json(result, 201);
});
