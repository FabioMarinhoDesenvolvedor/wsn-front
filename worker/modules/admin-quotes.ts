import { Hono } from "hono";
import { z } from "zod";
import type { Unit } from "../../shared/catalog";
import { createProposalSchema, type ProposalStatus } from "../../shared/proposal";
import { manualStatuses, protocolSchema, QUOTE_STATUSES, type QuoteStatus } from "../../shared/quote";
import type { AppEnv } from "../env";
import { auditStatement } from "../platform/audit";
import { HttpError, notFound, readJson } from "../platform/http";
import { deps } from "./deps";
import { createProposal, proposalAad, proposalLink } from "./proposals";
import { quoteAad } from "./quotes";

const PAGE_SIZE = 25;

interface QuoteListRow {
  id: string;
  protocol: string;
  status: QuoteStatus;
  name_enc: string | null;
  company_enc: string | null;
  is_sp_capital: number;
  created_at: string;
  first_response_at: string | null;
  item_count: number;
  total_cents: number | null;
  assigned_name: string | null;
  anonymized_at: string | null;
}

export const adminQuoteRoutes = new Hono<AppEnv>()
  .get("/quotes", async (c) => {
    const status = c.req.query("status");
    const search = (c.req.query("q") ?? "").trim();
    const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
    const { cipher, hasher } = deps(c.env);

    const where: string[] = [];
    const binds: unknown[] = [];
    if (status && (QUOTE_STATUSES as readonly string[]).includes(status)) {
      where.push("q.status = ?");
      binds.push(status);
    } else if (status === "abertas") {
      where.push("q.status IN ('recebida', 'em_analise', 'respondida')");
    }
    // Dados pessoais são cifrados: busca exata por protocolo ou e-mail (via hash), não por trecho de nome.
    if (search) {
      if (protocolSchema.safeParse(search.toUpperCase()).success) {
        where.push("q.protocol = ?");
        binds.push(search.toUpperCase());
      } else if (search.includes("@")) {
        where.push("q.email_hash = ?");
        binds.push(await hasher.hash("email", search.toLowerCase()));
      } else {
        where.push("q.protocol LIKE ?");
        binds.push(`%${search.replace(/[%_]/g, "")}%`);
      }
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [list, count] = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT q.id, q.protocol, q.status, q.name_enc, q.company_enc, q.is_sp_capital, q.created_at, q.first_response_at, q.anonymized_at,
           (SELECT COUNT(*) FROM quote_items i WHERE i.quote_id = q.id) AS item_count,
           (SELECT p.total_cents FROM proposals p WHERE p.quote_id = q.id ORDER BY p.version DESC LIMIT 1) AS total_cents,
           u.name AS assigned_name
         FROM quotes q LEFT JOIN users u ON u.id = q.assigned_to
         ${whereSql} ORDER BY q.created_at DESC LIMIT ? OFFSET ?`,
      ).bind(...binds, PAGE_SIZE, (page - 1) * PAGE_SIZE),
      c.env.DB.prepare(`SELECT COUNT(*) AS n FROM quotes q ${whereSql}`).bind(...binds),
    ]);

    const rows = list.results as unknown as QuoteListRow[];
    const items = await Promise.all(
      rows.map(async (r) => ({
        id: r.id,
        protocol: r.protocol,
        status: r.status,
        name: r.anonymized_at ? "Anonimizado" : await cipher.decryptOpt(r.name_enc, quoteAad("name", r.id)),
        company: r.anonymized_at ? null : await cipher.decryptOpt(r.company_enc, quoteAad("company", r.id)),
        isSpCapital: r.is_sp_capital === 1,
        createdAt: r.created_at,
        firstResponseAt: r.first_response_at,
        itemCount: r.item_count,
        totalCents: r.total_cents,
        assignedName: r.assigned_name,
      })),
    );
    const total = (count.results[0] as { n: number }).n;
    return c.json({ items, page, pageSize: PAGE_SIZE, total });
  })
  .get("/quotes/:id", async (c) => {
    const id = c.req.param("id");
    const { cipher } = deps(c.env);
    const q = await c.env.DB.prepare(
      `SELECT q.*, u.name AS assigned_name FROM quotes q LEFT JOIN users u ON u.id = q.assigned_to WHERE q.id = ?`,
    )
      .bind(id)
      .first<Record<string, string | number | null>>();
    if (!q) throw notFound("Cotação");

    const [items, events, proposals] = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT i.id, i.ref, i.name, i.unit, i.quantity, i.product_id, p.price_cents, p.image_path, p.slug
         FROM quote_items i LEFT JOIN products p ON p.id = i.product_id WHERE i.quote_id = ? ORDER BY i.position`,
      ).bind(id),
      c.env.DB.prepare(
        `SELECT e.from_status, e.to_status, e.note, e.created_at, u.name AS actor_name
         FROM quote_events e LEFT JOIN users u ON u.id = e.actor_id WHERE e.quote_id = ? ORDER BY e.created_at, e.id`,
      ).bind(id),
      c.env.DB.prepare(
        `SELECT p.id, p.version, p.status, p.valid_until, p.subtotal_cents, p.discount_cents, p.shipping_cents, p.total_cents,
           p.payment_terms, p.delivery_terms, p.notes, p.created_at, p.first_viewed_at, p.view_count, p.approved_at,
           p.approved_name_enc, p.token_enc, u.name AS created_by_name
         FROM proposals p LEFT JOIN users u ON u.id = p.created_by WHERE p.quote_id = ? ORDER BY p.version DESC`,
      ).bind(id),
    ]);

    const anonymized = Boolean(q.anonymized_at);
    const dec = (field: string) => (anonymized ? Promise.resolve(null) : cipher.decryptOpt(q[`${field}_enc`] as string | null, quoteAad(field, id)));
    const latestItems = proposals.results.length
      ? (
          await c.env.DB.prepare("SELECT ref, quantity, unit_price_cents FROM proposal_items WHERE proposal_id = ?")
            .bind((proposals.results[0] as { id: string }).id)
            .all<{ ref: string; quantity: number; unit_price_cents: number }>()
        ).results
      : [];

    await c.env.DB.prepare("INSERT INTO audit_log (actor_id, action, entity, entity_id) VALUES (?, 'quote.view', 'quote', ?)")
      .bind(c.get("user").id, id)
      .run();

    return c.json({
      id,
      protocol: q.protocol,
      status: q.status as QuoteStatus,
      nextStatuses: manualStatuses(q.status as QuoteStatus),
      customer: {
        name: await dec("name"),
        email: await dec("email"),
        phone: await dec("phone"),
        company: await dec("company"),
        cnpj: await dec("cnpj"),
        message: await dec("message"),
        cep: q.cep,
        isSpCapital: q.is_sp_capital === 1,
      },
      anonymized,
      assignedName: q.assigned_name,
      createdAt: q.created_at,
      firstResponseAt: q.first_response_at,
      items: (items.results as { id: number; ref: string; name: string; unit: Unit; quantity: number; product_id: number | null; price_cents: number | null; image_path: string | null; slug: string | null }[]).map(
        (i) => ({
          id: i.id,
          ref: i.ref,
          name: i.name,
          unit: i.unit,
          quantity: i.quantity,
          productId: i.product_id,
          imagePath: i.image_path,
          slug: i.slug,
          internalPriceCents: i.price_cents,
          lastProposal: latestItems.find((l) => l.ref === i.ref) ?? null,
        }),
      ),
      events: events.results,
      proposals: await Promise.all(
        (proposals.results as Record<string, string | number | null>[]).map(async (p) => ({
          id: p.id,
          version: p.version,
          status: p.status as ProposalStatus,
          validUntil: p.valid_until,
          subtotalCents: p.subtotal_cents,
          discountCents: p.discount_cents,
          shippingCents: p.shipping_cents,
          totalCents: p.total_cents,
          paymentTerms: p.payment_terms,
          deliveryTerms: p.delivery_terms,
          notes: p.notes,
          createdAt: p.created_at,
          createdByName: p.created_by_name,
          firstViewedAt: p.first_viewed_at,
          viewCount: p.view_count,
          approvedAt: p.approved_at,
          approvedBy: await cipher.decryptOpt(p.approved_name_enc as string | null, proposalAad("approved_name", p.id as string)),
          link: proposalLink(c.env.APP_URL, await cipher.decrypt(p.token_enc as string, proposalAad("token", p.id as string))),
        })),
      ),
    });
  })
  .post("/quotes/:id/status", async (c) => {
    const id = c.req.param("id");
    const { to, note } = await readJson(
      c,
      z.object({ to: z.enum(QUOTE_STATUSES), note: z.string().trim().max(500).optional() }),
    );
    const q = await c.env.DB.prepare("SELECT status FROM quotes WHERE id = ?").bind(id).first<{ status: QuoteStatus }>();
    if (!q) throw notFound("Cotação");
    if (!manualStatuses(q.status).includes(to)) {
      throw new HttpError(409, "invalid_transition", `Não é possível passar de "${q.status}" para "${to}"`);
    }
    const user = c.get("user");
    const at = new Date().toISOString();
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE quotes SET status = ?, assigned_to = COALESCE(assigned_to, ?), updated_at = ? WHERE id = ? AND status = ?").bind(
        to,
        user.id,
        at,
        id,
        q.status,
      ),
      c.env.DB.prepare("INSERT INTO quote_events (quote_id, from_status, to_status, note, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(
        id,
        q.status,
        to,
        note ?? null,
        user.id,
        at,
      ),
      auditStatement(c.env.DB, { actorId: user.id, action: "quote.status", entity: "quote", entityId: id, detail: { from: q.status, to }, ipHash: c.get("ipHash") }),
    ]);
    return c.json({ ok: true });
  })
  .post("/quotes/:id/notes", async (c) => {
    const id = c.req.param("id");
    const { note } = await readJson(c, z.object({ note: z.string().trim().min(1).max(1000) }));
    const q = await c.env.DB.prepare("SELECT status FROM quotes WHERE id = ?").bind(id).first<{ status: QuoteStatus }>();
    if (!q) throw notFound("Cotação");
    await c.env.DB.prepare(
      "INSERT INTO quote_events (quote_id, from_status, to_status, note, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
      .bind(id, q.status, q.status, note, c.get("user").id, new Date().toISOString())
      .run();
    return c.json({ ok: true }, 201);
  })
  .post("/quotes/:id/proposals", async (c) => {
    const input = await readJson(c, createProposalSchema);
    const { cipher, flushOutbox } = deps(c.env);
    const result = await createProposal(
      { db: c.env.DB, cipher, appUrl: c.env.APP_URL },
      c.req.param("id"),
      input,
      { id: c.get("user").id, ipHash: c.get("ipHash") },
    );
    c.executionCtx.waitUntil(flushOutbox());
    return c.json(result, 201);
  });
