import { Check, Eye, Factory, Gem, Leaf, Mail, MapPin, MessageCircle, Recycle, Target, Truck } from "lucide-react";
import { company, whatsappLink } from "@shared/company";
import { about } from "@/content/site";
import { useDocumentTitle, useReveal } from "@/lib/hooks";
import { AnchorButton, LinkButton } from "@/ui/Button";
import { Pendente } from "@/ui/bits";
import { PageHeader } from "@/ui/PageHeader";

const PILLAR_ICONS = [Leaf, Recycle, Truck, Factory];

export function AboutPage() {
  useDocumentTitle(about.title);
  const revealMvv = useReveal<HTMLDivElement>();

  return (
    <>
      <PageHeader eyebrow={`Desde ${company.foundedYear} · São Paulo`} title={about.title} />

      <section className="container-page grid gap-10 pt-4 pb-[var(--section)] lg:grid-cols-[1.6fr_1fr]">
        <div className="flex max-w-2xl flex-col gap-5 text-[17px] leading-relaxed">
          {about.paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? "text-xl leading-relaxed font-medium text-strong" : ""}>
              {p}
            </p>
          ))}
        </div>

        <aside className="card flex flex-col gap-6 self-start p-6 lg:sticky lg:top-[calc(var(--header-h)+70px)]">
          <div>
            <h2 className="text-lg font-bold">{about.location.title}</h2>
            <address className="mt-3 flex flex-col gap-2.5 text-sm not-italic">
              <span className="flex gap-3">
                <MapPin className="size-4 shrink-0 text-accent-text" />
                <span>
                  {company.address.street} – {company.address.district}
                  <br />
                  {company.address.city} – {company.address.state} · CEP: {company.address.cep}
                </span>
              </span>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex gap-3 hover:text-navy">
                <MessageCircle className="size-4 shrink-0 text-accent-text" /> {company.whatsapp.display}
              </a>
              <a href={`mailto:${company.email}`} className="flex gap-3 break-all hover:text-navy">
                <Mail className="size-4 shrink-0 text-accent-text" /> {company.email}
              </a>
            </address>
          </div>
          <div className="rounded-md bg-mint p-5">
            <h2 className="text-lg font-bold">{about.why.title}</h2>
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {about.why.items.map((item) => (
                <li key={item.text} className="flex gap-3">
                  <span className="grid size-5 shrink-0 place-items-center rounded-pill bg-green text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      {/* Missão, Visão, Valores */}
      <section className="bg-sky py-[var(--section)]">
        <div ref={revealMvv} className="reveal container-page grid gap-4 md:grid-cols-3">
          {[
            { ...about.mission, Icon: Target },
            { ...about.vision, Icon: Eye },
          ].map(({ title, text, Icon }) => (
            <div key={title} className="card flex flex-col gap-4 p-8">
              <span className="grid size-12 place-items-center rounded-pill bg-navy text-white">
                <Icon className="size-6" />
              </span>
              <h2 className="display-3 text-2xl">{title}</h2>
              <p className="leading-relaxed">{text}</p>
            </div>
          ))}
          <div className="card flex flex-col gap-4 p-8">
            <span className="grid size-12 place-items-center rounded-pill bg-green text-white">
              <Gem className="size-6" />
            </span>
            <h2 className="display-3 text-2xl">{about.values.title}</h2>
            <ul className="flex flex-wrap gap-2">
              {about.values.items.map((v) => (
                <li key={v} className="rounded-pill bg-sky px-3.5 py-1.5 text-sm font-semibold text-navy">
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Sustentabilidade */}
      <section className="container-page pt-[var(--section)]">
        <div className="grid gap-10 overflow-hidden rounded-xl bg-mint p-8 md:grid-cols-2 md:items-center md:p-14">
          <div className="flex flex-col gap-5">
            <p className="eyebrow">Responsabilidade</p>
            <h2 className="display-2">{about.sustainability.title}</h2>
            {about.sustainability.paragraphs.map((p) => (
              <p key={p.text.slice(0, 20)} className="text-[17px] leading-relaxed">
                {p.pendente ? <Pendente note={p.pendente}>{p.text}</Pendente> : p.text}
              </p>
            ))}
            <div>
              <LinkButton to="/produtos">{about.sustainability.cta}</LinkButton>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {about.sustainability.pillars.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i];
              return (
                <li key={pillar.title} className="card flex flex-col gap-2 p-5">
                  <Icon className="size-7 text-accent-text" strokeWidth={1.75} />
                  <h3 className="text-[15px] font-bold">{pillar.title}</h3>
                  <p className="text-sm text-muted">{pillar.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pt-[var(--section)] text-center">
        <h2 className="display-2 mx-auto max-w-3xl">{about.cta.title}</h2>
        <p className="lead mx-auto mt-4 max-w-2xl text-muted">{about.cta.text}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton to="/produtos" size="lg">
            {about.cta.primary}
          </LinkButton>
          <AnchorButton variant="secondary" size="lg" external href={whatsappLink("Olá! Gostaria de falar com um consultor da WSN.")}>
            <MessageCircle className="size-4 text-whatsapp" /> {about.cta.secondary}
          </AnchorButton>
        </div>
      </section>
    </>
  );
}
