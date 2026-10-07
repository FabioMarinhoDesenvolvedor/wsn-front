import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { auditStatement } from "../platform/audit";
import { HttpError, notFound, readJson } from "../platform/http";
import { requireUser } from "./auth";
import { contactAad } from "./contact";
import { deps } from "./deps";
import { anonymizeByEmailHash } from "./jobs";
import { quoteAad } from "./quotes";

// ---------- Painel de inteligência comercial ----------

export const insightsRoutes = new Hono<AppEnv>().get("/insights", async (c) => {
  const days = [7, 30, 90, 365].includes(Number(c.req.query("days"))) ? Number(c.req.query("days")) : 30;
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const staleBefore = new Date(Date.now() - 24 * 3600_000).toISOString();
  const now = new Date().toISOString();
  const db = c.env.DB;

  const [summary, won, response, topProducts, weekly, misses, stale, hot] = await db.batch([
    db.prepare(
      `SELECT COUNT(*) AS received,
         SUM(status = 'ganha') AS won, SUM(status = 'perdida') AS lost, SUM(status = 'expirada') AS expired,
         SUM(status IN ('recebida', 'em_analise')) AS waiting, SUM(status = 'respondida') AS proposed
       FROM quotes WHERE created_at >= ?`,
    ).bind(since),
    db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(total_cents), 0) AS cents FROM proposals WHERE status = 'aprovada' AND approved_at >= ?`).bind(since),
    db.prepare(
      `SELECT AVG((julianday(first_response_at) - julianday(created_at)) * 24) AS avg_hours, COUNT(*) AS n
       FROM quotes WHERE created_at >= ? AND first_response_at IS NOT NULL`,
    ).bind(since),
    db.prepare(
      `SELECT i.ref, MAX(i.name) AS name, COUNT(DISTINCT i.quote_id) AS quotes, SUM(i.quantity) AS quantity, MAX(i.unit) AS unit
       FROM quote_items i JOIN quotes q ON q.id = i.quote_id WHERE q.created_at >= ?
       GROUP BY i.ref ORDER BY quotes DESC, quantity DESC LIMIT 8`,
    ).bind(since),
    db.prepare(
      `SELECT date(created_at, 'weekday 1', '-7 days') AS week, COUNT(*) AS n, SUM(status = 'ganha') AS won
       FROM quotes WHERE created_at >= date('now', '-84 days') GROUP BY week ORDER BY week`,
    ),
    db.prepare("SELECT term, count, last_at FROM search_misses ORDER BY count DESC, last_at DESC LIMIT 10"),
    db.prepare(
      `SELECT id, protocol, created_at FROM quotes WHERE status IN ('recebida', 'em_analise') AND created_at < ?
       ORDER BY created_at LIMIT 5`,
    ).bind(staleBefore),
    db.prepare(
      `SELECT q.id, q.protocol, p.total_cents, p.view_count, p.first_viewed_at, p.valid_until
       FROM proposals p JOIN quotes q ON q.id = p.quote_id
       WHERE p.status = 'enviada' AND p.view_count > 0 AND p.valid_until > ?
       ORDER BY p.first_viewed_at DESC LIMIT 5`,
    ).bind(now),
  ]);

  const s = summary.results[0] as Record<string, number | null>;
  const decided = (s.won ?? 0) + (s.lost ?? 0) + (s.expired ?? 0);
  const w = won.results[0] as { n: number; cents: number };
  const r = response.results[0] as { avg_hours: number | null; n: number };

  return c.json({
    days,
    received: s.received ?? 0,
    waiting: s.waiting ?? 0,
    proposed: s.proposed ?? 0,
    won: s.won ?? 0,
    lost: s.lost ?? 0,
    expired: s.expired ?? 0,
    conversionRate: decided ? (s.won ?? 0) / decided : null,
    wonValueCents: w.cents,
    approvedProposals: w.n,
    avgFirstResponseHours: r.avg_hours,
    topProducts: topProducts.results,
    weekly: weekly.results,
    searchMisses: misses.results,
    stale: stale.results,
    hotProposals: hot.results,
  });
});

// ---------- Mensagens de contato ----------

export const contactAdminRoutes = new Hono<AppEnv>()
  .get("/contact-messages", async (c) => {
    const { cipher } = deps(c.env);
    const { results } = await c.env.DB.prepare(
      `SELECT id, status, name_enc, email_enc, phone_enc, company_enc, subject, body_enc, created_at, anonymized_at
       FROM contact_messages ORDER BY created_at DESC LIMIT 100`,
    ).all<Record<string, string | null>>();
    const items = await Promise.all(
      results.map(async (m) => {
        const id = m.id!;
        const dec = (f: string) => (m.anonymized_at ? null : cipher.decryptOpt(m[`${f}_enc`], contactAad(f, id)));
        return {
          id,
          status: m.status,
          subject: m.subject,
          createdAt: m.created_at,
          name: await dec("name"),
          email: await dec("email"),
          phone: await dec("phone"),
          company: await dec("company"),
          message: await dec("body"),
        };
      }),
    );
    return c.json({ items });
  })
  .patch("/contact-messages/:id", async (c) => {
    const { status } = await readJson(c, z.object({ status: z.enum(["nova", "respondida", "arquivada"]) }));
    const res = await c.env.DB.prepare("UPDATE contact_messages SET status = ? WHERE id = ?").bind(status, c.req.param("id")).run();
    if (!res.meta.changes) throw notFound("Mensagem");
    return c.json({ ok: true });
  });

// ---------- Equipe (só admin) ----------

const userInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().max(160).pipe(z.email()),
  role: z.enum(["admin", "vendedor"]),
  active: z.boolean(),
});

export const usersRoutes = new Hono<AppEnv>()
  .use(requireUser("admin"))
  .get("/users", async (c) => {
    const { results } = await c.env.DB.prepare(
      "SELECT id, name, email, role, active, created_at AS createdAt, last_login_at AS lastLoginAt FROM users ORDER BY name",
    ).all<Record<string, unknown>>();
    return c.json({ items: results.map((u) => ({ ...u, active: u.active === 1 })) });
  })
  .post("/users", async (c) => {
    const input = await readJson(c, userInput);
    const id = crypto.randomUUID();
    try {
      await c.env.DB.batch([
        c.env.DB.prepare("INSERT INTO users (id, email, name, role, active) VALUES (?, ?, ?, ?, ?)").bind(id, input.email, input.name, input.role, input.active ? 1 : 0),
        auditStatement(c.env.DB, { actorId: c.get("user").id, action: "user.create", entity: "user", entityId: id, detail: { role: input.role }, ipHash: c.get("ipHash") }),
      ]);
    } catch {
      throw new HttpError(409, "duplicate", "Já existe alguém com este e-mail");
    }
    return c.json({ id }, 201);
  })
  .patch("/users/:id", async (c) => {
    const id = c.req.param("id");
    const input = await readJson(c, userInput.omit({ email: true }));
    const me = c.get("user");
    if (id === me.id && (input.role !== "admin" || !input.active)) {
      throw new HttpError(409, "self_lockout", "Você não pode remover o próprio acesso de administrador");
    }
    const statements = [
      c.env.DB.prepare("UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?").bind(input.name, input.role, input.active ? 1 : 0, id),
      auditStatement(c.env.DB, { actorId: me.id, action: "user.update", entity: "user", entityId: id, detail: { role: input.role, active: input.active }, ipHash: c.get("ipHash") }),
    ];
    if (!input.active) statements.push(c.env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
    await c.env.DB.batch(statements);
    return c.json({ ok: true });
  })
  .get("/audit", async (c) => {
    const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
    const { results } = await c.env.DB.prepare(
      `SELECT a.id, a.action, a.entity, a.entity_id AS entityId, a.detail, a.created_at AS createdAt, u.name AS actorName
       FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.id DESC LIMIT 50 OFFSET ?`,
    )
      .bind((page - 1) * 50)
      .all();
    return c.json({ items: results, page });
  })
  // LGPD: pedido do titular → anonimiza tudo ligado ao e-mail (R-LGPD-3).
  .post("/privacy/anonymize", async (c) => {
    const { email } = await readJson(c, z.object({ email: z.string().trim().toLowerCase().pipe(z.email()) }));
    const emailHash = await deps(c.env).hasher.hash("email", email);
    const affected = await anonymizeByEmailHash(c.env.DB, emailHash);
    await auditStatement(c.env.DB, {
      actorId: c.get("user").id,
      action: "privacy.anonymize",
      entity: "data_subject",
      detail: affected,
      ipHash: c.get("ipHash"),
    }).run();
    return c.json(affected);
  });

/** Exportação CSV das cotações, 300 por arquivo (?page=) — decifrar custa CPU no plano gratuito. */
export const exportRoutes = new Hono<AppEnv>().use(requireUser("admin")).get("/quotes.csv", async (c) => {
  const { cipher } = deps(c.env);
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const { results } = await c.env.DB.prepare(
    `SELECT q.id, q.protocol, q.status, q.created_at, q.cep, q.name_enc, q.company_enc, q.anonymized_at,
       (SELECT total_cents FROM proposals p WHERE p.quote_id = q.id ORDER BY version DESC LIMIT 1) AS total_cents
     FROM quotes q ORDER BY q.created_at DESC LIMIT 300 OFFSET ?`,
  ).bind((page - 1) * 300).all<Record<string, string | number | null>>();
  const cell = (v: unknown) => {
    const s = v == null ? "" : String(v);
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s; // evita injeção de fórmula no Excel
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const lines = ["protocolo;status;criado_em;cep;nome;empresa;total_proposta"];
  for (const r of results) {
    const id = r.id as string;
    const anon = Boolean(r.anonymized_at);
    lines.push(
      [
        r.protocol,
        r.status,
        r.created_at,
        r.cep,
        anon ? "" : await cipher.decryptOpt(r.name_enc as string | null, quoteAad("name", id)),
        anon ? "" : await cipher.decryptOpt(r.company_enc as string | null, quoteAad("company", id)),
        r.total_cents == null ? "" : (Number(r.total_cents) / 100).toFixed(2).replace(".", ","),
      ]
        .map(cell)
        .join(";"),
    );
  }
  await auditStatement(c.env.DB, { actorId: c.get("user").id, action: "quote.export", entity: "quote", detail: { rows: results.length } }).run();
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cotacoes-wsn-${new Date().toISOString().slice(0, 10)}-p${page}.csv"`,
      "Cache-Control": "no-store",
    },
  });
});
