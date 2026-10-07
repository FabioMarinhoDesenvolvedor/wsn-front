// Rotinas agendadas (Cron Triggers do Workers, gratuitos).
import type { Env } from "../env";
import { auditStatement } from "../platform/audit";
import { deps } from "./deps";

const RETENTION_MONTHS = 24; // R-LGPD-2

/** Propostas vencidas → expirada; cotação respondida sem aprovação → expirada (R-COT-7). */
export async function expireProposals(db: D1Database, now = new Date()): Promise<number> {
  const at = now.toISOString();
  const { results } = await db
    .prepare("SELECT id, quote_id FROM proposals WHERE status = 'enviada' AND valid_until < ?")
    .bind(at)
    .all<{ id: string; quote_id: string }>();
  if (!results.length) return 0;

  await db.batch(
    results.flatMap((p) => [
      db.prepare("UPDATE proposals SET status = 'expirada' WHERE id = ? AND status = 'enviada'").bind(p.id),
      db.prepare(
        `INSERT INTO quote_events (quote_id, from_status, to_status, note, created_at)
         SELECT id, status, 'expirada', 'Validade da proposta encerrada', ? FROM quotes WHERE id = ? AND status = 'respondida'`,
      ).bind(at, p.quote_id),
      db.prepare("UPDATE quotes SET status = 'expirada', updated_at = ? WHERE id = ? AND status = 'respondida'").bind(at, p.quote_id),
    ]),
  );
  return results.length;
}

const ANONYMIZE_QUOTE = `UPDATE quotes SET name_enc = NULL, email_enc = NULL, email_hash = NULL, phone_enc = NULL,
  company_enc = NULL, cnpj_enc = NULL, message_enc = NULL, ip_hash = NULL, anonymized_at = ?1`;
const ANONYMIZE_CONTACT = `UPDATE contact_messages SET name_enc = NULL, email_enc = NULL, email_hash = NULL, phone_enc = NULL,
  company_enc = NULL, body_enc = NULL, ip_hash = NULL, anonymized_at = ?1`;

/**
 * Retenção: cotações não convertidas e mensagens de contato perdem os dados pessoais
 * após 24 meses. Cotações ganhas seguem a guarda fiscal e não entram aqui.
 */
export async function applyRetention(db: D1Database, now = new Date()): Promise<{ quotes: number; contacts: number }> {
  const cutoff = new Date(now);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - RETENTION_MONTHS);
  const at = now.toISOString();
  const [q, m] = await db.batch([
    db.prepare(
      `${ANONYMIZE_QUOTE} WHERE anonymized_at IS NULL AND status IN ('perdida', 'cancelada', 'expirada') AND updated_at < ?2`,
    ).bind(at, cutoff.toISOString()),
    db.prepare(`${ANONYMIZE_CONTACT} WHERE anonymized_at IS NULL AND created_at < ?2`).bind(at, cutoff.toISOString()),
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(at),
    db.prepare("DELETE FROM login_tokens WHERE expires_at < ?").bind(at),
    db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(Math.floor(now.getTime() / 1000) - 86400),
    db.prepare("DELETE FROM outbox WHERE sent_at IS NOT NULL AND sent_at < ?").bind(new Date(now.getTime() - 30 * 86400_000).toISOString()),
  ]);
  return { quotes: q.meta.changes ?? 0, contacts: m.meta.changes ?? 0 };
}

/** Pedido do titular: apaga dados pessoais de tudo ligado ao e-mail (o histórico comercial fica). */
export async function anonymizeByEmailHash(db: D1Database, emailHash: string): Promise<{ quotes: number; contacts: number }> {
  const at = new Date().toISOString();
  const [q, m] = await db.batch([
    db.prepare(`${ANONYMIZE_QUOTE} WHERE email_hash = ?2`).bind(at, emailHash),
    db.prepare(`${ANONYMIZE_CONTACT} WHERE email_hash = ?2`).bind(at, emailHash),
  ]);
  return { quotes: q.meta.changes ?? 0, contacts: m.meta.changes ?? 0 };
}

export async function runScheduled(cron: string, env: Env): Promise<void> {
  const d = deps(env);
  await d.flushOutbox();
  if (cron === "0 9 * * *") {
    const expired = await expireProposals(env.DB);
    const retention = await applyRetention(env.DB);
    await auditStatement(env.DB, { actorId: null, action: "jobs.daily", entity: "system", detail: { expired, ...retention } }).run();
  }
}
