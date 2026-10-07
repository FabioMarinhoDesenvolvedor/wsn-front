import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, MessageCircle, Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { unitLabel } from "@shared/catalog";
import { company, whatsappLink } from "@shared/company";
import { formatBRL, type PublicProposal } from "@shared/proposal";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { AnchorButton, Button } from "@/ui/Button";
import { Alert, Badge, EmptyState, Skeleton } from "@/ui/bits";
import { Checkbox, Field, Input } from "@/ui/Field";
import { Logo } from "@/ui/Logo";
import { toast } from "@/ui/toast";
import { useQuote } from "../quote/store";

const fmtDate = (iso: string, withTime = false) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });

/** Dias inteiros restantes (0 = vence hoje). */
const daysLeft = (iso: string) => Math.floor((Date.parse(iso) - Date.now()) / 86400_000);

export function ProposalPage() {
  const { token = "" } = useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["proposal", token],
    queryFn: () => api<PublicProposal>(`/proposals/${token}`),
    retry: false,
  });
  useDocumentTitle(data ? `Proposta ${data.protocol}` : "Proposta comercial");

  if (isLoading) {
    return (
      <Shell>
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-80" />
      </Shell>
    );
  }
  if (error || !data) {
    return (
      <Shell>
        <EmptyState
          title={error instanceof ApiError && error.status === 404 ? "Proposta não encontrada" : "Não foi possível abrir a proposta"}
          action={
            <AnchorButton variant="whatsapp" external href={whatsappLink("Olá! Não consegui abrir minha proposta pelo link.")}>
              <MessageCircle className="size-4" /> Falar com a WSN
            </AnchorButton>
          }
        >
          Confira se o link está completo ou peça um novo à nossa equipe.
        </EmptyState>
      </Shell>
    );
  }

  const p = data;
  const left = daysLeft(p.validUntil);
  const statusBadge = {
    enviada: <Badge tone={left <= 2 ? "warn" : "navy"}>{left < 1 ? "Vence hoje" : `Válida por mais ${left} dia${left > 1 ? "s" : ""}`}</Badge>,
    aprovada: <Badge tone="ok">Aprovada</Badge>,
    substituida: <Badge tone="neutral">Substituída por versão mais recente</Badge>,
    expirada: <Badge tone="danger">Expirada</Badge>,
  }[p.status];

  return (
    <Shell>
      <header className="flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label">Proposta comercial{p.version > 1 ? ` · versão ${p.version}` : ""}</p>
          <h1 className="mt-3 font-mono text-[clamp(28px,4vw,44px)] tracking-tight text-strong tabular">{p.protocol}</h1>
          <p className="mt-2 text-muted">
            Para <strong className="text-strong">{p.companyName ?? p.customerName}</strong>
            {p.companyName && ` · aos cuidados de ${p.customerName}`} · emitida em {fmtDate(p.createdAt)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 md:items-end">
          {statusBadge}
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <Clock className="size-4" /> Válida até {fmtDate(p.validUntil)}
          </p>
        </div>
      </header>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <caption className="sr-only">Itens da proposta</caption>
          <thead>
            <tr className="label border-b border-line-strong text-left">
              <th className="py-3 pr-3 font-normal">Ref</th>
              <th className="py-3 pr-3 font-normal">Produto</th>
              <th className="py-3 pr-3 text-right font-normal">Qtd.</th>
              <th className="py-3 pr-3 text-right font-normal">Unitário</th>
              <th className="py-3 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {p.items.map((i) => (
              <tr key={i.ref} className="border-b border-line">
                <td className="py-3 pr-3 font-mono text-muted">{i.ref}</td>
                <td className="py-3 pr-3 text-strong">{i.name}</td>
                <td className="py-3 pr-3 text-right whitespace-nowrap tabular">
                  {i.quantity} {unitLabel(i.unit, i.quantity)}
                </td>
                <td className="py-3 pr-3 text-right whitespace-nowrap tabular">{formatBRL(i.unitPriceCents)}</td>
                <td className="py-3 text-right font-medium whitespace-nowrap text-strong tabular">{formatBRL(i.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-4 text-sm">
          {p.paymentTerms && <Term label="Pagamento" value={p.paymentTerms} />}
          {p.deliveryTerms && <Term label="Entrega" value={p.deliveryTerms} />}
          {p.notes && <Term label="Observações" value={p.notes} />}
          {p.sellerName && <Term label="Atendimento" value={`${p.sellerName} · ${company.name}`} />}
        </div>
        <dl className="flex flex-col gap-2 rounded-lg bg-sunken p-5 text-sm tabular">
          <Row label="Subtotal" value={formatBRL(p.totals.subtotalCents)} />
          {p.totals.discountCents > 0 && <Row label="Desconto" value={`− ${formatBRL(p.totals.discountCents)}`} />}
          <Row label="Frete" value={p.totals.shippingCents ? formatBRL(p.totals.shippingCents) : "Incluso"} />
          <div className="mt-2 flex items-baseline justify-between border-t border-line-strong pt-3">
            <dt className="font-medium text-strong">Total</dt>
            <dd className="font-display text-3xl font-semibold tracking-tight text-strong">{formatBRL(p.totals.totalCents)}</dd>
          </div>
        </dl>
      </div>

      <section className="no-print mt-10 border-t border-line pt-8">
        {p.status === "enviada" && <ApproveForm token={token} onApproved={(fresh) => qc.setQueryData(["proposal", token], fresh)} protocol={p.protocol} />}
        {p.status === "aprovada" && (
          <Alert tone="ok">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="size-5" /> Aprovada por {p.approvedBy} em {p.approvedAt && fmtDate(p.approvedAt, true)}. Nossa equipe já foi avisada e vai confirmar o pedido.
            </span>
          </Alert>
        )}
        {p.status === "expirada" && <Alert tone="warn">Esta proposta expirou. Fale com a WSN para atualizar valores e prazos.</Alert>}
        {p.status === "substituida" && <Alert tone="warn">Existe uma versão mais recente desta proposta. Use o último link que você recebeu.</Alert>}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="size-4" /> Imprimir / salvar PDF
          </Button>
          <AnchorButton variant="ghost" external href={whatsappLink(`Olá! Sobre a proposta ${p.protocol}: gostaria de um ajuste.`)}>
            <MessageCircle className="size-4 text-whatsapp" /> Pedir ajuste no WhatsApp
          </AnchorButton>
          <RepeatOrder proposal={p} />
        </div>
      </section>
    </Shell>
  );
}

function ApproveForm({ token, protocol, onApproved }: { token: string; protocol: string; onApproved: (p: PublicProposal) => void }) {
  const [name, setName] = useState("");
  const [accept, setAccept] = useState(false);
  const [error, setError] = useState<string>();
  const approve = useMutation({
    mutationFn: () => api<PublicProposal>(`/proposals/${token}/approve`, { method: "POST", json: { name, accept } }),
    onSuccess: (fresh) => {
      onApproved(fresh);
      toast.ok(`Proposta ${protocol} aprovada`);
    },
    onError: (err) => setError(errorMessage(err)),
  });

  return (
    <form
      className="grid gap-4 rounded-lg border border-line-strong bg-raised p-5 md:grid-cols-[1fr_auto] md:items-end md:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim().length < 2) return setError("Informe seu nome para registrar a aprovação");
        if (!accept) return setError("Confirme que aprova os itens, valores e condições");
        setError(undefined);
        approve.mutate();
      }}
    >
      <div className="flex flex-col gap-4">
        <h2 className="display-3 text-xl">Aprovar proposta</h2>
        <Field label="Seu nome completo" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Checkbox checked={accept} onChange={(e) => setAccept(e.target.checked)} label="Aprovo os itens, valores e condições desta proposta." />
        {error && <Alert>{error}</Alert>}
      </div>
      <Button type="submit" size="lg" loading={approve.isPending}>
        <ShieldCheck className="size-5" /> Aprovar proposta
      </Button>
    </form>
  );
}

