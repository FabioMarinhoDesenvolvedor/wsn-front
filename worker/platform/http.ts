import type { Context, MiddlewareHandler } from "hono";
import type { z } from "zod";
import type { AppEnv } from "../env";

export class HttpError extends Error {
  constructor(
    readonly status: 400 | 401 | 403 | 404 | 409 | 410 | 413 | 415 | 422 | 429 | 500 | 503,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Recurso") => new HttpError(404, "not_found", `${what} não encontrado`);

const MAX_BODY_BYTES = 32 * 1024;

/** Lê JSON com limite de tamanho e valida com o schema compartilhado. */
export async function readJson<S extends z.ZodType>(c: Context<AppEnv>, schema: S): Promise<z.output<S>> {
  if (!c.req.header("content-type")?.includes("application/json"))
    throw new HttpError(415, "unsupported_media_type", "Envie JSON");
  const length = Number(c.req.header("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "Requisição grande demais");
  const text = await c.req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "Requisição grande demais");

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "JSON inválido");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".") || "_";
      fields[key] ??= issue.message;
    }
    throw new HttpError(422, "validation", "Confira os campos destacados", fields);
  }
  return parsed.data;
}

/**
 * Proteção CSRF para mutações: o navegador sempre envia Origin em POST/PATCH/DELETE
 * cross-site; exigimos que seja a própria origem. Somado ao cookie SameSite=Strict.
 */
export const sameOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(c.req.method)) {
    const origin = c.req.header("origin");
    const expected = new URL(c.req.url).origin;
    const allowed = [expected, c.env.APP_URL];
    if (!origin || !allowed.includes(origin)) throw new HttpError(403, "bad_origin", "Origem não permitida");
  }
  await next();
};

/** Cabeçalhos de segurança e sem cache em toda resposta da API. */
export const apiHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  if (!c.res.headers.has("Cache-Control")) c.header("Cache-Control", "no-store");
};

export const clientIp = (c: Context<AppEnv>): string =>
  c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";

export const nowIso = (): string => new Date().toISOString();
