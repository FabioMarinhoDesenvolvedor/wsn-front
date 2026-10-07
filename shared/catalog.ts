import { z } from "zod";

export const UNITS = ["unidade", "caixa", "pacote", "par", "fardo", "galao"] as const;
export type Unit = (typeof UNITS)[number];

export const UNIT_LABEL: Record<Unit, { one: string; many: string }> = {
  unidade: { one: "unidade", many: "unidades" },
  caixa: { one: "caixa", many: "caixas" },
  pacote: { one: "pacote", many: "pacotes" },
  par: { one: "par", many: "pares" },
  fardo: { one: "fardo", many: "fardos" },
  galao: { one: "galão", many: "galões" },
};

export const unitLabel = (unit: Unit, quantity = 1): string =>
  quantity === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many;

export const refSchema = z.string().regex(/^\d{4}$/, "Referência tem 4 dígitos");

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** URL pública do produto: /produtos/0003-detergente-neutro-500-ml (R-CAT-1). */
export const productPath = (p: { ref: string; slug: string }): string => `/produtos/${p.ref}-${p.slug}`;

/** Extrai a ref de um segmento "0003-detergente…"; slug divergente vira redirect. */
export function parseProductSegment(segment: string): { ref: string; slug: string } | null {
  const match = /^(\d{4})(?:-(.*))?$/.exec(segment);
  return match ? { ref: match[1], slug: match[2] ?? "" } : null;
}

/** Normaliza texto de busca: sem acento, minúsculo, espaços simples. */
export const normalizeSearch = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// ---- Contratos públicos da API (sem preço — R-CAT-4) ----

export interface PublicCategory {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  position: number;
}

export interface PublicBrand {
  id: number;
  slug: string;
  name: string;
  logoPath: string | null;
}

export interface PublicProduct {
  id: number;
  ref: string;
  slug: string;
  name: string;
  unit: Unit;
  categoryId: number;
  brandId: number | null;
  description: string | null;
  imagePath: string | null;
}

export interface PublicCatalog {
  categories: PublicCategory[];
  brands: PublicBrand[];
  products: PublicProduct[];
}
