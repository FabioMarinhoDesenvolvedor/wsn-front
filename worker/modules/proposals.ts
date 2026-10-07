// Proposta comercial: o vendedor precifica a cotação no painel e o cliente recebe um
// link pessoal (token de 256 bits) para ver, imprimir e aprovar online.
import { Hono } from "hono";
import type { Unit } from "../../shared/catalog";
import {
  approveProposalSchema,
  computeTotals,
  isProposalExpired,
  validUntil,
  type CreateProposalInput,
  type ProposalStatus,
  type PublicProposal,
} from "../../shared/proposal";
import { canTransition, type QuoteStatus } from "../../shared/quote";
import { proposalApprovedToSales, proposalToCustomer } from "../emails";
import type { AppEnv } from "../env";
import { auditStatement } from "../platform/audit";
import { randomToken, sha256, type FieldCipher } from "../platform/crypto";
import { HttpError, notFound, readJson } from "../platform/http";
import { outboxInsert } from "../platform/mail";
import { hitRateLimit, RATE } from "../platform/rate-limit";
import { deps } from "./deps";
import { quoteAad } from "./quotes";

export const proposalAad = (field: string, id: string) => `proposals.${field}:${id}`;
export const proposalLink = (appUrl: string, token: string) => `${appUrl}/proposta/${token}`;

interface CreateProposalDeps {
  db: D1Database;
  cipher: FieldCipher;
  appUrl: string;
}

