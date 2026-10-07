import { Hono } from "hono";
import type { AppEnv, Env } from "./env";
import { createHasher, hashIp } from "./platform/crypto";
import { apiHeaders, clientIp, HttpError, sameOrigin } from "./platform/http";
import { adminCatalogRoutes, mediaRoute } from "./modules/admin-catalog";
import { contactAdminRoutes, exportRoutes, insightsRoutes, usersRoutes } from "./modules/admin-misc";
import { adminQuoteRoutes } from "./modules/admin-quotes";
import { authRoutes, requireUser } from "./modules/auth";
import { catalogRoutes } from "./modules/catalog";
import { contactRoutes } from "./modules/contact";
import { runScheduled } from "./modules/jobs";
import { proposalPublicRoutes } from "./modules/proposals";
import { quoteRoutes } from "./modules/quotes";
import { handlePage } from "./seo";

const admin = new Hono<AppEnv>()
  .use(requireUser())
  .route("/", adminQuoteRoutes)
  .route("/", adminCatalogRoutes)
  .route("/", insightsRoutes)
  .route("/", contactAdminRoutes)
  // Sub-apps com middleware de papel ficam sob prefixo próprio: `use()` sem caminho
  // num sub-app montado em "/" valeria para todo /api/admin.
  .route("/team", usersRoutes)
  .route("/export", exportRoutes);

export const app = new Hono<AppEnv>()
  .use("/api/*", apiHeaders)
  .use("/api/*", sameOrigin)
  .use("/api/*", async (c, next) => {
    c.set("ipHash", await hashIp(createHasher(c.env), clientIp(c)));
    await next();
  })
  .get("/api/config", (c) => c.json({ turnstileSiteKey: c.env.TURNSTILE_SITE_KEY }))
  .route("/api", catalogRoutes)
  .route("/api", quoteRoutes)
  .route("/api", contactRoutes)
  .route("/api", proposalPublicRoutes)
  .route("/api/auth", authRoutes)
  .route("/api/admin", admin)
  .route("/", mediaRoute)
  .all("/api/*", () => {
    throw new HttpError(404, "not_found", "Rota inexistente");
  });

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json({ error: { code: err.code, message: err.message, fields: err.fields } }, err.status);
  }
  // Log sem dado pessoal: só a mensagem técnica e a rota.
  console.error(`[api] ${c.req.method} ${c.req.path}:`, err instanceof Error ? err.message : err);
  return c.json({ error: { code: "internal", message: "Erro inesperado. Tente novamente em instantes." } }, 500);
});

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/") || pathname.startsWith("/media/")) return app.fetch(request, env, ctx);
    return handlePage(request, env);
  },
  scheduled(controller, env, ctx) {
    ctx.waitUntil(runScheduled(controller.cron, env));
  },
} satisfies ExportedHandler<Env>;
