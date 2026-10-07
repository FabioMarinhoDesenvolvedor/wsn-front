// Login sem senha (link mágico por e-mail). Motivo: o plano gratuito do Workers tem
// 10 ms de CPU por requisição — hash de senha decente (Argon2/PBKDF2) não cabe.
// Sem senha também não há senha fraca, reutilizada ou vazada para proteger.
import { Hono, type MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { loginLink } from "../emails";
import type { AppEnv, SessionUser, UserRole } from "../env";
import { auditStatement } from "../platform/audit";
import { randomToken, sha256 } from "../platform/crypto";
import { HttpError, readJson } from "../platform/http";
import { outboxInsert } from "../platform/mail";
import { hitRateLimit, RATE } from "../platform/rate-limit";
import { deps } from "./deps";

export const SESSION_COOKIE = "__Host-wsn_session";
const LINK_TTL_MS = 15 * 60_000;
const SESSION_ABSOLUTE_MS = 7 * 24 * 3600_000;
const SESSION_IDLE_MS = 8 * 3600_000;
const TOUCH_EVERY_MS = 5 * 60_000;

export async function createLoginToken(db: D1Database, userId: string, now = Date.now()): Promise<string> {
  const token = randomToken();
  await db
    .prepare("INSERT INTO login_tokens (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(await sha256(token), userId, new Date(now + LINK_TTL_MS).toISOString())
    .run();
  return token;
}

const sessionCookieOptions = {
  path: "/",
  httpOnly: true,
  secure: true,
  sameSite: "Strict" as const,
  prefix: "host" as const,
};

export const authRoutes = new Hono<AppEnv>()
  .post("/request-link", async (c) => {
    const { email } = await readJson(c, z.object({ email: z.string().trim().toLowerCase().max(160).pipe(z.email("E-mail inválido")) }));
    const { hasher, cipher, flushOutbox } = deps(c.env);
    await hitRateLimit(c.env.DB, RATE.loginRequestIp(c.get("ipHash")));
    await hitRateLimit(c.env.DB, RATE.loginRequestEmail(await hasher.hash("login", email)));

    const user = await c.env.DB.prepare("SELECT id, name FROM users WHERE email = ? AND active = 1")
      .bind(email)
      .first<{ id: string; name: string }>();

    if (user) {
      const token = await createLoginToken(c.env.DB, user.id);
      const message = loginLink({ to: email, name: user.name, link: `${c.env.APP_URL}/admin/entrar/${token}` });
      await (await outboxInsert(c.env.DB, cipher)("auth.link", message)).run();
      c.executionCtx.waitUntil(flushOutbox());
    }
    // Mesma resposta exista ou não o usuário: não revela quem tem acesso.
    return c.json({ ok: true }, 202);
  })
  .post("/verify", async (c) => {
    const { token } = await readJson(c, z.object({ token: z.string().min(20).max(100) }));
    const now = new Date();
    const tokenHash = await sha256(token);

    // Marca como usado de forma atômica: dois cliques simultâneos não geram duas sessões.
    const claimed = await c.env.DB.prepare(
      `UPDATE login_tokens SET used_at = ?1
       WHERE token_hash = ?2 AND used_at IS NULL AND expires_at > ?1
       RETURNING user_id`,
    )
      .bind(now.toISOString(), tokenHash)
      .first<{ user_id: string }>();
    if (!claimed) throw new HttpError(410, "link_expired", "Este link expirou ou já foi usado. Peça um novo.");

    const user = await c.env.DB.prepare("SELECT id, email, name, role FROM users WHERE id = ? AND active = 1")
      .bind(claimed.user_id)
      .first<SessionUser>();
    if (!user) throw new HttpError(403, "inactive", "Acesso desativado");

    const sessionId = randomToken();
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO sessions (id_hash, user_id, expires_at, ip_hash, user_agent) VALUES (?, ?, ?, ?, ?)",
      ).bind(
        await sha256(sessionId),
        user.id,
        new Date(now.getTime() + SESSION_ABSOLUTE_MS).toISOString(),
        c.get("ipHash"),
        (c.req.header("user-agent") ?? "").slice(0, 200),
      ),
      c.env.DB.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(now.toISOString(), user.id),
      c.env.DB.prepare("DELETE FROM login_tokens WHERE expires_at < ?").bind(now.toISOString()),
      auditStatement(c.env.DB, { actorId: user.id, action: "auth.login", entity: "user", entityId: user.id, ipHash: c.get("ipHash") }),
    ]);

    setCookie(c, SESSION_COOKIE.replace("__Host-", ""), sessionId, {
      ...sessionCookieOptions,
      maxAge: SESSION_ABSOLUTE_MS / 1000,
    });
    return c.json({ user });
  })
  .post("/logout", async (c) => {
    const id = getCookie(c, SESSION_COOKIE);
    if (id) await c.env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(await sha256(id)).run();
    deleteCookie(c, SESSION_COOKIE.replace("__Host-", ""), sessionCookieOptions);
    return c.body(null, 204);
  })
  .get("/me", async (c) => {
    const user = await currentUser(c.env.DB, getCookie(c, SESSION_COOKIE));
    if (!user) throw new HttpError(401, "unauthenticated", "Entre para continuar");
    return c.json({ user });
  });

async function currentUser(db: D1Database, sessionId: string | undefined): Promise<SessionUser | null> {
  if (!sessionId || sessionId.length > 100) return null;
  const idHash = await sha256(sessionId);
  const row = await db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, s.expires_at, s.last_seen_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id_hash = ? AND u.active = 1`,
    )
    .bind(idHash)
    .first<SessionUser & { expires_at: string; last_seen_at: string }>();
  if (!row) return null;

  const now = Date.now();
  const lastSeen = Date.parse(row.last_seen_at);
  if (Date.parse(row.expires_at) < now || lastSeen + SESSION_IDLE_MS < now) {
    await db.prepare("DELETE FROM sessions WHERE id_hash = ?").bind(idHash).run();
    return null;
  }
  if (now - lastSeen > TOUCH_EVERY_MS) {
    await db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?").bind(new Date(now).toISOString(), idHash).run();
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

/** Exige sessão válida; com `roles`, exige também o papel (ex.: só admin gerencia usuários). */
export const requireUser =
  (...roles: UserRole[]): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const user = await currentUser(c.env.DB, getCookie(c, SESSION_COOKIE));
    if (!user) throw new HttpError(401, "unauthenticated", "Entre para continuar");
    if (roles.length && !roles.includes(user.role)) throw new HttpError(403, "forbidden", "Sem permissão para esta ação");
    c.set("user", user);
    await next();
  };
