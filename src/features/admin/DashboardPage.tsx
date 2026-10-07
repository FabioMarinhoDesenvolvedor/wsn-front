import { useQuery } from "@tanstack/react-query";
import { AlarmClock, Eye, SearchX } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { unitLabel } from "@shared/catalog";
import { formatBRL } from "@shared/proposal";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useDocumentTitle } from "@/lib/hooks";
import { EmptyState, Skeleton } from "@/ui/bits";
import { AdminHeader } from "./AdminLayout";
import { fmtRelative, type Insights } from "./api";

const PERIODS = [7, 30, 90, 365];
const fmt1 = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function DashboardPage() {
  useDocumentTitle("Painel");
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({ queryKey: ["insights", days], queryFn: () => api<Insights>(`/admin/insights?days=${days}`) });

  return (
    <>
      <AdminHeader
        label="Inteligência comercial"
        title="Painel"
        actions={
          <div className="flex rounded-pill border border-line-strong p-0.5" role="group" aria-label="Período">
            {PERIODS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                aria-pressed={days === d}
                className={cn("rounded-pill px-3.5 py-1.5 text-sm font-medium transition-colors", days === d ? "bg-action text-action-text" : "text-muted hover:text-strong")}
              >
                {d === 365 ? "12 meses" : `${d} dias`}
              </button>
            ))}
          </div>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Números-chave: não são gráfico, são manchete */}
          <dl className="grid overflow-hidden rounded-lg border border-line bg-raised sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Cotações recebidas" value={String(data.received)} foot={`${data.waiting} aguardando resposta`} />
            <Stat label="Vendas aprovadas online" value={formatBRL(data.wonValueCents)} foot={`${data.approvedProposals} proposta(s) aprovada(s)`} accent />
            <Stat
              label="Conversão"
              value={data.conversionRate == null ? "—" : `${Math.round(data.conversionRate * 100)}%`}
              foot={`${data.won} ganhas · ${data.lost} perdidas · ${data.expired} expiradas`}
            />
            <Stat
              label="Tempo até a 1ª proposta"
              value={data.avgFirstResponseHours == null ? "—" : data.avgFirstResponseHours < 24 ? `${fmt1(data.avgFirstResponseHours)} h` : `${fmt1(data.avgFirstResponseHours / 24)} dias`}
              foot="Meta da copy do site: até 24 horas"
            />
          </dl>

          <div className="grid gap-8 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Cotações por semana" sub="Últimas 12 semanas">
              <WeeklyBars weeks={data.weekly} />
            </Panel>
            <div className="flex flex-col gap-8">
              <Panel title="Atenção agora" icon={<AlarmClock className="size-4 text-warn" />} sub="Sem resposta há mais de 24 h">
                {data.stale.length ? (
                  <ul className="divide-y divide-line">
                    {data.stale.map((q) => (
                      <li key={q.id}>
                        <Link to={`/admin/cotacoes/${q.id}`} className="flex justify-between py-2.5 text-sm hover:text-strong">
                          <span className="font-mono">{q.protocol}</span>
                          <span className="text-warn">{fmtRelative(q.created_at)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-ok">Tudo respondido dentro do prazo.</p>
                )}
              </Panel>
              <Panel title="Propostas abertas pelo cliente" icon={<Eye className="size-4 text-accent-text" />} sub="Viram e ainda não aprovaram — hora de ligar">
                {data.hotProposals.length ? (
                  <ul className="divide-y divide-line">
                    {data.hotProposals.map((p) => (
                      <li key={p.id}>
                        <Link to={`/admin/cotacoes/${p.id}`} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-strong">
                          <span className="font-mono">{p.protocol}</span>
                          <span className="text-muted">
                            {p.view_count}× · {fmtRelative(p.first_viewed_at)}
                          </span>
                          <span className="font-medium text-strong tabular">{formatBRL(p.total_cents)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">Nenhuma proposta aberta aguardando.</p>
                )}
              </Panel>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-2">
            <Panel title="Produtos mais pedidos" sub="Em quantas cotações apareceram">
              <TopProducts items={data.topProducts} />
            </Panel>
            <Panel title="Procuraram e não acharam" icon={<SearchX className="size-4 text-muted" />} sub="Buscas sem resultado no site — oportunidades de mix">
              {data.searchMisses.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="label text-left">
                      <th className="pb-2 font-normal">Termo buscado</th>
                      <th className="pb-2 text-right font-normal">Vezes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.searchMisses.map((m) => (
                      <tr key={m.term} className="border-t border-line">
                        <td className="py-2 text-strong">"{m.term}"</td>
                        <td className="py-2 text-right font-mono tabular">{m.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="Nenhuma busca sem resultado">Quando alguém procurar algo que a WSN não tem no site, aparece aqui.</EmptyState>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, foot, accent }: { label: string; value: string; foot: string; accent?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-line p-6 [&:not(:first-child)]:border-t sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(even)]:border-l xl:[&:not(:first-child)]:border-t-0 xl:[&:not(:first-child)]:border-l">
      <dt className="label">{label}</dt>
      <dd className={cn("font-display text-4xl font-semibold tracking-[-0.03em] tabular", accent ? "text-accent-text" : "text-strong")}>{value}</dd>
      <dd className="text-xs text-muted">{foot}</dd>
    </div>
  );
}

function Panel({ title, sub, icon, children }: { title: string; sub?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-raised p-6">
      <header className="mb-5">
        <h2 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
          {icon}
          {title}
        </h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </header>
      {children}
    </section>
  );
}

/** Série única → sem legenda (o título nomeia); barras finas, topo arredondado, tooltip por barra, tabela acessível. */
function WeeklyBars({ weeks }: { weeks: Insights["weekly"] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!weeks.length) return <EmptyState title="Sem cotações no período" />;
  const max = Math.max(1, ...weeks.map((w) => w.n));
  const label = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return (
    <figure>
      <div className="relative flex h-48 items-end gap-[2px] border-b border-line-strong" role="img" aria-label={`Cotações por semana: ${weeks.map((w) => `${label(w.week)}: ${w.n}`).join(", ")}`}>
        {(max >= 4 ? [0.5, 1] : [1]).map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 border-t border-line" style={{ bottom: `${t * 100}%` }}>
            <span className="absolute -top-2.5 right-0 bg-raised pl-1 font-mono text-[10px] text-muted">{Math.round(max * t)}</span>
          </div>
        ))}
        {weeks.map((w, i) => (
          <div key={w.week} className="relative flex h-full flex-1 items-end justify-center" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <div
              className={cn("w-full max-w-7 rounded-t-[4px] bg-navy transition-opacity", hover !== null && hover !== i && "opacity-40")}
              style={{ height: `${(w.n / max) * 100}%`, minHeight: w.n ? 2 : 0 }}
            />
            {hover === i && (
              <div className="absolute bottom-full z-[var(--z-raised)] mb-2 rounded-md bg-deepest px-3 py-2 text-xs whitespace-nowrap text-on-deep">
                Semana de {label(w.week)}
                <br />
                <strong className="tabular">{w.n}</strong> cotações · <strong className="tabular">{w.won}</strong> ganhas
              </div>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between font-mono text-[11px] text-muted">
        <span>{label(weeks[0].week)}</span>
        <span>{label(weeks[weeks.length - 1].week)}</span>
      </figcaption>
    </figure>
  );
}

function TopProducts({ items }: { items: Insights["topProducts"] }) {
  if (!items.length) return <EmptyState title="Ainda sem cotações no período" />;
  const max = Math.max(...items.map((i) => i.quotes));
  return (
    <ol className="flex flex-col gap-3">
      {items.map((p) => (
        <li key={p.ref} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 text-sm">
          <span className="truncate text-strong">
            <span className="mr-2 font-mono text-xs text-muted">{p.ref}</span>
            {p.name}
          </span>
          <span className="font-mono text-xs text-muted tabular">
            {p.quotes} cot. · {p.quantity} {unitLabel(p.unit, p.quantity)}
          </span>
          <div className="col-span-2 h-1.5 overflow-hidden rounded-pill bg-sunken">
            <div className="h-full rounded-pill bg-navy" style={{ width: `${(p.quotes / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}
