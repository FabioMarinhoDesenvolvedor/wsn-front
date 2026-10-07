import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { formatPhone } from "@shared/br";
import { company, whatsappLink } from "@shared/company";
import { contact } from "@/content/site";
import { api, ApiError } from "@/lib/api";
import { useDocumentTitle } from "@/lib/hooks";
import { AnchorButton, Button } from "@/ui/Button";
import { Alert, Pendente } from "@/ui/bits";
import { Checkbox, Field, Honeypot, Input, Select, Textarea } from "@/ui/Field";
import { toast } from "@/ui/toast";
import { Turnstile, type TurnstileHandle } from "../quote/Turnstile";

const empty = { name: "", email: "", phone: "", company: "", subject: "", message: "" };

export function ContactPage() {
  useDocumentTitle(contact.title);
  const [form, setForm] = useState(empty);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [token, setToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const turnstile = useRef<TurnstileHandle>(null);
  const set = (k: keyof typeof empty, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const send = useMutation({
    mutationFn: () => api("/contact", { method: "POST", json: { ...form, phone: form.phone || undefined, consent, turnstileToken: token, website: honeypot } }),
    onSuccess: () => {
      setForm(empty);
      setConsent(false);
      setErrors({});
      turnstile.current?.reset();
    },
    onError: (err) => {
      turnstile.current?.reset();
      if (err instanceof ApiError) setErrors(err.fields);
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar.");
    },
  });

  return (
    <>
      <section className="container-page pt-12 pb-10 md:pt-16">
        <p className="label mb-5">Atendimento</p>
        <h1 className="display-1">{contact.title}</h1>
        <p className="lead mt-5 max-w-2xl">{contact.lead}</p>
      </section>

      <section className="container-page grid gap-8 pb-[var(--section)] lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-lg border border-line bg-raised p-6 md:p-8">
          <h2 className="display-3">{contact.form.title}</h2>
          {send.isSuccess ? (
            <div className="mt-8 flex flex-col items-start gap-4">
              <CheckCircle2 className="size-10 stroke-[1.4] text-green" />
              <Alert tone="ok">{contact.form.success}</Alert>
              <Button variant="secondary" onClick={() => send.reset()}>
                Enviar outra mensagem
              </Button>
            </div>
          ) : (
            <form
              noValidate
              className="relative mt-6 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const next: Record<string, string> = {};
                if (form.name.trim().length < 2) next.name = "Informe seu nome";
                if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "E-mail inválido";
                if (!form.subject) next.subject = "Selecione um assunto";
                if (form.message.trim().length < 5) next.message = "Escreva sua mensagem";
                if (!consent) next.consent = "É preciso aceitar a política de privacidade";
                setErrors(next);
                if (Object.keys(next).length) return;
                if (!token) return toast.info("Aguarde a verificação de segurança e tente de novo.");
                send.mutate();
              }}
            >
              <Field label={contact.form.name} required error={errors.name}>
                <Input autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={contact.form.namePlaceholder} />
              </Field>
              <Field label={contact.form.email} required error={errors.email}>
                <Input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={contact.form.emailPlaceholder} />
              </Field>
              <Field label={contact.form.phone} error={errors.phone}>
                <Input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", formatPhone(e.target.value))} placeholder={contact.form.phonePlaceholder} />
              </Field>
              <Field label={contact.form.company} error={errors.company}>
                <Input autoComplete="organization" value={form.company} onChange={(e) => set("company", e.target.value)} placeholder={contact.form.companyPlaceholder} />
              </Field>
              <Field label={contact.form.subject} required error={errors.subject} className="sm:col-span-2">
                <Select value={form.subject} onChange={(e) => set("subject", e.target.value)}>
                  <option value="">{contact.form.subjectPlaceholder}</option>
                  {contact.form.subjects.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
              <Field label={contact.form.message} required error={errors.message} className="sm:col-span-2">
                <Textarea rows={5} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder={contact.form.messagePlaceholder} maxLength={3000} />
              </Field>
              <div className="sm:col-span-2">
                <Checkbox
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  error={errors.consent}
                  label={
                    <>
                      Concordo com a{" "}
                      <Link to="/privacidade" target="_blank" className="font-medium text-strong underline">
                        política de privacidade
                      </Link>
                      .
                    </>
                  }
                />
              </div>
              <Honeypot value={honeypot} onChange={setHoneypot} />
              <div className="sm:col-span-2">
                <Turnstile ref={turnstile} onToken={setToken} />
              </div>
              <Button type="submit" size="lg" loading={send.isPending} className="sm:col-span-2 sm:justify-self-start">
                {contact.form.submit}
              </Button>
            </form>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="rounded-lg bg-deep p-6 text-on-deep md:p-8">
            <h2 className="display-3 !text-white">{contact.info.title}</h2>
            <ul className="mt-6 flex flex-col divide-y divide-line-deep">
              <li className="flex items-center gap-4 py-4">
                <Phone className="size-5 text-signal" />
                <div>
                  <p className="text-sm text-on-deep-muted">{contact.info.phone.label}</p>
                  <a href={`tel:+${company.phone.e164}`} className="text-white">
                    <Pendente note={contact.info.phone.pendente}>{company.phone.display}</Pendente>
                  </a>
                </div>
              </li>
              <li>
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 py-4">
                  <MessageCircle className="size-5 text-signal" />
                  <div>
                    <p className="text-sm text-on-deep-muted">{contact.info.whatsapp}</p>
                    <p className="text-white group-hover:underline">{company.whatsapp.display}</p>
                  </div>
                </a>
              </li>
              <li>
                <a href={`mailto:${company.email}`} className="group flex items-center gap-4 py-4">
                  <Mail className="size-5 text-signal" />
                  <div className="min-w-0">
                    <p className="text-sm text-on-deep-muted">{contact.info.email}</p>
                    <p className="break-all text-white group-hover:underline">{company.email}</p>
                  </div>
                </a>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-line bg-raised p-6 md:p-8">
            <h2 className="display-3">{contact.location.title}</h2>
            <p className="mt-4 flex gap-3">
              <MapPin className="mt-1 size-5 shrink-0 text-accent-text" />
              <span>
                <strong className="block text-strong">{contact.location.address}</strong>
                {company.address.street} – {company.address.district}, {company.address.city} – {company.address.state}, CEP: {company.address.cep}
              </span>
            </p>
            <AnchorButton variant="secondary" external href={company.address.mapsUrl} className="mt-6">
              <Navigation className="size-4" /> {contact.location.directions}
            </AnchorButton>
          </div>
        </div>
      </section>

      <section className="border-t border-line bg-raised py-[var(--section)]" aria-labelledby="faq">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="label mb-4">Dúvidas</p>
            <h2 id="faq" className="display-2">
              {contact.faq.title}
            </h2>
            <p className="lead mt-4">{contact.faq.lead}</p>
          </div>
          <div className="border-t border-line">
            {contact.faq.items.map((f) => (
              <details key={f.question} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-medium text-strong [&::-webkit-details-marker]:hidden">
                  {f.question}
                  <ChevronDown className="size-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="pb-5 text-body">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
