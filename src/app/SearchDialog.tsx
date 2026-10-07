import { ArrowRight, CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { productPath } from "@shared/catalog";
import { cn } from "@/lib/cn";
import { Dialog } from "@/ui/Dialog";
import { searchProducts, toSearchable, useCatalog, useCatalogIndex } from "@/features/catalog/data";

/** Busca instantânea global: resultados enquanto digita; Ref exata vai direto ao produto. */
export function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data } = useCatalog();
  const idx = useCatalogIndex(data);

  const searchable = useMemo(
    () => toSearchable(data?.products ?? [], (id) => (id ? (idx.brandById.get(id)?.name ?? "") : "")),
    [data, idx.brandById],
  );
  const results = useMemo(() => (q.trim() ? searchProducts(searchable, q).slice(0, 8) : []), [searchable, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const go = (path: string) => {
    onClose();
    navigate(path, { viewTransition: true });
  };

  const submit = () => {
    if (results[active]) go(productPath(results[active]));
    else if (q.trim()) go(`/produtos?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="Buscar produtos" className="sm:mt-[12vh] sm:mb-auto">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Nome, marca ou Ref. (ex.: 0038)"
          aria-label="Buscar produtos"
          aria-controls="search-results"
          aria-activedescendant={results[active] ? `sr-${results[active].ref}` : undefined}
          className="h-13 w-full rounded-pill border border-line-strong bg-canvas pr-4 pl-12 text-base text-strong focus:border-action focus:outline-none"
        />
      </div>

      <ul id="search-results" role="listbox" aria-label="Resultados" className="mt-3 flex flex-col">
        {results.map((p, i) => (
          <li key={p.ref} id={`sr-${p.ref}`} role="option" aria-selected={i === active}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onClick={() => go(productPath(p))}
              className={cn("flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors", i === active && "bg-sunken")}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-line bg-white">
                {p.imagePath && <img src={p.imagePath} alt="" className="size-8 object-contain" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-strong">{p.name}</span>
                <span className="font-mono text-xs text-muted">REF {p.ref}</span>
              </span>
              {i === active && <CornerDownLeft className="size-4 text-muted" />}
            </button>
          </li>
        ))}
      </ul>

      {q.trim() && (
        <button type="button" onClick={() => go(`/produtos?q=${encodeURIComponent(q.trim())}`)} className="mt-2 flex w-full items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-strong hover:bg-sunken">
          {results.length ? `Ver todos os resultados para "${q.trim()}"` : `Nenhum resultado rápido — buscar "${q.trim()}" no catálogo`}
          <ArrowRight className="size-4" />
        </button>
      )}
      {!q.trim() && (
        <div className="mt-4 flex flex-wrap gap-2">
          {idx.categories.map((c) => (
            <button key={c.id} type="button" onClick={() => go(`/produtos/c/${c.slug}`)} className="rounded-pill border border-line-strong px-3.5 py-1.5 text-sm hover:border-action">
              {c.name}
            </button>
          ))}
        </div>
      )}
    </Dialog>
  );
}
