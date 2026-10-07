import { Hono } from "hono";
import { z } from "zod";
import { normalizeSearch, type PublicBrand, type PublicCatalog, type PublicCategory, type PublicProduct, type Unit } from "../../shared/catalog";
import type { AppEnv } from "../env";
import { hitRateLimit, RATE } from "../platform/rate-limit";
import { readJson } from "../platform/http";

// ---- Repositório (somente leitura pública: preço nunca é selecionado aqui — R-CAT-4) ----

interface ProductRow {
  id: number;
  ref: string;
  slug: string;
  name: string;
  unit: Unit;
  category_id: number;
  brand_id: number | null;
  description: string | null;
  image_path: string | null;
}

const PUBLIC_PRODUCT_COLUMNS = "id, ref, slug, name, unit, category_id, brand_id, description, image_path";

export const toPublicProduct = (r: ProductRow): PublicProduct => ({
  id: r.id,
  ref: r.ref,
  slug: r.slug,
  name: r.name,
  unit: r.unit,
  categoryId: r.category_id,
  brandId: r.brand_id,
  description: r.description,
  imagePath: r.image_path,
});

export async function loadPublicCatalog(db: D1Database): Promise<PublicCatalog> {
  const [categories, brands, products] = await db.batch<Record<string, unknown>>([
    db.prepare("SELECT id, slug, name, description, position FROM categories WHERE active = 1 ORDER BY position"),
    db.prepare("SELECT id, slug, name, logo_path FROM brands ORDER BY name"),
    db.prepare(`SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE active = 1 ORDER BY name`),
  ]);
  return {
    categories: categories.results as unknown as PublicCategory[],
    brands: (brands.results as { id: number; slug: string; name: string; logo_path: string | null }[]).map(
      (b): PublicBrand => ({ id: b.id, slug: b.slug, name: b.name, logoPath: b.logo_path }),
    ),
    products: (products.results as unknown as ProductRow[]).map(toPublicProduct),
  };
}

export async function findProductByRef(db: D1Database, ref: string) {
  const row = await db
    .prepare(
      `SELECT p.${PUBLIC_PRODUCT_COLUMNS.split(", ").join(", p.")}, p.active, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name
       FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id
       WHERE p.ref = ?`,
    )
    .bind(ref)
    .first<ProductRow & { active: number; category_name: string; category_slug: string; brand_name: string | null }>();
  return row
    ? {
        ...toPublicProduct(row),
        active: row.active === 1,
        categoryName: row.category_name,
        categorySlug: row.category_slug,
        brandName: row.brand_name,
      }
    : null;
}

/** Produtos ativos por ref, para validar uma cotação (R-COT-1: inativos não seguem). */
export async function activeProductsByRefs(db: D1Database, refs: string[]): Promise<Map<string, ProductRow>> {
  if (refs.length === 0) return new Map();
  const placeholders = refs.map(() => "?").join(",");
  const { results } = await db
    .prepare(`SELECT ${PUBLIC_PRODUCT_COLUMNS} FROM products WHERE active = 1 AND ref IN (${placeholders})`)
    .bind(...refs)
    .all<ProductRow>();
  return new Map(results.map((r) => [r.ref, r]));
}

// ---- Rotas públicas ----

export const catalogRoutes = new Hono<AppEnv>()
  .get("/catalog", async (c) => {
    const catalog = await loadPublicCatalog(c.env.DB);
    c.header("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
    return c.json(catalog);
  })
  // Termo buscado sem resultado vira sinal de demanda no painel (sem dado pessoal).
  .post("/search-misses", async (c) => {
    const { term } = await readJson(c, z.object({ term: z.string().min(3).max(60) }));
    await hitRateLimit(c.env.DB, RATE.searchMiss(c.get("ipHash")));
    const normalized = normalizeSearch(term).replace(/[^a-z0-9 %,.-]/g, "").slice(0, 60);
    if (normalized.length >= 3 && !/\d{8,}|@/.test(normalized)) {
      await c.env.DB.prepare(
        `INSERT INTO search_misses (term) VALUES (?)
         ON CONFLICT (term) DO UPDATE SET count = count + 1, last_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      )
        .bind(normalized)
        .run();
    }
    return c.body(null, 204);
  });
