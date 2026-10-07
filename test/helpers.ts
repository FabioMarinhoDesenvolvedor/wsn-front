import { env } from "cloudflare:test";
import { exports } from "cloudflare:workers";
import { createLoginToken } from "../worker/modules/auth";

export const ORIGIN = "http://example.com";
export const TURNSTILE_OK = "XXXX.DUMMY.TOKEN.XXXX";

export async function seedCatalog(): Promise<void> {
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO categories (id, slug, name, position) VALUES (1, 'limpeza', 'Limpeza e Higiene', 1), (2, 'epis', 'EPIs', 2)"),
    env.DB.prepare("INSERT OR IGNORE INTO brands (id, slug, name) VALUES (1, 'descarpack', 'Descarpack')"),
    env.DB.prepare(
      `INSERT OR IGNORE INTO products (id, ref, slug, name, unit, category_id, brand_id, price_cents, image_path, active) VALUES
       (1, '0003', 'detergente-neutro-500-ml', 'Detergente neutro – 500 ml', 'unidade', 1, NULL, 280, '/images/products/0003.webp', 1),
       (2, '0038', 'luva-latex-com-po-descarpack', 'Luva látex com pó Descarpack', 'caixa', 2, 1, 2400, NULL, 1),
       (3, '0099', 'produto-inativo', 'Produto inativo', 'unidade', 1, NULL, 100, NULL, 0)`,
    ),
  ]);
}

let ipCounter = 0;
/** IP distinto por chamada evita que o limite de taxa de um teste vaze para outro. */
export const freshIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

export function api(path: string, init: RequestInit & { json?: unknown; ip?: string; cookie?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  if (!headers.has("origin") && init.method && init.method !== "GET") headers.set("origin", ORIGIN);
  headers.set("cf-connecting-ip", init.ip ?? freshIp());
  if (init.cookie) headers.set("cookie", init.cookie);
  return exports.default.fetch(
    new Request(`${ORIGIN}${path}`, {
      ...init,
      headers,
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    }),
  );
}

export const validQuote = (overrides: Record<string, unknown> = {}) => ({
  items: [
    { ref: "0003", quantity: 10 },
    { ref: "0038", quantity: 2 },
  ],
  customer: {
    name: "Maria Souza",
    email: "Maria@Restaurante.com.br",
    phone: "(11) 98765-4321",
    company: "Restaurante Bom Prato",
    cnpj: "11.222.333/0001-81",
    cep: "02522-000",
    message: "Entrega pela manhã",
  },
  consent: true,
  turnstileToken: TURNSTILE_OK,
  ...overrides,
});

export const idemKey = () => crypto.randomUUID().replace(/-/g, "");

export async function submitQuote(body = validQuote(), key = idemKey()) {
  return api("/api/quotes", { method: "POST", json: body, headers: { "idempotency-key": key } });
}

export async function createUser(role: "admin" | "vendedor", email = `${role}-${crypto.randomUUID().slice(0, 6)}@wsn.com.br`) {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO users (id, email, name, role) VALUES (?, ?, ?, ?)").bind(id, email, `Pessoa ${role}`, role).run();
  return { id, email };
}

/** Faz o login completo (link mágico → verificação) e devolve o cookie de sessão. */
export async function loginAs(role: "admin" | "vendedor"): Promise<{ cookie: string; userId: string }> {
  const user = await createUser(role);
  const token = await createLoginToken(env.DB, user.id);
  const res = await api("/api/auth/verify", { method: "POST", json: { token } });
  if (res.status !== 200) throw new Error(`login falhou: ${res.status}`);
  const setCookie = res.headers.get("set-cookie") ?? "";
  return { cookie: setCookie.split(";")[0], userId: user.id };
}
