import { Hono } from "hono";
import { z } from "zod";
import { slugify, UNITS } from "../../shared/catalog";
import { refSchema } from "../../shared/quote";
import type { AppEnv } from "../env";
import { auditStatement } from "../platform/audit";
import { HttpError, notFound, readJson } from "../platform/http";
import { requireUser } from "./auth";

const productInput = z.object({
  ref: refSchema,
  name: z.string().trim().min(2).max(160),
  unit: z.enum(UNITS),
  categoryId: z.number().int().positive(),
  brandId: z.number().int().positive().nullable(),
  description: z.string().trim().max(2000).nullable(),
  priceCents: z.number().int().min(0).max(100_000_000).nullable(),
  active: z.boolean(),
});

const MAX_IMAGE_BYTES = 1024 * 1024;

/** WebP começa com "RIFF....WEBP" — conferimos os bytes, não o nome nem o Content-Type. */
const isWebp = (b: Uint8Array) =>
  b.length > 12 &&
  String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
  String.fromCharCode(...b.slice(8, 12)) === "WEBP";

export const adminCatalogRoutes = new Hono<AppEnv>()
  .get("/products", async (c) => {
    const [products, categories, brands] = await c.env.DB.batch([
      c.env.DB.prepare(
        `SELECT p.id, p.ref, p.slug, p.name, p.unit, p.category_id AS categoryId, p.brand_id AS brandId, p.description,
           p.price_cents AS priceCents, p.image_path AS imagePath, p.active, p.updated_at AS updatedAt,
           (SELECT COUNT(*) FROM quote_items i WHERE i.ref = p.ref) AS timesQuoted
         FROM products p ORDER BY p.ref`,
      ),
      c.env.DB.prepare("SELECT id, slug, name FROM categories ORDER BY position"),
      c.env.DB.prepare("SELECT id, slug, name FROM brands ORDER BY name"),
    ]);
    return c.json({
      products: (products.results as Record<string, unknown>[]).map((p) => ({ ...p, active: p.active === 1 })),
      categories: categories.results,
      brands: brands.results,
    });
  })
  .post("/products", requireUser("admin"), async (c) => {
    const input = await readJson(c, productInput);
    const slug = slugify(input.name);
    const exists = await c.env.DB.prepare("SELECT 1 FROM products WHERE ref = ? OR slug = ?").bind(input.ref, slug).first();
    if (exists) throw new HttpError(409, "duplicate", "Já existe produto com esta referência ou nome");
    const row = await c.env.DB.prepare(
      `INSERT INTO products (ref, slug, name, unit, category_id, brand_id, description, price_cents, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
      .bind(input.ref, slug, input.name, input.unit, input.categoryId, input.brandId, input.description, input.priceCents, input.active ? 1 : 0)
      .first<{ id: number }>();
    await auditStatement(c.env.DB, { actorId: c.get("user").id, action: "product.create", entity: "product", entityId: row!.id, detail: { ref: input.ref } }).run();
    return c.json({ id: row!.id }, 201);
  })
  .patch("/products/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const input = await readJson(c, productInput.omit({ ref: true }));
    const current = await c.env.DB.prepare("SELECT slug, name, price_cents, active FROM products WHERE id = ?")
      .bind(id)
      .first<{ slug: string; name: string; price_cents: number | null; active: number }>();
    if (!current) throw notFound("Produto");

    const user = c.get("user");
    // Vendedor edita conteúdo; preço interno e ativação são decisões do admin.
    if (user.role !== "admin" && (input.priceCents !== current.price_cents || (input.active ? 1 : 0) !== current.active)) {
      throw new HttpError(403, "forbidden", "Só administradores alteram preço interno e disponibilidade");
    }

    const slug = slugify(input.name);
    const statements = [
      c.env.DB.prepare(
        `UPDATE products SET slug = ?, name = ?, unit = ?, category_id = ?, brand_id = ?, description = ?, price_cents = ?, active = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`,
      ).bind(slug, input.name, input.unit, input.categoryId, input.brandId, input.description, input.priceCents, input.active ? 1 : 0, id),
      auditStatement(c.env.DB, {
        actorId: user.id,
        action: "product.update",
        entity: "product",
        entityId: id,
        detail: { nameChanged: input.name !== current.name, priceChanged: input.priceCents !== current.price_cents, active: input.active },
        ipHash: c.get("ipHash"),
      }),
    ];
    // R-CAT-1: nome novo → slug novo; o antigo segue redirecionando (301).
    if (slug !== current.slug) {
      statements.unshift(c.env.DB.prepare("INSERT OR REPLACE INTO product_slugs (old_slug, product_id) VALUES (?, ?)").bind(current.slug, id));
    }
    await c.env.DB.batch(statements);
    return c.json({ ok: true, slug });
  })
  .put("/products/:id/image", async (c) => {
    const id = Number(c.req.param("id"));
    const length = Number(c.req.header("content-length") ?? 0);
    if (!length || length > MAX_IMAGE_BYTES) throw new HttpError(413, "too_large", "Imagem até 1 MB (o painel já reduz antes de enviar)");
    const bytes = new Uint8Array(await c.req.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, "too_large", "Imagem até 1 MB");
    if (!isWebp(bytes)) throw new HttpError(415, "bad_image", "Formato inválido");

    const product = await c.env.DB.prepare("SELECT ref FROM products WHERE id = ?").bind(id).first<{ ref: string }>();
    if (!product) throw notFound("Produto");

    const key = `products/${product.ref}-${crypto.randomUUID().slice(0, 8)}.webp`;
    await c.env.MEDIA.put(key, bytes, { httpMetadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000, immutable" } });
    const imagePath = `/media/${key}`;
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE products SET image_path = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").bind(imagePath, id),
      auditStatement(c.env.DB, { actorId: c.get("user").id, action: "product.image", entity: "product", entityId: id, ipHash: c.get("ipHash") }),
    ]);
    return c.json({ imagePath });
  });

/** Serve imagens enviadas pelo painel (R2). Chaves são geradas pelo servidor. */
export const mediaRoute = new Hono<AppEnv>().get("/media/*", async (c) => {
  const key = c.req.path.replace(/^\/media\//, "");
  if (!/^products\/[\w-]+\.webp$/.test(key)) return c.notFound();
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.notFound();
  return new Response(object.body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      ETag: object.httpEtag,
    },
  });
});