/** Caso de uso: cria a versão N da proposta, substitui a anterior e marca a cotação como respondida. */
export async function createProposal(
  d: CreateProposalDeps,
  quoteId: string,
  input: Required<Pick<CreateProposalInput, "items" | "validDays" | "shippingCents" | "discountCents" | "notifyCustomer">> &
    Pick<CreateProposalInput, "paymentTerms" | "deliveryTerms" | "notes">,
  actor: { id: string; ipHash: string },
  now = new Date(),
): Promise<{ id: string; version: number; link: string }> {
  const quote = await d.db
    .prepare("SELECT id, protocol, status, name_enc, email_enc, first_response_at, anonymized_at FROM quotes WHERE id = ?")
    .bind(quoteId)
    .first<{ id: string; protocol: string; status: QuoteStatus; name_enc: string; email_enc: string; first_response_at: string | null; anonymized_at: string | null }>();
  if (!quote) throw notFound("Cotação");
  if (quote.anonymized_at) throw new HttpError(409, "anonymized", "Cotação anonimizada");
  if (!canTransition(quote.status, "respondida")) {
    throw new HttpError(409, "invalid_status", `Não é possível enviar proposta para uma cotação "${quote.status}"`);
  }

  const { results: quoteItems } = await d.db
    .prepare("SELECT id, ref, name, unit FROM quote_items WHERE quote_id = ? ORDER BY position")
    .bind(quoteId)
    .all<{ id: number; ref: string; name: string; unit: string }>();
  const byId = new Map(quoteItems.map((i) => [i.id, i]));
  if (input.items.some((i) => !byId.has(i.quoteItemId))) throw new HttpError(422, "validation", "Item não pertence à cotação");

  const lines = input.items.map((i, position) => ({ ...byId.get(i.quoteItemId)!, quantity: i.quantity, unitPriceCents: i.unitPriceCents, position }));
  const totals = computeTotals(lines, input.discountCents, input.shippingCents);

  const last = await d.db
    .prepare("SELECT COALESCE(MAX(version), 0) AS v FROM proposals WHERE quote_id = ?")
    .bind(quoteId)
    .first<{ v: number }>();
  const version = (last?.v ?? 0) + 1;
  const id = crypto.randomUUID();
  const token = randomToken();
  const at = now.toISOString();
  const until = validUntil(now, input.validDays);
  const link = proposalLink(d.appUrl, token);

  const statements: D1PreparedStatement[] = [
    d.db.prepare("UPDATE proposals SET status = 'substituida' WHERE quote_id = ? AND status = 'enviada'").bind(quoteId),
    d.db
      .prepare(
        `INSERT INTO proposals (id, quote_id, version, token_hash, token_enc, status, valid_until, subtotal_cents, discount_cents,
           shipping_cents, total_cents, payment_terms, delivery_terms, notes, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, 'enviada', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        quoteId,
        version,
        await sha256(token),
        await d.cipher.encrypt(token, proposalAad("token", id)),
        until,
        totals.subtotalCents,
        totals.discountCents,
        totals.shippingCents,
        totals.totalCents,
        input.paymentTerms || null,
        input.deliveryTerms || null,
        input.notes || null,
        actor.id,
        at,
      ),
    ...lines.map((l) =>
      d.db
        .prepare("INSERT INTO proposal_items (proposal_id, ref, name, unit, quantity, unit_price_cents, position) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, l.ref, l.name, l.unit, l.quantity, l.unitPriceCents, l.position),
    ),
    d.db
      .prepare("UPDATE quotes SET status = 'respondida', first_response_at = COALESCE(first_response_at, ?), assigned_to = COALESCE(assigned_to, ?), updated_at = ? WHERE id = ?")
      .bind(at, actor.id, at, quoteId),
    d.db
      .prepare("INSERT INTO quote_events (quote_id, from_status, to_status, note, actor_id, created_at) VALUES (?, ?, 'respondida', ?, ?, ?)")
      .bind(quoteId, quote.status, `Proposta v${version} enviada`, actor.id, at),
    auditStatement(d.db, { actorId: actor.id, action: "proposal.create", entity: "quote", entityId: quoteId, detail: { version, totalCents: totals.totalCents }, ipHash: actor.ipHash }),
  ];

  if (input.notifyCustomer) {
    const [name, email] = await Promise.all([
      d.cipher.decrypt(quote.name_enc, quoteAad("name", quoteId)),
      d.cipher.decrypt(quote.email_enc, quoteAad("email", quoteId)),
    ]);
    statements.push(
      await outboxInsert(d.db, d.cipher)(
        "proposal.sent",
        proposalToCustomer({ to: email, name, protocol: quote.protocol, link, totalCents: totals.totalCents, validUntil: until, version }),
      ),
    );
  }

  await d.db.batch(statements);
  return { id, version, link };
}

interface ProposalRow {
  id: string;
  quote_id: string;
  version: number;
  status: ProposalStatus;
  valid_until: string;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  total_cents: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  approved_name_enc: string | null;
  first_viewed_at: string | null;
  protocol: string;
  quote_status: QuoteStatus;
  name_enc: string | null;
  company_enc: string | null;
  seller_name: string | null;
}

async function findByToken(db: D1Database, token: string): Promise<ProposalRow | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db
    .prepare(
      `SELECT p.*, q.protocol, q.status AS quote_status, q.name_enc, q.company_enc, u.name AS seller_name
       FROM proposals p JOIN quotes q ON q.id = p.quote_id LEFT JOIN users u ON u.id = p.created_by
       WHERE p.token_hash = ?`,
    )
    .bind(await sha256(token))
    .first<ProposalRow>();
}

/** Estado efetivo: uma proposta "enviada" com validade vencida já é tratada como expirada. */
const effectiveStatus = (p: ProposalRow, now = new Date()): ProposalStatus =>
  p.status === "enviada" && isProposalExpired(p.valid_until, now) ? "expirada" : p.status;

async function toPublic(db: D1Database, cipher: FieldCipher, p: ProposalRow): Promise<PublicProposal> {
  const { results } = await db
    .prepare("SELECT ref, name, unit, quantity, unit_price_cents FROM proposal_items WHERE proposal_id = ? ORDER BY position")
    .bind(p.id)
    .all<{ ref: string; name: string; unit: Unit; quantity: number; unit_price_cents: number }>();
  const fullName = (await cipher.decryptOpt(p.name_enc, quoteAad("name", p.quote_id))) ?? "Cliente";
  return {
    protocol: p.protocol,
    version: p.version,
    status: effectiveStatus(p),
    customerName: fullName.split(" ")[0], // link pode ser encaminhado: mostra só o primeiro nome
    companyName: await cipher.decryptOpt(p.company_enc, quoteAad("company", p.quote_id)),
    createdAt: p.created_at,
    validUntil: p.valid_until,
    items: results.map((r) => ({
      ref: r.ref,
      name: r.name,
      unit: r.unit,
      quantity: r.quantity,
      unitPriceCents: r.unit_price_cents,
      totalCents: r.quantity * r.unit_price_cents,
    })),
    totals: {
      subtotalCents: p.subtotal_cents,
      discountCents: p.discount_cents,
      shippingCents: p.shipping_cents,
      totalCents: p.total_cents,
    },
    paymentTerms: p.payment_terms,
    deliveryTerms: p.delivery_terms,
    notes: p.notes,
    approvedAt: p.approved_at,
    approvedBy: await cipher.decryptOpt(p.approved_name_enc, proposalAad("approved_name", p.id)),
    sellerName: p.seller_name,
  };
}

export const proposalPublicRoutes = new Hono<AppEnv>()
  .get("/proposals/:token", async (c) => {
    const p = await findByToken(c.env.DB, c.req.param("token"));
    if (!p) throw notFound("Proposta");
    // Métrica de engajamento: quando o cliente abriu (aparece para o vendedor).
    c.executionCtx.waitUntil(
      c.env.DB.prepare("UPDATE proposals SET view_count = view_count + 1, first_viewed_at = COALESCE(first_viewed_at, ?) WHERE id = ?")
        .bind(new Date().toISOString(), p.id)
        .run(),
    );
    c.header("X-Robots-Tag", "noindex, nofollow");
    return c.json(await toPublic(c.env.DB, deps(c.env).cipher, p));
  })
  .post("/proposals/:token/approve", async (c) => {
    const input = await readJson(c, approveProposalSchema);
    await hitRateLimit(c.env.DB, RATE.proposalApprove(c.get("ipHash")));
    const { cipher, flushOutbox } = deps(c.env);
    const p = await findByToken(c.env.DB, c.req.param("token"));
    if (!p) throw notFound("Proposta");

    const status = effectiveStatus(p);
    if (status === "aprovada") return c.json(await toPublic(c.env.DB, cipher, p)); // idempotente
    if (status === "substituida") throw new HttpError(409, "superseded", "Esta proposta foi atualizada. Use o link da versão mais recente.");
    if (status === "expirada") throw new HttpError(410, "expired", "Esta proposta expirou. Fale com a WSN para atualizar os valores.");
    if (!canTransition(p.quote_status, "ganha")) throw new HttpError(409, "invalid_status", "Esta cotação não aceita mais aprovação.");

    const at = new Date().toISOString();
    const statements = [
      c.env.DB.prepare(
        "UPDATE proposals SET status = 'aprovada', approved_at = ?, approved_name_enc = ?, approved_ip_hash = ? WHERE id = ? AND status = 'enviada'",
      ).bind(at, await cipher.encrypt(input.name, proposalAad("approved_name", p.id)), c.get("ipHash"), p.id),
      c.env.DB.prepare("UPDATE quotes SET status = 'ganha', updated_at = ? WHERE id = ?").bind(at, p.quote_id),
      c.env.DB.prepare(
        "INSERT INTO quote_events (quote_id, from_status, to_status, note, created_at) VALUES (?, ?, 'ganha', ?, ?)",
      ).bind(p.quote_id, p.quote_status, `Proposta v${p.version} aprovada pelo cliente`, at),
      auditStatement(c.env.DB, { actorId: null, action: "proposal.approve", entity: "quote", entityId: p.quote_id, detail: { version: p.version }, ipHash: c.get("ipHash") }),
      await outboxInsert(c.env.DB, cipher)(
        "proposal.approved",
        proposalApprovedToSales({
          to: c.env.MAIL_TO_SALES,
          protocol: p.protocol,
          approvedBy: input.name,
          totalCents: p.total_cents,
          adminUrl: `${c.env.APP_URL}/admin/cotacoes/${p.quote_id}`,
        }),
      ),
    ];
    await c.env.DB.batch(statements);
    c.executionCtx.waitUntil(flushOutbox());

    const fresh = await findByToken(c.env.DB, c.req.param("token"));
    return c.json(await toPublic(c.env.DB, cipher, fresh!));
  });
