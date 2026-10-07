import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Copy, Lock, MessageCircle, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { formatCep, formatCnpj, formatPhone, isSpCapitalCep } from "@shared/br";
import { productPath, unitLabel } from "@shared/catalog";
import { company, whatsappLink } from "@shared/company";
import { customerSchema, type SubmitQuoteInput, type SubmitQuoteResult } from "@shared/quote";
import { quote as copy } from "@/content/site";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useDocumentTitle } from "@/lib/hooks";
import { AnchorButton, Button, LinkButton } from "@/ui/Button";
import { Alert, EmptyState } from "@/ui/bits";
import { Checkbox, Field, Honeypot, Input, Textarea } from "@/ui/Field";
import { toast } from "@/ui/toast";
import { useCatalog, useCatalogIndex } from "../catalog/data";
import { AddToQuote } from "./AddToQuote";
import { useQuote, useQuoteCount } from "./store";
import { Turnstile, type TurnstileHandle } from "./Turnstile";

const emptyCustomer = { name: "", email: "", phone: "", company: "", cnpj: "", cep: "", message: "" };
type Customer = typeof emptyCustomer;

export function QuotePage() {
  useDocumentTitle(copy.title);
  const lines = useQuote((s) => s.lines);
  const remove = useQuote((s) => s.remove);
  const clear = useQuote((s) => s.clear);
  const ensureSubmitKey = useQuote((s) => s.ensureSubmitKey);
  const total = useQuoteCount();
  const { data } = useCatalog();
  const { productByRef } = useCatalogIndex(data);

  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [done, setDone] = useState<(SubmitQuoteResult & { items: number }) | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);

  const set = (k: keyof Customer, v: string) => {
    setCustomer((c) => ({ ...c, [k]: v }));
    if (errors[k]) setErrors(({ [k]: _drop, ...rest }) => rest);
  };

  const submit = useMutation({
    mutationFn: (body: SubmitQuoteInput) =>
      api<SubmitQuoteResult>("/quotes", { method: "POST", json: body as never, headers: { "Idempotency-Key": ensureSubmitKey() } }),
    onSuccess: (result) => {
      setDone({ ...result, items: lines.length });
      clear(); // só depois do 201 (R-COT-5)
      window.scrollTo({ top: 0 });
    },
    onError: (err) => {
      turnstile.current?.reset();
      if (err instanceof ApiError && err.code === "unavailable_items") {
        setUnavailable(err.fields.items?.split(",") ?? []);
        return;
      }
      if (err instanceof ApiError && err.code === "validation") {
        setErrors(Object.fromEntries(Object.entries(err.fields).map(([k, v]) => [k.replace(/^customer\./, ""), v])));
      }
      toast.error(err instanceof ApiError ? err.message : "Erro ao enviar. Seu carrinho continua salvo.");
    },
  });

  if (done) return <QuoteSuccess protocol={done.protocol} isSpCapital={done.isSpCapital} />;

  if (lines.length === 0) {
    return (
      <div className="container-page py-20">
        <EmptyState icon={<ClipboardList />} title={copy.emptyTitle} action={<LinkButton to="/produtos">{copy.emptyAction}</LinkButton>}>
          {copy.emptyText}
        </EmptyState>
      </div>
    );
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = customerSchema.safeParse(customer);
    const nextErrors: Record<string, string> = {};
    if (!parsed.success) for (const i of parsed.error.issues) nextErrors[String(i.path[0])] ??= i.message;
    if (!consent) nextErrors.consent = "É preciso aceitar a política de privacidade";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !parsed.success) {
      document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
      return;
    }
    if (!token) return toast.info("Aguarde a verificação de segurança terminar e tente de novo.");
    const sendable = lines.filter((l) => productByRef.has(l.ref) && !unavailable.includes(l.ref));
    submit.mutate({ items: sendable, customer, consent: true, turnstileToken: token, website: honeypot });
  };

  const spCapital = isSpCapitalCep(customer.cep);

  return (
    <div className="container-page pt-10 md:pt-14">
      <ol className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted" aria-label="Etapas">
        <li className="text-strong">01 — Revisar itens</li>
        <li className="text-strong">02 — Seus dados</li>
        <li>03 — Protocolo</li>
      </ol>
      <h1 className="display-2">{copy.title}</h1>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-start">
        {/* Itens */}
        <section aria-labelledby="itens" className="card">
          <header className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="itens" className="display-3 text-xl">
              {copy.selected}
            </h2>
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger">
              <Trash2 className="size-4" /> {copy.clear}
            </button>
          </header>
          {unavailable.length > 0 && (
            <div className="px-5 pt-4">
              <Alert tone="warn">Alguns produtos saíram do catálogo e foram marcados abaixo. Remova-os para enviar.</Alert>
            </div>
          )}
          <ul className="divide-y divide-line px-5">
            {lines.map((l) => {
              const p = productByRef.get(l.ref);
              const gone = !p || unavailable.includes(l.ref);
              return (
                <li key={l.ref} className={cn("grid grid-cols-[64px_1fr] gap-4 py-4", gone && "opacity-60")}>
                  <div className="grid size-16 place-items-center rounded-md bg-photo">
                    {p?.imagePath ? <img src={p.imagePath} alt="" className="size-12 object-contain" /> : <span className="font-mono text-xs text-[#5d6b7a]">{l.ref}</span>}
                  </div>
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-muted">Ref. {l.ref}</p>
                      {p ? (
                        <Link to={productPath(p)} className="font-medium text-strong hover:underline">
                          {p.name}
                        </Link>
                      ) : (
                        <span className="font-medium text-danger">Produto indisponível</span>
                      )}
                      {gone && <p className="text-sm text-danger">Não está mais disponível</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {p && !gone ? (
                        <div className="w-36">
                          <AddToQuote productRef={l.ref} productName={p.name} />
                        </div>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => remove(l.ref)}>
                          Remover
                        </Button>
                      )}
                      {p && <span className="w-16 text-xs text-muted">{unitLabel(p.unit, l.quantity)}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <footer className="flex items-center justify-between border-t border-line px-5 py-4">
            <span className="font-medium">{copy.totalItems}</span>
            <span className="text-lg font-bold text-strong tabular">{total}</span>
          </footer>
        </section>

        {/* Dados */}
        <section aria-labelledby="dados" className="card p-5 md:p-6 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
          <h2 id="dados" className="display-3 text-xl">
            {copy.formTitle}
          </h2>
          <form noValidate onSubmit={onSubmit} className="relative mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Nome" required error={errors.name} className="sm:col-span-2">
              <Input autoComplete="name" value={customer.name} onChange={(e) => set("name", e.target.value)} placeholder="Seu nome completo" />
            </Field>
            <Field label="E-mail" required error={errors.email}>
              <Input type="email" autoComplete="email" value={customer.email} onChange={(e) => set("email", e.target.value)} placeholder="seu@email.com" />
            </Field>
            <Field label="Telefone" required error={errors.phone}>
              <Input type="tel" autoComplete="tel" inputMode="tel" value={customer.phone} onChange={(e) => set("phone", formatPhone(e.target.value.replace(/[^\d()\s-]/g, "")))} placeholder="(11) 99999-9999" />
            </Field>
            <Field label="Empresa" error={errors.company}>
              <Input autoComplete="organization" value={customer.company} onChange={(e) => set("company", e.target.value)} placeholder="Nome da sua empresa" />
            </Field>
            <Field label="CNPJ" hint="Opcional" error={errors.cnpj}>
              <Input inputMode="numeric" value={customer.cnpj} onChange={(e) => set("cnpj", formatCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
            </Field>
            <Field
              label="CEP de entrega"
              required
              error={errors.cep}
              hint={spCapital ? `São Paulo capital · pedido mínimo de ${company.minimumOrderSpCapital}` : "Para calcular prazo e frete"}
              className="sm:col-span-2"
            >
              <Input inputMode="numeric" autoComplete="postal-code" value={customer.cep} onChange={(e) => set("cep", formatCep(e.target.value))} placeholder="00000-000" />
            </Field>
            <Field label="Observações" error={errors.message} className="sm:col-span-2">
              <Textarea value={customer.message} onChange={(e) => set("message", e.target.value)} placeholder="Prazo desejado, marca preferida, condições de pagamento…" maxLength={1000} />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (errors.consent) setErrors(({ consent: _c, ...rest }) => rest);
                }}
                error={errors.consent}
                label={
                  <>
                    Concordo com a{" "}
                    <Link to="/privacidade" target="_blank" className="font-medium text-strong underline">
                      política de privacidade
                    </Link>{" "}
                    e autorizo o contato da WSN sobre este orçamento.
                  </>
                }
              />
            </div>
            <Honeypot value={honeypot} onChange={setHoneypot} />
            <div className="sm:col-span-2">
              <Turnstile ref={turnstile} onToken={setToken} />
            </div>
            <Button type="submit" size="lg" loading={submit.isPending} className="sm:col-span-2">
              {copy.submit}
            </Button>
            <p className="flex items-center justify-center gap-2 text-xs text-muted sm:col-span-2">
              <Lock className="size-3.5" /> Seus dados são criptografados e usados só para este orçamento.
            </p>
          </form>
          <div className="mt-6 rounded-md bg-sunken p-4">
            <h3 className="font-sans text-sm font-semibold tracking-normal">{copy.howTitle}</h3>
            <p className="mt-1 text-sm text-muted">{copy.howText}</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function QuoteSuccess({ protocol, isSpCapital }: { protocol: string; isSpCapital: boolean }) {
  useDocumentTitle(`Cotação ${protocol}`);
  return (
    <div className="container-page grid min-h-[70dvh] place-items-center py-16">
      <div className="flex max-w-xl flex-col items-center gap-6 text-center [animation:rise-in_var(--dur-reveal)_var(--ease-out)]">
        <CheckCircle2 className="size-14 stroke-[1.25] text-green" />
        <p className="label">03 — Protocolo</p>
        <h1 className="display-2">Cotação enviada</h1>
        <p className="lead">{copy.success}</p>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(protocol).then(() => toast.ok("Protocolo copiado"))}
          className="group inline-flex items-center gap-3 rounded-lg border border-line-strong bg-raised px-6 py-4 font-mono text-2xl text-strong tabular transition-colors hover:border-action md:text-3xl"
          aria-label={`Protocolo ${protocol}. Copiar`}
        >
          {protocol}
          <Copy className="size-5 text-muted group-hover:text-strong" />
        </button>
        <p className="text-sm text-muted">Enviamos uma confirmação para o seu e-mail com este número.</p>
        {isSpCapital && <Alert tone="warn">Para São Paulo capital, o pedido mínimo é de {company.minimumOrderSpCapital}.</Alert>}
        <div className="flex flex-wrap justify-center gap-3">
          <AnchorButton variant="whatsapp" size="lg" external href={whatsappLink(`Olá! Acabei de enviar a cotação ${protocol} pelo site.`)}>
            <MessageCircle className="size-5" /> Acompanhar no WhatsApp
          </AnchorButton>
          <LinkButton variant="secondary" size="lg" to="/produtos">
            Continuar no catálogo
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
