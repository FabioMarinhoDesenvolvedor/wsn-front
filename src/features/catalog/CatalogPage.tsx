import { LayoutGrid, List, MessageCircle, Search, SearchX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { UNIT_LABEL, type Unit } from "@shared/catalog";
import { whatsappLink } from "@shared/company";
import { catalog as copy } from "@/content/site";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useDebounced, useDocumentTitle } from "@/lib/hooks";
import { AnchorButton, Button } from "@/ui/Button";
import { EmptyState, Skeleton } from "@/ui/bits";
import { PageHeader } from "@/ui/PageHeader";
import { Select } from "@/ui/Field";
import { categoryIcon, searchProducts, toSearchable, useCatalog, useCatalogIndex } from "./data";
import { ProductCard } from "./ProductCard";

const PAGE = 24;
const reportedMisses = new Set<string>();

export function CatalogPage() {
  const { categoria } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useCatalog();
  const idx = useCatalogIndex(data);

  const [query, setQuery] = useState(params.get("q") ?? "");
  const debounced = useDebounced(query, 180);
  const brand = params.get("marca") ?? "";
  const unit = (params.get("unidade") ?? "") as Unit | "";
  const view = params.get("ver") === "lista" ? "list" : "grid";
  const [limit, setLimit] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  const activeCategory = idx.categories.find((c) => c.slug === categoria);
  useDocumentTitle(activeCategory ? activeCategory.name : copy.title);

  // Busca vinda de fora (cabeçalho, link) entra no campo; a que este campo escreveu na URL, não —
  // senão a URL atrasada sobrescreveria o que a pessoa ainda está digitando.
  const pushedQuery = useRef(params.get("q") ?? "");
  useEffect(() => {
    const q = params.get("q") ?? "";
    if (q !== pushedQuery.current) {
      pushedQuery.current = q;
      setQuery(q);
    }
  }, [params]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setLimit(PAGE);
  };

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (debounced.trim() !== current) {
      pushedQuery.current = debounced.trim();
      updateParam("q", debounced.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const searchable = useMemo(
    () => toSearchable(data?.products ?? [], (id) => (id ? (idx.brandById.get(id)?.name ?? "") : "")),
    [data, idx.brandById],
  );

  const results = useMemo(() => {
    let list = searchable;
    if (activeCategory) list = list.filter((p) => p.categoryId === activeCategory.id);
    if (brand) list = list.filter((p) => idx.brandById.get(p.brandId ?? -1)?.slug === brand);
    if (unit) list = list.filter((p) => p.unit === unit);
    const searched = searchProducts(list, debounced);
    return debounced ? searched : [...searched].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [searchable, activeCategory, brand, unit, debounced, idx.brandById]);

  // Termo sem resultado vira sinal de demanda no painel da WSN.
  useEffect(() => {
    const term = debounced.trim();
    if (!data || results.length || term.length < 3 || reportedMisses.has(term)) return;
    reportedMisses.add(term);
    void api("/search-misses", { method: "POST", json: { term } }).catch(() => undefined);
  }, [results.length, debounced, data]);

  const brandsInUse = useMemo(
    () => (data?.brands ?? []).filter((b) => data?.products.some((p) => p.brandId === b.id)),
    [data],
  );
  const unitsInUse = useMemo(() => [...new Set((data?.products ?? []).map((p) => p.unit))], [data]);
  const hasFilters = Boolean(debounced || brand || unit || activeCategory);

  return (
    <>
      <PageHeader
        eyebrow={
          activeCategory
            ? `Categoria · ${idx.countByCategory.get(activeCategory.id) ?? 0} produtos`
            : `${data?.products.length ?? ""} produtos · busque por nome, marca ou Ref.`
        }
        title={activeCategory?.name ?? copy.title}
        lead={activeCategory?.description ?? copy.lead}
        aside={
        <form
          role="search"
          className="relative w-full md:w-[420px]"
          onSubmit={(e) => {
            e.preventDefault();
            searchRef.current?.blur();
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={copy.searchPlaceholder}
            aria-label="Buscar no catálogo"
            className="h-14 w-full rounded-pill border border-line-strong bg-white pr-11 pl-12 shadow-sm text-[15px] text-strong placeholder:text-muted focus:border-action focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-pill text-muted hover:bg-sunken"
              aria-label="Limpar busca"
            >
              <X className="size-4" />
            </button>
          )}
        </form>
        }
      />
      <div className="container-page">

      {/* Categorias */}
      <nav aria-label={copy.categoriesLabel} className="-mx-[var(--gutter)] mt-8 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none]">
        <ul className="flex w-max gap-2">
          <li>
            <CategoryChip to={`/produtos${params.size ? `?${params}` : ""}`} active={!activeCategory} label={copy.allLabel} count={data?.products.length} />
          </li>
          {idx.categories.map((c) => {
            const Icon = categoryIcon(c.slug);
            return (
              <li key={c.id}>
                <CategoryChip
                  to={`/produtos/c/${c.slug}${params.size ? `?${params}` : ""}`}
                  active={activeCategory?.id === c.id}
                  label={c.name}
                  count={idx.countByCategory.get(c.id)}
                  icon={<Icon className="size-4" />}
                                  />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Filtros finos + visualização */}
      <div className="mt-4 flex flex-wrap items-center gap-3 pb-2">
        <p className="mr-auto text-sm text-muted" aria-live="polite">
          <strong className="text-strong tabular">{results.length}</strong> produto(s) encontrado(s)
          {debounced && ` para "${debounced}"`}
        </p>
        <Select aria-label="Filtrar por marca" value={brand} onChange={(e) => updateParam("marca", e.target.value)} className="h-10 w-auto min-w-36 text-sm">
          <option value="">Todas as marcas</option>
          {brandsInUse.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select aria-label="Filtrar por unidade de venda" value={unit} onChange={(e) => updateParam("unidade", e.target.value)} className="h-10 w-auto text-sm">
          <option value="">Qualquer unidade</option>
          {unitsInUse.map((u) => (
            <option key={u} value={u}>
              Por {UNIT_LABEL[u].one}
            </option>
          ))}
        </Select>
        <div className="flex rounded-pill border border-line-strong p-0.5" role="group" aria-label="Visualização">
          {(["grid", "list"] as const).map((v) => {
            const Icon = v === "grid" ? LayoutGrid : List;
            return (
              <button
                key={v}
                type="button"
                onClick={() => updateParam("ver", v === "list" ? "lista" : "")}
                aria-pressed={view === v}
                aria-label={v === "grid" ? "Ver em grade" : "Ver em lista"}
                className={cn("grid size-9 place-items-center rounded-pill transition-colors", view === v ? "bg-action text-action-text" : "text-muted hover:text-strong")}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Resultados */}
      <section className="mt-8" aria-label="Produtos">
        {isLoading ? (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <li key={i}>
                <Skeleton className="aspect-[3/4]" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <EmptyState title="Não foi possível carregar o catálogo" action={<Button onClick={() => refetch()}>Tentar de novo</Button>}>
            Verifique sua conexão.
          </EmptyState>
        ) : results.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title={copy.empty.title}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                {hasFilters && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuery("");
                      navigate("/produtos", { replace: true });
                    }}
                  >
                    {copy.empty.action}
                  </Button>
                )}
                <AnchorButton variant="whatsapp" external href={whatsappLink(debounced ? `Olá! Vocês trabalham com "${debounced}"?` : undefined)}>
                  <MessageCircle className="size-4" /> Perguntar no WhatsApp
                </AnchorButton>
              </div>
            }
          >
            {copy.empty.text}
          </EmptyState>
        ) : (
          <>
            {view === "grid" ? (
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {results.slice(0, limit).map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    categoryName={activeCategory ? undefined : idx.categoryById.get(p.categoryId)?.name}
                    brandName={p.brandId ? idx.brandById.get(p.brandId)?.name : null}
                  />
                ))}
              </ul>
            ) : (
              <ul className="border-t border-line">
                {results.slice(0, limit).map((p) => (
                  <ProductCard key={p.id} product={p} view="list" />
                ))}
              </ul>
            )}
            {results.length > limit && (
              <div className="mt-10 flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((l) => l + PAGE)}>
                  Mostrar mais {Math.min(PAGE, results.length - limit)} de {results.length - limit}
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <HelpBand />
      </div>
    </>
  );
}

function CategoryChip({ to, active, label, count, icon }: { to: string; active: boolean; label: string; count?: number; icon?: React.ReactNode }) {
  return (
    <Link
      to={to}
      viewTransition
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-11 items-center gap-2 rounded-pill border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-200",
        active ? "border-navy bg-navy text-white shadow-sm" : "border-line bg-white text-body hover:border-navy hover:text-navy",
      )}
    >
            {icon}
      {label}
      {count !== undefined && <span className={cn("rounded-pill px-1.5 text-xs tabular", active ? "bg-white/20 text-white" : "bg-sunken text-muted")}>{count}</span>}
    </Link>
  );
}

export function HelpBand() {
  return (
    <aside className="mt-[var(--section)] grid gap-8 overflow-hidden rounded-lg bg-deep p-8 text-on-deep md:grid-cols-[1.4fr_1fr] md:items-end md:p-12">
      <div>
        <p className="label mb-4 !text-on-deep-muted">Atendimento consultivo</p>
        <h2 className="display-2 !text-white">{copy.help.title}</h2>
        <p className="mt-4 max-w-xl text-on-deep-muted">{copy.help.text}</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-stretch">
        <AnchorButton variant="whatsapp" size="lg" external href={whatsappLink("Olá! Preciso de ajuda para escolher produtos.")}>
          <MessageCircle className="size-5" /> {copy.help.consultant}
        </AnchorButton>
        <AnchorButton variant="inverse" size="lg" external href={whatsappLink("Olá! Gostaria de receber o catálogo completo da WSN.")}>
          {copy.help.fullCatalog}
        </AnchorButton>
      </div>
    </aside>
  );
}
