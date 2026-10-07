import { ArrowRight, ArrowUpRight, Award, Check, Factory, Headset, Lock, MapPin, Search, Truck } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { company } from "@shared/company";
import { home } from "@/content/site";
import { cn } from "@/lib/cn";
import { useDocumentTitle, useReveal } from "@/lib/hooks";
import { LinkButton } from "@/ui/Button";
import { Pendente, SectionHeading } from "@/ui/bits";
import { categoryIcon, indexLabel, useCatalog, useCatalogIndex } from "../catalog/data";
import { OrbitStage } from "./OrbitHero";

const FEATURE_ICONS = [Truck, Factory, Award, Headset];

export function HomePage() {
  useDocumentTitle("");
  const heroRef = useRef<HTMLElement>(null);
  const { data } = useCatalog();
  const idx = useCatalogIndex(data);

  return (
    <>
      {/* 1 — Hero */}
      <section ref={heroRef} className="relative overflow-hidden border-b border-line">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" aria-hidden />
        <div className="container-page relative grid min-h-[calc(100svh-var(--header-h))] items-center gap-10 py-12 md:grid-cols-[1.15fr_1fr] md:py-16">
          <div className="flex flex-col gap-7 [animation:rise-in_var(--dur-reveal)_var(--ease-out)]">
            <p className="label flex items-center gap-3">
              <span className="inline-block size-2 rounded-pill bg-green" aria-hidden />
              {home.hero.eyebrow}
            </p>
            <h1 className="display-1 max-w-[13ch]">{home.hero.title}</h1>
            <p className="lead max-w-lg">{home.hero.lead}</p>
            <HeroSearch />
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/produtos" size="lg" viewTransition>
                {home.hero.ctaPrimary} <ArrowRight className="size-4" />
              </LinkButton>
              <LinkButton to="/cotacao" size="lg" variant="secondary" viewTransition>
                {home.hero.ctaSecondary}
              </LinkButton>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[560px]">
            <OrbitStage trackRef={heroRef} />
          </div>
        </div>
      </section>

      {/* 2 — Números */}
      <section aria-label="WSN em números" className="border-b border-line bg-raised">
        <dl className="container-page grid grid-cols-2 md:grid-cols-4">
          {home.stats.map((s, i) => (
            <div key={s.label} className={cn("flex flex-col gap-1 py-8 md:py-10", i % 2 === 1 && "border-l border-line pl-6", i >= 2 && "border-t border-line md:border-t-0", i > 0 && "md:border-l md:pl-8")}>
              <dt className="label order-2">{s.label}</dt>
              <dd className="order-1 font-display text-5xl font-semibold tracking-[-0.04em] text-strong tabular [font-variation-settings:'wdth'_112] md:text-6xl">
                {s.pendente ? <Pendente note={s.pendente}>{s.value}</Pendente> : s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 3 — Categorias */}
      <section className="container-page py-[var(--section)]" aria-labelledby="categorias">
        <Reveal>
          <SectionHeading index="01" label="Portfólio" title={<span id="categorias">{home.categories.title}</span>} lead={home.categories.lead} />
        </Reveal>
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {idx.categories.map((c, i) => {
            const Icon = categoryIcon(c.slug);
            const count = idx.countByCategory.get(c.id) ?? 0;
            return (
              <li key={c.id}>
                <Link
                  to={`/produtos/c/${c.slug}`}
                  viewTransition
                  className="group relative flex h-full min-h-56 flex-col gap-6 bg-raised p-7 transition-colors duration-300 ease-out hover:bg-deep"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-sm text-muted transition-colors group-hover:text-on-deep-muted">{indexLabel(i)}</span>
                    <ArrowUpRight className="size-5 text-muted transition-[color,transform] duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-signal" />
                  </div>
                  <Icon className="size-9 stroke-[1.25] text-accent-text transition-colors group-hover:text-signal" />
                  <div className="mt-auto">
                    <h3 className="display-3 transition-colors group-hover:text-white">{c.name}</h3>
                    <p className="mt-1 text-sm text-muted transition-colors group-hover:text-on-deep-muted">
                      {c.description && `${c.description} · `}
                      <span className="font-mono tabular">{count}</span> itens
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
          {/* Fecha a grade (sem célula vazia) com o atalho para o catálogo inteiro */}
          {idx.categories.length % 3 !== 0 && (
            <li className={cn(idx.categories.length % 3 === 1 && "lg:col-span-2", idx.categories.length % 2 === 1 && "sm:max-lg:col-span-1")}>
              <Link to="/produtos" viewTransition className="group flex h-full min-h-56 flex-col justify-between gap-6 bg-navy p-7 text-white transition-colors hover:bg-navy-deep">
                <span className="font-mono text-sm text-on-deep-muted">{data?.products.length ?? "—"} itens</span>
                <span className="flex items-end justify-between gap-4">
                  <span className="display-3 !text-white">{home.categories.cta}</span>
                  <ArrowRight className="size-6 text-signal transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          )}
        </ul>
      </section>

      {/* 4 — Por que a WSN */}
      <section className="border-y border-line bg-raised py-[var(--section)]" aria-labelledby="porque">
        <div className="container-page">
          <Reveal>
            <SectionHeading index="02" label="Diferenciais" title={<span id="porque">{home.why.title}</span>} lead={home.why.lead} />
          </Reveal>
          <ul className="mt-12 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
            {home.why.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <li key={f.title} className={cn("flex flex-col gap-4 border-b border-line py-8 pr-6 lg:border-b-0", i > 0 && "lg:border-l lg:pl-8", i % 2 === 1 && "sm:border-l sm:pl-8")}>
                  <Icon className="size-7 stroke-[1.4] text-accent-text" />
                  <h3 className="font-display text-xl tracking-[-0.02em]">{f.title}</h3>
                  <p className="text-muted">{f.desc}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 5 — Sobre */}
      <section className="container-page grid gap-12 py-[var(--section)] lg:grid-cols-[1fr_1fr] lg:items-center" aria-labelledby="sobre">
        <Reveal className="flex flex-col gap-6">
          <SectionHeading index="03" label="Desde 2006" title={<span id="sobre">{home.about.title}</span>} />
          {home.about.paragraphs.map((p) => (
            <p key={p.slice(0, 20)} className="text-lg leading-relaxed text-body">
              {p}
            </p>
          ))}
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {home.about.checks.map((c) => (
              <li key={c} className="flex items-center gap-2 text-strong">
                <Check className="size-4 text-accent-text" /> {c}
              </li>
            ))}
          </ul>
          <div>
            <LinkButton to="/sobre" variant="secondary" viewTransition>
              {home.about.cta} <ArrowRight className="size-4" />
            </LinkButton>
          </div>
        </Reveal>
        <Reveal className="relative overflow-hidden rounded-lg bg-deep p-8 text-on-deep md:p-12">
          <p className="label !text-on-deep-muted">Fundada em</p>
          <p className="font-display text-[clamp(96px,14vw,200px)] leading-none font-semibold tracking-[-0.06em] text-white tabular [font-variation-settings:'wdth'_120]">
            {company.foundedYear}
          </p>
          <div className="mt-8 grid gap-4 border-t border-line-deep pt-6 sm:grid-cols-2">
            <p className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-signal" />
              {company.address.street} – {company.address.district}, {company.address.city} – {company.address.state}
            </p>
            <p className="flex items-start gap-3 text-sm">
              <Truck className="mt-0.5 size-4 shrink-0 text-signal" />
              {home.coverage.lead}
            </p>
          </div>
        </Reveal>
      </section>

      {/* 6 — Marcas */}
      <section className="border-y border-line bg-raised py-[var(--section)]" aria-labelledby="marcas">
        <div className="container-page">
          <Reveal>
            <SectionHeading index="04" label="Parceiros" title={<span id="marcas">{home.brands.title}</span>} lead={home.brands.lead} />
          </Reveal>
        </div>
        <BrandMarquee logos={(data?.brands ?? []).filter((b) => b.logoPath)} />
      </section>

      {/* 7 — Cobertura */}
      <section className="container-page py-[var(--section)]">
        <div className="relative grid gap-8 overflow-hidden rounded-lg bg-navy p-8 text-white md:grid-cols-[1fr_auto] md:items-center md:p-14">
          <div className="grid-lines pointer-events-none absolute inset-0 opacity-20 invert" aria-hidden />
          <div className="relative">
            <h2 className="display-2 !text-white">{home.coverage.title}</h2>
            <p className="mt-4 max-w-xl text-lg text-on-deep-muted">{home.coverage.lead}</p>
          </div>
          <LinkButton to="/produtos" size="lg" variant="inverse" className="relative" viewTransition>
            {home.coverage.cta} <ArrowRight className="size-4" />
          </LinkButton>
        </div>
      </section>

      {/* 8 — Pagamento e segurança */}
      <section className="border-t border-line">
        <div className="container-page flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-medium text-strong">{home.payment.label}</span>
            {home.payment.methods.map((m) => (
              <span key={m} className="rounded-pill border border-line-strong px-3 py-1 text-sm">
                {m}
              </span>
            ))}
            <span className="text-sm text-muted">
              {home.payment.pixTitle} <strong className="text-strong">{home.payment.pixLead}</strong>
            </span>
          </div>
          <p className="flex items-center gap-2 text-sm text-ok">
            <Lock className="size-4" /> {home.payment.secure}
          </p>
        </div>
      </section>
    </>
  );
}

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={cn("reveal", className)}>
      {children}
    </div>
  );
}

function HeroSearch() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        navigate(q.trim() ? `/produtos?q=${encodeURIComponent(q.trim())}` : "/produtos", { viewTransition: true });
      }}
      className="group relative max-w-lg"
    >
      <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Luva nitrílica, saco de lixo 100 L, Ref. 0038…"
        aria-label="Buscar produtos por nome ou referência"
        className="h-14 w-full rounded-pill border border-line-strong bg-raised pr-28 pl-13 text-base text-strong placeholder:text-muted focus:border-action focus:outline-none"
      />
      <button type="submit" className="absolute top-1.5 right-1.5 h-11 rounded-pill bg-action px-5 text-sm font-medium text-action-text transition-colors hover:bg-action-hover">
        Buscar
      </button>
    </form>
  );
}

function BrandMarquee({ logos }: { logos: { id: number; name: string; logoPath: string | null }[] }) {
  if (!logos.length) return null;
  const row = [...logos, ...logos];
  return (
    <div className="marquee mt-12 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <ul className="marquee-track flex w-max items-center gap-6 motion-reduce:flex-wrap motion-reduce:justify-center">
        {row.map((b, i) => (
          <li
            key={`${b.id}-${i}`}
            aria-hidden={i >= logos.length || undefined}
            className="grid h-24 w-44 place-items-center rounded-md border border-line bg-white px-6 transition-colors hover:border-line-strong motion-reduce:[&:nth-child(n+10)]:hidden"
          >
            <img src={b.logoPath!} alt={b.name} loading="lazy" className="max-h-12 w-auto object-contain grayscale transition-[filter] duration-300 hover:grayscale-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
