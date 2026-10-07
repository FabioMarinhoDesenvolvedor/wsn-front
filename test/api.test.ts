import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { PublicCatalog } from "../shared/catalog";
import type { PublicProposal } from "../shared/proposal";
import worker from "../worker/index";
import { expireProposals } from "../worker/modules/jobs";
import { api, createUser, freshIp, idemKey, loginAs, seedCatalog, submitQuote, validQuote } from "./helpers";

beforeEach(seedCatalog);

const quoteIdOf = async (protocol: string) =>
  (await env.DB.prepare("SELECT id FROM quotes WHERE protocol = ?").bind(protocol).first<{ id: string }>())!.id;

describe("catálogo público", () => {
  it("nunca expõe preço interno nem produto inativo (R-CAT-4, R-CAT-5)", async () => {
    const res = await api("/api/catalog");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toMatch(/price/i);
    const catalog = JSON.parse(text) as PublicCatalog;
    expect(catalog.products.map((p) => p.ref).sort()).toEqual(["0003", "0038"]);
  });
});

describe("envio de cotação", () => {
  it("gera protocolo, grava itens como snapshot e cifra os dados pessoais", async () => {
    const res = await submitQuote();
    expect(res.status).toBe(201);
    const body = (await res.json()) as { protocol: string; isSpCapital: boolean };
    expect(body.protocol).toMatch(/^WSN-\d{4}-\d{6}$/);
    expect(body.isSpCapital).toBe(true);

    const row = await env.DB.prepare("SELECT * FROM quotes WHERE protocol = ?").bind(body.protocol).first<Record<string, unknown>>();
    expect(row!.status).toBe("recebida");
    // Nada em claro no banco: um dump sem a chave não revela o cliente (critério 5).
    const dump = JSON.stringify(row);
    for (const secret of ["Maria", "restaurante.com.br", "98765", "Bom Prato", "11222333"]) expect(dump).not.toContain(secret);
    expect(row!.email_enc).toMatch(/^v1\./);

    const items = await env.DB.prepare("SELECT ref, name, quantity FROM quote_items WHERE quote_id = ? ORDER BY position").bind(row!.id).all();
    expect(items.results).toEqual([
      { ref: "0003", name: "Detergente neutro – 500 ml", quantity: 10 },
      { ref: "0038", name: "Luva látex com pó Descarpack", quantity: 2 },
    ]);

    const mails = await env.DB.prepare("SELECT kind, subject FROM outbox ORDER BY id").all<{ kind: string; subject: string }>();
    expect(mails.results.map((m) => m.kind)).toEqual(expect.arrayContaining(["quote.new", "quote.confirmation"]));
  });

  it("reenvio com a mesma Idempotency-Key não duplica (R-COT-8)", async () => {
    const key = idemKey();
    const a = (await (await submitQuote(validQuote(), key)).json()) as { protocol: string };
    const b = (await (await submitQuote(validQuote(), key)).json()) as { protocol: string };
    expect(b.protocol).toBe(a.protocol);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM quotes WHERE protocol = ?").bind(a.protocol).first<{ n: number }>();
    expect(n!.n).toBe(1);
  });

  it("produto inativo é recusado com a lista do que saiu (R-COT-1)", async () => {
    const res = await submitQuote(validQuote({ items: [{ ref: "0099", quantity: 1 }] }));
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: { code: string; fields: Record<string, string> } };
    expect(body.error.code).toBe("unavailable_items");
    expect(body.error.fields.items).toBe("0099");
  });

  it("recusa captcha inválido, honeypot e campos inválidos", async () => {
    expect((await submitQuote(validQuote({ turnstileToken: "invalido" }))).status).toBe(403);
    expect((await submitQuote(validQuote({ website: "http://spam" }))).status).toBe(422);
    const bad = await submitQuote(validQuote({ customer: { ...validQuote().customer, cnpj: "123" } }));
    expect(bad.status).toBe(422);
    expect(((await bad.json()) as { error: { fields: Record<string, string> } }).error.fields["customer.cnpj"]).toBe("CNPJ inválido");
  });

  it("limita 5 envios por hora por IP (R-COT-9)", async () => {
    const ip = freshIp();
    const send = () => api("/api/quotes", { method: "POST", json: validQuote(), headers: { "idempotency-key": idemKey() }, ip });
    for (let i = 0; i < 5; i++) expect((await send()).status).toBe(201);
    expect((await send()).status).toBe(429);
  });

  it("bloqueia POST de outra origem (CSRF)", async () => {
    const res = await api("/api/quotes", {
      method: "POST",
      json: validQuote(),
      headers: { "idempotency-key": idemKey(), origin: "https://site-malicioso.com" },
    });
    expect(res.status).toBe(403);
  });
});

