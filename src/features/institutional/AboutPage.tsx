import { Check, Factory, Leaf, Mail, MapPin, MessageCircle, Recycle, Truck } from "lucide-react";
import { company, whatsappLink } from "@shared/company";
import { about } from "@/content/site";
import { useDocumentTitle, useReveal } from "@/lib/hooks";
import { AnchorButton, LinkButton } from "@/ui/Button";
import { Pendente } from "@/ui/bits";

const PILLAR_ICONS = [Leaf, Recycle, Truck, Factory];

export function AboutPage() {
  useDocumentTitle(about.title);
  const revealMvv = useReveal<HTMLDivElement>();

  return (
    <>
      <section className="container-page grid gap-12 pt-12 pb-[var(--section)] md:pt-16 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="label mb-5">Desde {company.foundedYear} · São Paulo</p>
          <h1 className="display-1 max-w-[12ch]">{about.title}</h1>
          <div className="mt-10 flex max-w-2xl flex-col gap-5 text-lg leading-relaxed">
            {about.paragraphs.map((p, i) => (
              <p key={i} className={i === 0 ? "text-xl text-strong first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-7xl first-letter:leading-[0.8] first-letter:font-semibold first-letter:text-navy" : ""}>
                {p}
              </p>
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-6 self-start rounded-lg border border-line bg-raised p-6 lg:sticky lg:top-[calc(var(--header-h)+24px)]">
          <div>
            <h2 className="display-3 text-xl">{about.location.title}</h2>
            <address className="mt-3 flex flex-col gap-2 text-sm not-italic">
              <span className="flex gap-3">
                <MapPin className="size-4 shrink-0 text-accent-text" />
                <span>
                  {company.address.street} – {company.address.district}
                  <br />
                  {company.address.city} – {company.address.state}
                  <br />
                  CEP: {company.address.cep}
                </span>
              </span>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-strong">
                <MessageCircle className="size-4 shrink-0 text-accent-text" /> {company.whatsapp.display}
              </a>
              <a href={`mailto:${company.email}`} className="flex gap-3 break-all hover:text-strong">
                <Mail className="size-4 shrink-0 text-accent-text" /> {company.email}
              </a>
            </address>
          </div>
          <div className="border-t border-line pt-6">
            <h2 className="display-3 text-xl">{about.why.title}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {about.why.items.map((item) => (
                <li key={item.text} className="flex gap-3">
                  <Check className="size-4 shrink-0 text-accent-text" /> {item.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Missão, Visão, Valores */}
      <section className="border-y border-line bg-raised">
        <div ref={revealMvv} className="reveal container-page grid md:grid-cols-3">
          {[about.mission, about.vision].map((block, i) => (
            <div key={block.title} className={`flex flex-col gap-4 py-12 md:py-16 ${i > 0 ? "border-t border-line md:border-t-0 md:border-l md:pl-10" : "md:pr-10"}`}>
              <p className="label">{String(i + 1).padStart(2, "0")}</p>
              <h2 className="display-3">{block.title}</h2>
              <p className="text-lg leading-relaxed">{block.text}</p>
            </div>
          ))}
          <div className="flex flex-col gap-4 border-t border-line py-12 md:border-t-0 md:border-l md:py-16 md:pl-10">
            <p className="label">03</p>
            <h2 className="display-3">{about.values.title}</h2>
            <ul className="flex flex-wrap gap-2">
              {about.values.items.map((v) => (
                <li key={v} className="rounded-pill border border-line-strong px-3.5 py-1.5 text-sm text-strong">
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sustentabilidade */}
      <section className="bg-deep py-[var(--section)] text-on-deep">
        <div className="container-page grid gap-12 md:grid-cols-2 md:items-center">
          <div className="flex flex-col gap-5">
            <p className="label !text-on-deep-muted">Responsabilidade</p>
            <h2 className="display-2 !text-white">{about.sustainability.title}</h2>
            {about.sustainability.paragraphs.map((p) => (
              <p key={p.text.slice(0, 20)} className="text-lg text-on-deep-muted">
                {p.pendente ? <Pendente note={p.pendente}>{p.text}</Pendente> : p.text}
              </p>
            ))}
            <div>
              <LinkButton to="/produtos" variant="inverse">
                {about.sustainability.cta}
              </LinkButton>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-line-deep">
            {about.sustainability.pillars.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i];
              return (
                <li key={pillar.title} className="flex flex-col gap-3 bg-deep p-6">
                  <Icon className="size-7 stroke-[1.4] text-signal" />
                  <h3 className="font-sans text-base font-semibold tracking-normal !text-white">{pillar.title}</h3>
                  <p className="text-sm text-on-deep-muted">{pillar.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-[var(--section)] text-center">
        <h2 className="display-2 mx-auto max-w-3xl">{about.cta.title}</h2>
        <p className="lead mx-auto mt-5 max-w-2xl">{about.cta.text}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton to="/produtos" size="lg">
            {about.cta.primary}
          </LinkButton>
          <AnchorButton variant="secondary" size="lg" external href={whatsappLink("Olá! Gostaria de falar com um consultor da WSN.")}>
            {about.cta.secondary}
          </AnchorButton>
        </div>
      </section>
    </>
  );
}
