import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, ExternalLink, Eye, Mail, MessageCircle, Phone, Send } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { phoneToE164 } from "@shared/br";
import { unitLabel } from "@shared/catalog";
import { whatsappLink } from "@shared/company";
import { computeTotals, formatBRL, parseBRL, PROPOSAL_LIMITS, type CreateProposalInput } from "@shared/proposal";
import { QUOTE_STATUS_LABEL, type QuoteStatus } from "@shared/quote";
import { api, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { Alert, Badge, Skeleton } from "@/ui/bits";
import { AnchorButton, Button } from "@/ui/Button";
import { Checkbox, Field, Input, Textarea } from "@/ui/Field";
import { toast } from "@/ui/toast";
import { fmtDateTime, fmtRelative, type QuoteDetail } from "./api";
import { STATUS_TONE } from "./QuotesPage";

export function QuoteDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { data: q, isLoading, error } = useQuery({ queryKey: ["quote", id], queryFn: () => api<QuoteDetail>(`/admin/quotes/${id}`) });
  useDocumentTitle(q?.protocol ?? "Cotação");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["quote", id] });
    qc.invalidateQueries({ queryKey: ["quotes"] });
    qc.invalidateQueries({ queryKey: ["insights"] });
  };

  if (isLoading) return <Skeleton className="h-96" />;
  if (error || !q) return <Alert>{errorMessage(error)}</Alert>;

  const c = q.customer;
  const proposalOpen = !["ganha", "perdida", "cancelada"].includes(q.status) && !q.anonymized;

  return (
    <>
      <Link to="/admin/cotacoes" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-strong">
        <ArrowLeft className="size-4" /> Cotações
      </Link>
      <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">Recebida {fmtDateTime(q.createdAt)}</p>
          <h1 className="mt-1 font-mono text-3xl text-strong tabular">{q.protocol}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[q.status]} className="px-3 py-1 text-sm">
            {QUOTE_STATUS_LABEL[q.status]}
          </Badge>
          <StatusActions quote={q} onDone={refresh} />
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-8">
          {proposalOpen ? (
            <ProposalBuilder quote={q} onCreated={refresh} />
          ) : (
            <section className="rounded-lg border border-line bg-raised p-6">
              <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Itens solicitados</h2>
              <ul className="divide-y divide-line text-sm">
                {q.items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-4 py-2.5">
                    <span>
                      <span className="mr-2 font-mono text-muted">{i.ref}</span>
                      {i.name}
                    </span>
                    <span className="tabular">
                      {i.quantity} {unitLabel(i.unit, i.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ProposalHistory quote={q} />
        </div>

        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-line bg-raised p-6">
            <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Cliente</h2>
            {q.anonymized ? (
              <p className="text-sm text-muted">Dados pessoais anonimizados (LGPD).</p>
            ) : (
              <dl className="flex flex-col gap-3 text-sm">
                <Info label="Nome" value={c.name} />
                {c.company && <Info label="Empresa" value={c.company} />}
                {c.cnpj && <Info label="CNPJ" value={c.cnpj} mono />}
                <Info label="CEP" value={`${c.cep}${c.isSpCapital ? " · SP capital" : ""}`} mono />
                {c.message && <Info label="Observações" value={c.message} />}
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.phone && (
                    <AnchorButton size="sm" variant="whatsapp" external href={whatsappLink(`Olá, ${c.name?.split(" ")[0]}! Aqui é da WSN, sobre a cotação ${q.protocol}.`, phoneToE164(c.phone))}>
                      <MessageCircle className="size-4" /> WhatsApp
                    </AnchorButton>
                  )}
                  {c.phone && (
                    <AnchorButton size="sm" variant="secondary" href={`tel:+${phoneToE164(c.phone)}`}>
                      <Phone className="size-4" /> {c.phone}
                    </AnchorButton>
                  )}
                  {c.email && (
                    <AnchorButton size="sm" variant="secondary" href={`mailto:${c.email}?subject=${encodeURIComponent(`Cotação ${q.protocol}`)}`}>
                      <Mail className="size-4" /> E-mail
                    </AnchorButton>
                  )}
                </div>
              </dl>
            )}
          </section>
          <Timeline quote={q} onNote={refresh} />
        </aside>
      </div>
    </>
  );
}

const Info = ({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) => (
  <div>
    <dt className="label">{label}</dt>
    <dd className={mono ? "font-mono text-strong" : "text-strong whitespace-pre-line"}>{value ?? "—"}</dd>
  </div>
);

function StatusActions({ quote, onDone }: { quote: QuoteDetail; onDone: () => void }) {
  const change = useMutation({
    mutationFn: (to: QuoteStatus) => api(`/admin/quotes/${quote.id}/status`, { method: "POST", json: { to } }),
    onSuccess: () => {
      toast.ok("Status atualizado");
      onDone();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!quote.nextStatuses.length) return null;
  return (
    <select
      aria-label="Mudar status"
      value=""
      disabled={change.isPending}
      onChange={(e) => e.target.value && change.mutate(e.target.value as QuoteStatus)}
      className="h-9 rounded-pill border border-line-strong bg-raised px-3 text-sm"
    >
      <option value="">Mudar status…</option>
      {quote.nextStatuses.map((s) => (
        <option key={s} value={s}>
          {QUOTE_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

interface Line {
  quoteItemId: number;
  quantity: number;
  price: string;
}

const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** Montador de proposta: preço interno pré-preenchido, totais ao vivo, envio com link pessoal. */
function ProposalBuilder({ quote, onCreated }: { quote: QuoteDetail; onCreated: () => void }) {
  const last = quote.proposals[0];
  const [lines, setLines] = useState<Line[]>(() =>
    quote.items.map((i) => ({
      quoteItemId: i.id,
      quantity: i.lastProposal?.quantity ?? i.quantity,
      price: centsToInput(i.lastProposal?.unit_price_cents ?? i.internalPriceCents),
    })),
  );
  const [validDays, setValidDays] = useState<number>(PROPOSAL_LIMITS.defaultValidDays);
  const [shipping, setShipping] = useState(centsToInput(last?.shippingCents ?? 0));
  const [discount, setDiscount] = useState(centsToInput(last?.discountCents ?? 0));
  const [paymentTerms, setPaymentTerms] = useState(last?.paymentTerms ?? "Pix, boleto ou cartão");
  const [deliveryTerms, setDeliveryTerms] = useState(last?.deliveryTerms ?? (quote.customer.isSpCapital ? "São Paulo capital: 24-48h após confirmação" : ""));
  const [notes, setNotes] = useState(last?.notes ?? "");
  const [notify, setNotify] = useState(true);
  const [sent, setSent] = useState<{ link: string; version: number } | null>(null);

  const parsed = lines.map((l) => ({ ...l, cents: parseBRL(l.price) }));
  const invalid = parsed.some((l) => l.cents == null || l.quantity < 1);
  const totals = computeTotals(parsed.map((l) => ({ quantity: l.quantity, unitPriceCents: l.cents ?? 0 })), parseBRL(discount) ?? 0, parseBRL(shipping) ?? 0);

  const create = useMutation({
    mutationFn: (body: CreateProposalInput) => api<{ link: string; version: number }>(`/admin/quotes/${quote.id}/proposals`, { method: "POST", json: body as never }),
    onSuccess: (res) => {
      setSent(res);
      onCreated();
      toast.ok(`Proposta v${res.version} criada`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  if (sent) return <ShareProposal link={sent.link} version={sent.version} quote={quote} onAgain={() => setSent(null)} />;

  return (
    <section className="rounded-lg border border-line bg-raised">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-sans text-base font-semibold tracking-normal">{last ? `Nova versão da proposta (v${last.version + 1})` : "Montar proposta"}</h2>
        <span className="label">preço sugerido = tabela interna</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="label border-b border-line text-left">
              <th className="px-6 py-2 font-normal">Produto</th>
              <th className="px-2 py-2 font-normal">Qtd.</th>
              <th className="px-2 py-2 font-normal">Unitário (R$)</th>
              <th className="px-6 py-2 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((item, i) => {
              const l = parsed[i];
              return (
                <tr key={item.id} className="border-b border-line">
                  <td className="px-6 py-3">
                    <span className="mr-2 font-mono text-xs text-muted">{item.ref}</span>
                    <span className="text-strong">{item.name}</span>
                    <span className="block text-xs text-muted">
                      Pedido: {item.quantity} {unitLabel(item.unit, item.quantity)}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <input
                      inputMode="numeric"
                      aria-label={`Quantidade de ${item.name}`}
                      value={l.quantity}
                      onChange={(e) => setLine(i, { quantity: Math.min(9999, Number(e.target.value.replace(/\D/g, "")) || 0) })}
                      className="h-9 w-20 rounded-md border border-line-strong bg-raised px-2 text-right font-mono tabular"
                    />
                  </td>
                  <td className="px-2 py-3">
                    <input
                      inputMode="decimal"
                      aria-label={`Preço unitário de ${item.name}`}
                      aria-invalid={l.cents == null}
                      value={l.price}
                      placeholder="0,00"
                      onChange={(e) => setLine(i, { price: e.target.value })}
                      className="h-9 w-28 rounded-md border border-line-strong bg-raised px-2 text-right font-mono tabular aria-[invalid=true]:border-danger"
                    />
                  </td>
                  <td className="px-6 py-3 text-right font-medium tabular">{l.cents == null ? "—" : formatBRL(l.cents * l.quantity)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Validade (dias)">
            <Input type="number" min={1} max={60} value={validDays} onChange={(e) => setValidDays(Math.min(60, Math.max(1, Number(e.target.value) || 1)))} />
          </Field>
          <Field label="Condições de pagamento">
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} maxLength={300} />
          </Field>
          <Field label="Entrega" className="sm:col-span-2">
            <Input value={deliveryTerms} onChange={(e) => setDeliveryTerms(e.target.value)} maxLength={300} />
          </Field>
          <Field label="Observações para o cliente" className="sm:col-span-2">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
          </Field>
        </div>
        <div className="flex flex-col gap-3 rounded-md bg-sunken p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="tabular">{formatBRL(totals.subtotalCents)}</span>
          </div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted">Desconto (R$)</span>
            <input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" className="h-8 w-24 rounded-md border border-line-strong bg-raised px-2 text-right font-mono" />
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-muted">Frete (R$)</span>
            <input value={shipping} onChange={(e) => setShipping(e.target.value)} inputMode="decimal" className="h-8 w-24 rounded-md border border-line-strong bg-raised px-2 text-right font-mono" />
          </label>
          <div className="flex items-baseline justify-between border-t border-line-strong pt-3">
            <span className="font-medium text-strong">Total</span>
            <span className="font-display text-2xl font-semibold text-strong tabular">{formatBRL(totals.totalCents)}</span>
          </div>
          <Checkbox checked={notify} onChange={(e) => setNotify(e.target.checked)} label="Enviar por e-mail ao cliente" />
          <Button
            loading={create.isPending}
            disabled={invalid || quote.anonymized}
            onClick={() =>
              create.mutate({
                items: parsed.map((l) => ({ quoteItemId: l.quoteItemId, quantity: l.quantity, unitPriceCents: l.cents ?? 0 })),
                validDays,
                shippingCents: parseBRL(shipping) ?? 0,
                discountCents: parseBRL(discount) ?? 0,
                paymentTerms: paymentTerms || undefined,
                deliveryTerms: deliveryTerms || undefined,
                notes: notes || undefined,
                notifyCustomer: notify,
              })
            }
          >
            <Send className="size-4" /> Gerar proposta
          </Button>
          {invalid && <p className="text-xs text-danger">Preencha preço e quantidade de todos os itens.</p>}
        </div>
      </div>
    </section>
  );
}

function ShareProposal({ link, version, quote, onAgain }: { link: string; version: number; quote: QuoteDetail; onAgain: () => void }) {
  const phone = quote.customer.phone;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-ok/30 bg-ok-soft p-6">
      <h2 className="font-sans text-lg font-semibold tracking-normal text-ok">Proposta v{version} pronta</h2>
      <p className="text-sm text-body">O cliente pode ver, imprimir em PDF e aprovar por este link pessoal:</p>
      <code className="block overflow-x-auto rounded-md bg-raised px-3 py-2 font-mono text-xs">{link}</code>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(link).then(() => toast.ok("Link copiado"))}>
          <Copy className="size-4" /> Copiar link
        </Button>
        {phone && (
          <AnchorButton
            size="sm"
            variant="whatsapp"
            external
            href={whatsappLink(`Olá, ${quote.customer.name?.split(" ")[0]}! Sua proposta da WSN (${quote.protocol}) está pronta: ${link}`, phoneToE164(phone))}
          >
            <MessageCircle className="size-4" /> Enviar no WhatsApp do cliente
          </AnchorButton>
        )}
        <AnchorButton size="sm" variant="ghost" external href={link}>
          <ExternalLink className="size-4" /> Ver como cliente
        </AnchorButton>
        <Button size="sm" variant="ghost" onClick={onAgain}>
          Fazer nova versão
        </Button>
      </div>
    </section>
  );
}

function ProposalHistory({ quote }: { quote: QuoteDetail }) {
  if (!quote.proposals.length) return null;
  return (
    <section className="rounded-lg border border-line bg-raised p-6">
      <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Propostas enviadas</h2>
      <ul className="divide-y divide-line">
        {quote.proposals.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-sm">
            <span className="font-mono">v{p.version}</span>
            <span className="font-medium text-strong tabular">{formatBRL(p.totalCents)}</span>
            <Badge tone={p.status === "aprovada" ? "ok" : p.status === "enviada" ? "navy" : p.status === "expirada" ? "warn" : "neutral"}>{p.status}</Badge>
            <span className="flex items-center gap-1 text-muted">
              <Eye className="size-3.5" /> {p.viewCount ? `${p.viewCount}× · 1ª ${fmtRelative(p.firstViewedAt!)}` : "não aberta"}
            </span>
            {p.approvedAt && <span className="text-ok">aprovada por {p.approvedBy}</span>}
            <button type="button" className="ml-auto text-muted hover:text-strong" onClick={() => navigator.clipboard.writeText(p.link).then(() => toast.ok("Link copiado"))} aria-label={`Copiar link da v${p.version}`}>
              <Copy className="size-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Timeline({ quote, onNote }: { quote: QuoteDetail; onNote: () => void }) {
  const [note, setNote] = useState("");
  const add = useMutation({
    mutationFn: () => api(`/admin/quotes/${quote.id}/notes`, { method: "POST", json: { note } }),
    onSuccess: () => {
      setNote("");
      onNote();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <section className="rounded-lg border border-line bg-raised p-6">
      <h2 className="mb-4 font-sans text-base font-semibold tracking-normal">Histórico</h2>
      <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
        {[...quote.events].reverse().map((e, i) => (
          <li key={i} className="relative text-sm">
            <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-pill border-2 border-raised bg-navy" />
            <p className="text-strong">
              {e.from_status === e.to_status ? "Nota" : QUOTE_STATUS_LABEL[e.to_status]}
              <span className="text-muted"> · {e.actor_name ?? "cliente/sistema"}</span>
            </p>
            {e.note && <p className="text-body">{e.note}</p>}
            <p className="text-xs text-muted">{fmtDateTime(e.created_at)}</p>
          </li>
        ))}
      </ol>
      <form
        className="mt-5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (note.trim()) add.mutate();
        }}
      >
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Adicionar nota interna" aria-label="Nota interna" className="h-9 flex-1 rounded-md border border-line-strong bg-raised px-3 text-sm" maxLength={1000} />
        <Button size="sm" type="submit" loading={add.isPending}>
          Salvar
        </Button>
      </form>
    </section>
  );
}
