import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router";
import { formatBRL } from "@shared/proposal";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@shared/quote";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useDocumentTitle } from "@/lib/hooks";
import { Badge, EmptyState, Skeleton } from "@/ui/bits";
import { AnchorButton, Button } from "@/ui/Button";
import { AdminHeader } from "./AdminLayout";
import { fmtRelative, type Me, type QuoteListItem } from "./api";

export const STATUS_TONE: Record<QuoteStatus, "neutral" | "navy" | "green" | "ok" | "warn" | "danger" | "signal"> = {
  recebida: "signal",
  em_analise: "navy",
  respondida: "neutral",
  ganha: "ok",
  perdida: "danger",
  cancelada: "neutral",
  expirada: "warn",
};

const TABS: { value: string; label: string }[] = [
  { value: "abertas", label: "Em aberto" },
  { value: "recebida", label: "Novas" },
  { value: "respondida", label: "Com proposta" },
  { value: "ganha", label: "Ganhas" },
  { value: "", label: "Todas" },
];

export function QuotesPage() {
  useDocumentTitle("Cotações");
  const me = useOutletContext<Me>();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "abertas";
  const page = Number(params.get("page") ?? 1);
  const [q, setQ] = useState(params.get("q") ?? "");
  const search = params.get("q") ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["quotes", status, search, page],
    queryFn: () => api<{ items: QuoteListItem[]; total: number; pageSize: number }>(`/admin/quotes?${new URLSearchParams({ status, q: search, page: String(page) })}`),
    placeholderData: (prev) => prev,
  });

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <AdminHeader
        label="Comercial"
        title="Cotações"
        actions={
          me.role === "admin" && (
            <AnchorButton variant="secondary" size="sm" href="/api/admin/export/quotes.csv">
              <Download className="size-4" /> Exportar CSV
            </AnchorButton>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={status === t.value}
              onClick={() => update({ status: t.value || "todas" })}
              className={cn(
                "rounded-pill px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                status === t.value || (t.value === "" && status === "todas") ? "bg-action text-action-text" : "text-muted hover:bg-sunken",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <form
          role="search"
          className="relative md:w-80"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q: q.trim() });
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Protocolo ou e-mail exato"
            aria-label="Buscar cotação"
            className="h-10 w-full rounded-pill border border-line-strong bg-raised pr-3 pl-9 text-sm focus:border-action focus:outline-none"
          />
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-raised">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <div className="p-6">
            <EmptyState title="Nenhuma cotação aqui">Quando um cliente enviar uma cotação pelo site, ela aparece nesta lista e por e-mail.</EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line bg-sunken/60">
                <tr className="label text-left">
                  <th className="px-4 py-3 font-normal">Protocolo</th>
                  <th className="px-4 py-3 font-normal">Cliente</th>
                  <th className="px-4 py-3 font-normal">Itens</th>
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 text-right font-normal">Proposta</th>
                  <th className="px-4 py-3 text-right font-normal">Recebida</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="group border-b border-line last:border-0 hover:bg-sunken/50">
                    <td className="px-4 py-3">
                      <Link to={`/admin/cotacoes/${r.id}`} className="font-mono text-strong group-hover:underline">
                        {r.protocol}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-strong">{r.company ?? r.name}</span>
                      {r.company && <span className="text-muted">{r.name}</span>}
                    </td>
                    <td className="px-4 py-3 font-mono tabular">{r.itemCount}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[r.status]}>{QUOTE_STATUS_LABEL[r.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular">{r.totalCents != null ? formatBRL(r.totalCents) : "—"}</td>
                    <td className="px-4 py-3 text-right text-muted" title={r.createdAt}>
                      {fmtRelative(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-end gap-2" aria-label="Paginação">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} aria-label="Anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-mono text-sm tabular">
            {page}/{pages}
          </span>
          <Button variant="ghost" size="sm" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} aria-label="Próxima">
            <ChevronRight className="size-4" />
          </Button>
        </nav>
      )}
    </>
  );
}