describe("painel: autenticação e papéis", () => {
  it("pedido de link responde igual para e-mail existente ou não", async () => {
    await createUser("admin", "dono@wsn.com.br");
    const a = await api("/api/auth/request-link", { method: "POST", json: { email: "dono@wsn.com.br" } });
    const b = await api("/api/auth/request-link", { method: "POST", json: { email: "ninguem@wsn.com.br" } });
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(await a.text()).toBe(await b.text());
  });

  it("link é de uso único e gera cookie seguro", async () => {
    const user = await createUser("vendedor");
    const { createLoginToken } = await import("../worker/modules/auth");
    const token = await createLoginToken(env.DB, user.id);
    const first = await api("/api/auth/verify", { method: "POST", json: { token } });
    expect(first.status).toBe(200);
    const cookie = first.headers.get("set-cookie")!;
    expect(cookie).toMatch(/^__Host-wsn_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect((await api("/api/auth/verify", { method: "POST", json: { token } })).status).toBe(410);
  });

  it("rotas do painel exigem sessão; vendedor não gerencia equipe", async () => {
    expect((await api("/api/admin/quotes")).status).toBe(401);
    const seller = await loginAs("vendedor");
    expect((await api("/api/admin/quotes", { cookie: seller.cookie })).status).toBe(200);
    expect((await api("/api/admin/team/users", { cookie: seller.cookie })).status).toBe(403);
    const admin = await loginAs("admin");
    expect((await api("/api/admin/team/users", { cookie: admin.cookie })).status).toBe(200);
  });
});

describe("proposta comercial", () => {
  async function quoteWithProposal(validDays = 7) {
    const { protocol } = (await (await submitQuote()).json()) as { protocol: string };
    const quoteId = await quoteIdOf(protocol);
    const seller = await loginAs("vendedor");
    const detail = (await (await api(`/api/admin/quotes/${quoteId}`, { cookie: seller.cookie })).json()) as {
      items: { id: number; quantity: number; internalPriceCents: number | null }[];
      customer: { email: string };
    };
    expect(detail.customer.email).toBe("maria@restaurante.com.br"); // decifrado só no painel
    const res = await api(`/api/admin/quotes/${quoteId}/proposals`, {
      method: "POST",
      cookie: seller.cookie,
      json: {
        items: detail.items.map((i) => ({ quoteItemId: i.id, quantity: i.quantity, unitPriceCents: i.internalPriceCents ?? 0 })),
        validDays,
        shippingCents: 1500,
        discountCents: 0,
        paymentTerms: "Pix ou boleto 28 dias",
        notifyCustomer: true,
      },
    });
    expect(res.status).toBe(201);
    const { link } = (await res.json()) as { link: string };
    return { quoteId, protocol, seller, token: link.split("/").pop()!, link };
  }

  it("vendedor precifica, cliente vê e aprova; cotação vira ganha", async () => {
    const { quoteId, token } = await quoteWithProposal();
    expect((await env.DB.prepare("SELECT status FROM quotes WHERE id = ?").bind(quoteId).first<{ status: string }>())!.status).toBe("respondida");

    const view = (await (await api(`/api/proposals/${token}`)).json()) as PublicProposal;
    expect(view.totals.totalCents).toBe(10 * 280 + 2 * 2400 + 1500);
    expect(view.customerName).toBe("Maria"); // só o primeiro nome no link público
    expect(JSON.stringify(view)).not.toContain("restaurante.com.br");

    const approve = await api(`/api/proposals/${token}/approve`, { method: "POST", json: { name: "Maria Souza", accept: true } });
    expect(approve.status).toBe(200);
    expect(((await approve.json()) as PublicProposal).status).toBe("aprovada");
    expect((await env.DB.prepare("SELECT status FROM quotes WHERE id = ?").bind(quoteId).first<{ status: string }>())!.status).toBe("ganha");

    // Aprovar de novo é idempotente.
    expect((await api(`/api/proposals/${token}/approve`, { method: "POST", json: { name: "Maria Souza", accept: true } })).status).toBe(200);
  });

  it("nova versão substitui a anterior, que não pode mais ser aprovada", async () => {
    const first = await quoteWithProposal();
    const detail = (await (await api(`/api/admin/quotes/${first.quoteId}`, { cookie: first.seller.cookie })).json()) as {
      items: { id: number; quantity: number }[];
    };
    const v2 = await api(`/api/admin/quotes/${first.quoteId}/proposals`, {
      method: "POST",
      cookie: first.seller.cookie,
      json: { items: detail.items.map((i) => ({ quoteItemId: i.id, quantity: i.quantity, unitPriceCents: 100 })), validDays: 5, shippingCents: 0, discountCents: 0, notifyCustomer: false },
    });
    expect(v2.status).toBe(201);
    expect(((await v2.json()) as { version: number }).version).toBe(2);
    const old = await api(`/api/proposals/${first.token}/approve`, { method: "POST", json: { name: "Maria", accept: true } });
    expect(old.status).toBe(409);
  });

  it("proposta vencida expira pelo job e não aceita aprovação", async () => {
    const { quoteId, token } = await quoteWithProposal(1);
    const future = new Date(Date.now() + 3 * 86400_000);
    expect(await expireProposals(env.DB, future)).toBeGreaterThan(0);
    expect((await env.DB.prepare("SELECT status FROM quotes WHERE id = ?").bind(quoteId).first<{ status: string }>())!.status).toBe("expirada");
    const res = await api(`/api/proposals/${token}/approve`, { method: "POST", json: { name: "Maria", accept: true } });
    expect(res.status).toBe(410);
  });

  it("token inexistente ou malformado → 404", async () => {
    expect((await api("/api/proposals/abc")).status).toBe(404);
    expect((await api(`/api/proposals/${"a".repeat(43)}`)).status).toBe(404);
  });
});

describe("LGPD e auditoria", () => {
  it("anonimização por pedido do titular apaga os dados pessoais", async () => {
    const { protocol } = (await (await submitQuote()).json()) as { protocol: string };
    const admin = await loginAs("admin");
    const res = await api("/api/admin/team/privacy/anonymize", { method: "POST", cookie: admin.cookie, json: { email: "maria@restaurante.com.br" } });
    expect(res.status).toBe(200);
    const row = await env.DB.prepare("SELECT name_enc, email_enc, email_hash, anonymized_at FROM quotes WHERE protocol = ?").bind(protocol).first();
    expect(row).toMatchObject({ name_enc: null, email_enc: null, email_hash: null });
    expect(row!.anonymized_at).toBeTruthy();
  });

  it("log de auditoria é somente-inclusão", async () => {
    await env.DB.prepare("INSERT INTO audit_log (action, entity) VALUES ('teste', 'x')").run();
    await expect(env.DB.prepare("UPDATE audit_log SET action = 'adulterado'").run()).rejects.toThrow(/append-only/);
    await expect(env.DB.prepare("DELETE FROM audit_log").run()).rejects.toThrow(/append-only/);
  });

  it("job agendado roda sem erro", async () => {
    const ctrl = createScheduledController({ scheduledTime: new Date(), cron: "0 9 * * *" });
    const ctx = createExecutionContext();
    worker.scheduled(ctrl, env as never, ctx);
    await waitOnExecutionContext(ctx);
    const log = await env.DB.prepare("SELECT action FROM audit_log WHERE action = 'jobs.daily'").first();
    expect(log).toBeTruthy();
  });
});

describe("SEO", () => {
  it("URL de produto com slug antigo redireciona 301 para a canônica (R-CAT-1)", async () => {
    const res = await exports.default.fetch(new Request("http://example.com/produtos/0038-nome-antigo"), { redirect: "manual" });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("http://example.com/produtos/0038-luva-latex-com-po-descarpack");
  });
});

