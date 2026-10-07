import { Hono } from "hono";
import { z } from "zod";
import { formatPhone, isValidPhoneBR } from "../../shared/br";
import { contactToSales } from "../emails";
import type { AppEnv } from "../env";
import { clientIp, HttpError, readJson } from "../platform/http";
import { outboxInsert } from "../platform/mail";
import { hitRateLimit, RATE } from "../platform/rate-limit";
import { assertHuman } from "../platform/turnstile";
import { deps } from "./deps";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().max(160).pipe(z.email("E-mail inválido")),
  phone: z
    .string()
    .trim()
    .max(20)
    .optional()
    .refine((v) => !v || isValidPhoneBR(v), "Telefone com DDD inválido"),
  company: z.string().trim().max(120).optional(),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(5, "Escreva sua mensagem").max(3000),
  consent: z.literal(true, "É preciso aceitar a política de privacidade"),
  turnstileToken: z.string().max(4096),
  website: z.string().max(0).optional(),
});

export const contactAad = (field: string, id: string) => `contact.${field}:${id}`;

export const contactRoutes = new Hono<AppEnv>().post("/contact", async (c) => {
  const input = await readJson(c, contactSchema);
  if (input.website) throw new HttpError(422, "validation", "Não foi possível enviar");
  const { cipher, hasher, captcha, flushOutbox } = deps(c.env);
  await assertHuman(captcha, input.turnstileToken, clientIp(c));
  await hitRateLimit(c.env.DB, RATE.contactSubmit(c.get("ipHash")));

  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  const enc = (field: string, v: string | undefined) => cipher.encryptOpt(v, contactAad(field, id));
  const phone = input.phone ? formatPhone(input.phone) : undefined;

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO contact_messages (id, name_enc, email_enc, email_hash, phone_enc, company_enc, subject, body_enc, consent_at, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      await enc("name", input.name),
      await enc("email", input.email),
      await hasher.hash("email", input.email),
      await enc("phone", phone),
      await enc("company", input.company),
      input.subject ?? null,
      await enc("body", input.message),
      at,
      c.get("ipHash"),
      at,
    ),
    await outboxInsert(c.env.DB, cipher)(
      "contact.new",
      contactToSales({
        to: c.env.MAIL_TO_SALES,
        name: input.name,
        email: input.email,
        phone: phone ?? null,
        company: input.company ?? null,
        subject: input.subject ?? null,
        body: input.message,
      }),
    ),
  ]);

  c.executionCtx.waitUntil(flushOutbox());
  return c.json({ ok: true }, 201);
});
