import { useQuery } from "@tanstack/react-query";
import { Box, CupSoda, HardHat, Package, ScrollText, Shirt, SprayCan, type LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { normalizeSearch, type PublicCatalog, type PublicProduct } from "@shared/catalog";
import { api } from "@/lib/api";

export const useCatalog = () =>
  useQuery({
    queryKey: ["catalog"],
    queryFn: () => api<PublicCatalog>("/catalog"),
    staleTime: 5 * 60_000,
  });

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  limpeza: SprayCan,
  descartaveis: CupSoda,
  epis: HardHat,
  embalagens: Package,
  papeis: ScrollText,
  uniformes: Shirt,
};
export const categoryIcon = (slug: string): LucideIcon => CATEGORY_ICONS[slug] ?? Box;

/** "01", "02"… — numeração editorial das categorias. */
export const indexLabel = (i: number) => String(i + 1).padStart(2, "0");

/** Índices auxiliares derivados do catálogo (memoizados por consumidor). */
export function useCatalogIndex(catalog: PublicCatalog | undefined) {
  return useMemo(() => {
    const categories = (catalog?.categories ?? []).filter((c) => catalog?.products.some((p) => p.categoryId === c.id));
    const categoryById = new Map(categories.map((c) => [c.id, c]));
    const brandById = new Map((catalog?.brands ?? []).map((b) => [b.id, b]));
    const productByRef = new Map((catalog?.products ?? []).map((p) => [p.ref, p]));
    const countByCategory = new Map<number, number>();
    for (const p of catalog?.products ?? []) countByCategory.set(p.categoryId, (countByCategory.get(p.categoryId) ?? 0) + 1);
    return { categories, categoryById, brandById, productByRef, countByCategory };
  }, [catalog]);
}

export interface SearchableProduct extends PublicProduct {
  haystack: string;
}

export const toSearchable = (products: PublicProduct[], brandName: (id: number | null) => string): SearchableProduct[] =>
  products.map((p) => ({ ...p, haystack: normalizeSearch(`${p.ref} ${p.name} ${brandName(p.brandId)}`) }));

/**
 * Busca por nome, marca ou referência: todos os termos precisam aparecer.
 * Ordem: referência exata → começa com o termo → demais (alfabética).
 */
export function searchProducts<T extends SearchableProduct>(products: T[], query: string): T[] {
  const q = normalizeSearch(query);
  if (!q) return products;
  const terms = q.split(" ");
  const isRef = /^\d{1,4}$/.test(q); // "38" encontra a Ref 0038
  const matches = products.filter((p) => (isRef && p.ref.includes(q)) || terms.every((t) => p.haystack.includes(t)));
  const score = (p: T) => (isRef && p.ref === q.padStart(4, "0") ? 0 : normalizeSearch(p.name).startsWith(q) ? 1 : 2);
  return matches.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, "pt-BR"));
}
