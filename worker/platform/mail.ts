import type { Env } from "../env";
import type { FieldCipher } from "./crypto";

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/** Porta de envio — o domínio não sabe se é Resend, SMTP ou log (DIP). */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export function createResendMailer(apiKey: string, from: string, fetcher: typeof fetch = fetch): Mailer {
  return {
    async send(m) {
      const res = await fetcher("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}`);
    },
  };
}

/** Desenvolvimento: registra só o assunto e o destino mascarado; o corpo fica no outbox. */
export const logMailer: Mailer = {
  async send(m) {
    console.log(`[mail:dev] → ${m.to.replace(/(^.).*(@.*$)/, "$1***$2")} · ${m.subject}`);
    const link = /https?:\/\/\S+\/(admin\/entrar|proposta)\/[\w-]+/.exec(m.text)?.[0];
    if (link) console.log(`[mail:dev] link: ${link}`);
  },
};

export const createMailer = (env: Env): Mailer =>
  env.RESEND_API_KEY ? createResendMailer(env.RESEND_API_KEY, env.MAIL_FROM) : logMailer;

// ---- Outbox: e-mail é gravado na mesma operação do dado e entregue depois ----

const AAD = "outbox";

export function outboxInsert(db: D1Database, cipher: FieldCipher) {
  return async (kind: string, m: MailMessage): Promise<D1PreparedStatement> =>
    db
      .prepare("INSERT INTO outbox (kind, to_enc, subject, html_enc, text_enc) VALUES (?, ?, ?, ?, ?)")
      .bind(kind, await cipher.encrypt(m.to, AAD), m.subject, await cipher.encrypt(m.html, AAD), await cipher.encrypt(m.text, AAD));
}

const MAX_ATTEMPTS = 8;

/** Entrega pendentes com backoff exponencial; depois de enviado, apaga o conteúdo (minimização LGPD). */
export async function deliverOutbox(db: D1Database, cipher: FieldCipher, mailer: Mailer, limit = 20): Promise<number> {
  const now = new Date().toISOString();
  const { results } = await db
    .prepare(
      `SELECT id, to_enc, subject, html_enc, text_enc, attempts FROM outbox
       WHERE sent_at IS NULL AND attempts < ?1 AND next_attempt_at <= ?2
       ORDER BY id LIMIT ?3`,
    )
    .bind(MAX_ATTEMPTS, now, limit)
    .all<{ id: number; to_enc: string; subject: string; html_enc: string; text_enc: string; attempts: number }>();

  let sent = 0;
  for (const row of results) {
    try {
      await mailer.send({
        to: await cipher.decrypt(row.to_enc, AAD),
        subject: row.subject,
        html: await cipher.decrypt(row.html_enc, AAD),
        text: await cipher.decrypt(row.text_enc, AAD),
      });
      await db
        .prepare("UPDATE outbox SET sent_at = ?, to_enc = '', html_enc = '', text_enc = '', last_error = NULL WHERE id = ?")
        .bind(new Date().toISOString(), row.id)
        .run();
      sent++;
    } catch (err) {
      const attempts = row.attempts + 1;
      const next = new Date(Date.now() + 2 ** attempts * 60_000).toISOString();
      await db
        .prepare("UPDATE outbox SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?")
        .bind(attempts, next, String(err instanceof Error ? err.message : err).slice(0, 200), row.id)
        .run();
    }
  }
  return sent;
}