/** Recompra: carrega os itens desta proposta numa nova cotação. */
function RepeatOrder({ proposal }: { proposal: PublicProposal }) {
  const replace = useQuote((s) => s.replace);
  const navigate = useNavigate();
  return (
    <Button
      variant="ghost"
      onClick={() => {
        replace(proposal.items.map((i) => ({ ref: i.ref, quantity: i.quantity })));
        navigate("/cotacao");
      }}
    >
      <RotateCcw className="size-4" /> Repetir estes itens numa nova cotação
    </Button>
  );
}

const Term = ({ label, value }: { label: string; value: string }) => (
  <div className="grid gap-1 border-b border-line pb-3 sm:grid-cols-[120px_1fr]">
    <span className="label">{label}</span>
    <span className="whitespace-pre-line text-strong">{value}</span>
  </div>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <dt className="text-muted">{label}</dt>
    <dd className="text-strong">{value}</dd>
  </div>
);

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas print:bg-white">
      <div className="border-b border-line bg-raised">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <p className="hidden text-right text-xs text-muted sm:block">
            {company.legalName} · CNPJ {company.cnpj}
            <br />
            {company.email} · WhatsApp {company.whatsapp.display}
          </p>
        </div>
      </div>
      <main className="container-page max-w-5xl py-10 md:py-14">{children}</main>
    </div>
  );
}
