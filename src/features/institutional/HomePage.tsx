import { ArrowRight, Award, Check, ClipboardCheck, Factory, Headset, MessageCircle, PackageSearch, Search, Send, Truck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { PublicProduct } from "@shared/catalog";
import { company, whatsappLink } from "@shared/company";
import { home, showcase } from "@/content/site";
import { cn } from "@/lib/cn";
import { useDocumentTitle, useReveal } from "@/lib/hooks";
import { AnchorButton, LinkButton } from "@/ui/Button";
import { Pendente, SectionHeading } from "@/ui/bits";
import { Waves } from "@/ui/Waves";
import { categoryIcon, useCatalog, useCatalogIndex } from "../catalog/data";
import { ProductCard } from "../catalog/ProductCard";

const FEATURE_ICONS = [Truck, Factory, Award, Headset];
const STEP_ICONS = [PackageSearch, Send, ClipboardCheck];

export function HomePage() {
  useDocumentTitle("");
  const { data } = useCatalog();
  const idx = useCatalogIndex(data);
  const pick = (refs: string[]) => refs.map((r) => idx.productByRef.get(r)).filter((p): p is PublicProduct => Boolean(p));

  return (
    <>
      {/* 1 — Hero: o produto é o herói */}
      <section className="bg-hero relative overflow-hidden">
        <div className="container-page grid items-center gap-10 pt-10 pb-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-10">
          <div className="flex flex-col gap-6 [animation:rise-in_var(--dur-reveal)_var(--ease-out)]">
            <p className="inline-flex w-fit items-center gap-2 rounded-pill bg-white px-3.5 py-1.5 text-[13px] font-semibold text-navy shadow-sm">
              <span className="size-2 rounded-pill bg-green" aria-hidden /> {home.hero.eyebrow}
            </p>
            <h1 className="display-1 max-w-[15ch]">
              Organização, <span className="whitespace-nowrap text-accent-text">bem-estar</span> e produtividade em cada ambiente.
            </h1>
            <p className="lead max-w-lg">{home.hero.lead}.</p>
            <HeroSearch />
            <div className="flex flex-wrap gap-3">
              <LinkButton to="/produtos" size="lg" viewTransition>
                {home.hero.ctaPrimary} <ArrowRight className="size-4" />
              </LinkButton>
              <AnchorButton variant="secondary" size="lg" external href={whatsappLink("Olá! Gostaria de uma cotação.")}>
                <MessageCircle className="size-4 text-whatsapp" /> Falar no WhatsApp
              </AnchorButton>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-1 text-sm text-body">
              {["Resposta em até 24 horas", "Entrega para todo o Brasil", "Pix, cartão ou boleto"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="grid size-5 place-items-center rounded-pill bg-green text-white">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <HeroShowcase products={pick(showcase.hero)} />
        </div>
        <Waves to="#ffffff" />
      </section>

      {/* 2 — Categorias com foto */}
      <section className="container-page pt-6 pb-[var(--section)]" aria-labelledby="categorias">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <SectionHeading label="Portfólio completo" title={<span id="categorias">{home.categories.title}</span>} lead={home.categories.lead} />
          <Link to="/produtos" viewTransition className="inline-flex items-center gap-2 font-semibold text-navy hover:underline">
            Ver todos os {data?.products.length ?? ""} produtos <ArrowRight className="size-4" />
          </Link>
        </div>
        <ul className="-mx-[var(--gutter)] mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[var(--gutter)] pb-4 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-5">
          {idx.categories.map((c) => {
            const Icon = categoryIcon(c.slug);
            const covers = pick(showcase.categoryCovers[c.slug] ?? []).slice(0, 3);
            return (
              <li key={c.id} className="w-[72vw] max-w-[280px] shrink-0 snap-start md:w-auto md:max-w-none">
                <Link to={`/produtos/c/${c.slug}`} viewTransition className="card card-hover group flex h-full flex-col overflow-hidden">
                  <div className="relative grid aspect-[4/3] place-items-center bg-sky">
                    <CoverStack products={covers} />
                    <span className="absolute top-3 left-3 grid size-9 place-items-center rounded-pill bg-white shadow-sm">
                      <Icon className="size-5 text-accent-text" />
                    </span>
                  </div>
                  <div className="flex flex-1 items-end justify-between gap-3 p-5">
                    <div>
                      <h3 className="text-[17px] font-bold">{c.name}</h3>
                      <p className="text-sm text-muted">{idx.countByCategory.get(c.id)} produtos</p>
                    </div>
                    <span className="grid size-9 shrink-0 place-items-center rounded-pill bg-sunken text-navy transition-colors group-hover:bg-navy group-hover:text-white">
                      <ArrowRight className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 3 — Mais pedidos */}
      <section className="bg-sunken/70 py-[var(--section)]" aria-labelledby="destaques">
        <div className="container-page">
          <Reveal className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <SectionHeading label="Vitrine" title={<span id="destaques">{showcase.featuredTitle}</span>} lead={showcase.featuredLead} />
            <LinkButton to="/produtos" variant="secondary" viewTransition>
              Ver catálogo completo <ArrowRight className="size-4" />
            </LinkButton>
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {pick(showcase.featured).map((p) => (
              <ProductCard key={p.id} product={p} categoryName={idx.categoryById.get(p.categoryId)?.name} brandName={p.brandId ? idx.brandById.get(p.brandId)?.name : null} />
            ))}
          </ul>
        </div>
      </section>

      {/* 4 — Por que a WSN (faixa azul-céu) */}
      <section className="py-[var(--section)]" aria-labelledby="porque">
        <div className="container-page">
          <Reveal>
            <SectionHeading align="center" label={`Há ${home.stats[0].value} anos no mercado`} title={<span id="porque">{home.why.title}</span>} lead={home.why.lead} />
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            {home.why.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <li key={f.title} className="flex flex-col items-center gap-2 rounded-lg bg-sky px-3 py-6 text-center md:gap-3 md:px-6 md:py-8">
                  <span className="grid size-12 place-items-center rounded-pill bg-white shadow-sm md:size-16">
                    <Icon className="size-7 text-navy" strokeWidth={1.75} />
                  </span>
                  <h3 className="text-[15px] font-bold md:text-lg">{f.title}</h3>
                  <p className="text-sm text-muted">{f.desc}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* 5 — Como funciona */}
      <section className="container-page pb-[var(--section)]" aria-labelledby="como">
        <div className="relative overflow-hidden rounded-xl bg-mint px-6 py-12 md:px-12 md:py-16">
          <Reveal>
            <SectionHeading align="center" label="Cotação online" title={<span id="como">{showcase.stepsTitle}</span>} />
          </Reveal>
          <ol className="relative mt-10 grid gap-5 md:grid-cols-3">
            {showcase.steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={s.title} className="card flex flex-col gap-3 p-6">
                  <div className="flex items-center justify-between">
                    <span className="grid size-12 place-items-center rounded-pill bg-green text-white">
                      <Icon className="size-6" />
                    </span>
                    <span className="text-4xl font-extrabold text-line-strong">{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="text-sm text-body">{s.text}</p>
                </li>
              );
            })}
          </ol>
          <div className="mt-8 flex justify-center">
            <LinkButton to="/produtos" size="lg" viewTransition>
              Começar minha cotação <ArrowRight className="size-4" />
            </LinkButton>
          </div>
        </div>
      </section>

      {/* 6 — Sobre + números */}
      <section className="container-page grid gap-10 pb-[var(--section)] lg:grid-cols-2 lg:items-center" aria-labelledby="sobre">
        <Reveal className="flex flex-col gap-5">
          <SectionHeading label={`Desde ${company.foundedYear}`} title={<span id="sobre">{home.about.title}</span>} />
          {home.about.paragraphs.map((p) => (
            <p key={p.slice(0, 20)} className="text-[17px] leading-relaxed">
              {p}
            </p>
          ))}
          <ul className="flex flex-wrap gap-2">
            {home.about.checks.map((c) => (
              <li key={c} className="flex items-center gap-2 rounded-pill bg-mint px-3.5 py-1.5 text-sm font-semibold text-accent-text">
                <Check className="size-4" /> {c}
              </li>
            ))}
          </ul>
          <div>
            <LinkButton to="/sobre" variant="secondary" viewTransition>
              {home.about.cta} <ArrowRight className="size-4" />
            </LinkButton>
          </div>
        </Reveal>
        <dl className="grid grid-cols-2 gap-4">
          {home.stats.map((s, i) => (
            <div key={s.label} className={cn("flex flex-col gap-1 rounded-lg p-6 md:p-8", i === 0 ? "bg-navy text-white" : "bg-sky")}>
              <dt className={cn("order-2 text-sm font-semibold", i === 0 ? "text-on-deep-muted" : "text-muted")}>{s.label}</dt>
              <dd className={cn("order-1 text-4xl font-extrabold tracking-tight tabular md:text-5xl", i === 0 ? "text-white" : "text-navy")}>
                {s.pendente ? <Pendente note={s.pendente}>{s.value}</Pendente> : s.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* 7 — Marcas (em cor, como as grandes marcas do setor fazem) */}
      <section className="border-y border-line bg-white py-[var(--section)]" aria-labelledby="marcas">
        <div className="container-page">
          <Reveal>
            <SectionHeading align="center" label="Parceiros" title={<span id="marcas">{home.brands.title}</span>} lead={home.brands.lead} />
          </Reveal>
          <ul className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {(data?.brands ?? [])
              .filter((b) => b.logoPath)
              .map((b) => (
                <li key={b.id} className="grid h-20 place-items-center rounded-md bg-white px-3 shadow-sm ring-1 ring-line transition-shadow hover:shadow-md">
                  <img src={b.logoPath!} alt={b.name} loading="lazy" className="max-h-10 w-auto object-contain" />
                </li>
              ))}
          </ul>
        </div>
      </section>

      {/* 8 — Cobertura */}
      <section className="container-page pt-[var(--section)]">
        <div className="relative overflow-hidden rounded-xl bg-navy text-white">
          <div className="grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-14">
            <div>
              <h2 className="display-2 !text-white">{home.coverage.title}</h2>
              <p className="mt-3 max-w-xl text-lg text-on-deep-muted">{home.coverage.lead}</p>
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-on-deep-muted">
                {home.payment.label}
                {home.payment.methods.map((m) => (
                  <span key={m} className="rounded-pill bg-white/10 px-3 py-1 font-semibold text-white">
                    {m}
                  </span>
                ))}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <LinkButton to="/produtos" size="lg" variant="inverse" viewTransition>
                {home.coverage.cta} <ArrowRight className="size-4" />
              </LinkButton>
              <AnchorButton variant="whatsapp" size="lg" external href={whatsappLink("Olá! Gostaria de uma cotação.")}>
                <MessageCircle className="size-4" /> WhatsApp
              </AnchorButton>
            </div>
          </div>
          <Waves to="#0b3a6b" className="pointer-events-none absolute inset-x-0 bottom-0 h-10 opacity-40 md:h-16" flip />
        </div>
      </section>
    </>
  );
}

/**
 * Vitrine do hero em mosaico (bento): produtos reais em tiles brancos alinhados,
 * sem sobreposição. Ordem de `showcase.hero`: Veja, Ypê, luvas nitrílicas, papel, luvas amarelas, álcool gel.
 */
function HeroShowcase({ products }: { products: PublicProduct[] }) {
  const [veja, ype, nitrilica, papel, amarela, alcool] = products;
  const tiles: { p?: PublicProduct; cls: string; label?: string }[] = [
    { p: nitrilica, cls: "col-span-2 row-span-2", label: "EPIs" },
    { p: ype, cls: "row-span-2", label: "Limpeza" },
    { p: papel, cls: "", label: "Papéis" },
    { p: alcool, cls: "" },
    { p: amarela, cls: "" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden>
      <div className="absolute -inset-6 rounded-xl bg-gradient-to-br from-[#dcebf9] via-[#eef5fc] to-[#eaf4e2] md:-inset-8" />
      <div className="relative grid aspect-[6/5] grid-cols-3 grid-rows-3 gap-3 md:gap-4">
        {tiles.map(({ p, cls, label }, i) =>
          p ? (
            <div key={p.ref} className={cn("relative overflow-hidden rounded-lg bg-white shadow-sm", cls)}>
              <img src={p.imagePath ?? ""} alt="" loading={i < 2 ? "eager" : "lazy"} className="absolute inset-[9%] size-[82%] object-contain" />
              {label && <span className="absolute top-3 left-3 rounded-pill bg-sky px-2.5 py-1 text-[11px] font-bold text-navy">{label}</span>}
            </div>
          ) : null,
        )}
      </div>
      {veja && (
        <div className="float absolute -top-10 -right-6 hidden size-20 rounded-lg bg-white shadow-md xl:block">
          <img src={veja.imagePath ?? ""} alt="" className="absolute inset-[10%] size-[80%] object-contain" />
        </div>
      )}
      <div className="absolute -bottom-7 left-4 flex items-center gap-3 rounded-pill bg-white py-2 pr-5 pl-2 shadow-md md:-left-6">
        <span className="grid size-9 place-items-center rounded-pill bg-green text-white">
          <Check className="size-5" strokeWidth={3} />
        </span>
        <span className="text-sm leading-tight">
          <strong className="block text-strong">Cotação enviada</strong>
          <span className="text-muted">resposta em até 24h</span>
        </span>
      </div>
    </div>
  );
}

function CoverStack({ products }: { products: PublicProduct[] }) {
  if (!products.length) return null;
  const [main, ...rest] = products;
  return (
    <div className="relative h-[78%] w-[86%]">
      {rest.map((p, i) => (
        <img
          key={p.ref}
          src={p.imagePath ?? ""}
          alt=""
          loading="lazy"
          className={cn("absolute bottom-[4%] h-[62%] w-[42%] rounded-md bg-white object-contain p-2 shadow-sm", i === 0 ? "left-0 -rotate-6" : "right-0 rotate-6")}
        />
      ))}
      <img
        src={main.imagePath ?? ""}
        alt=""
        loading="lazy"
        className="absolute inset-x-[22%] top-0 h-[92%] w-[56%] rounded-md bg-white object-contain p-2 shadow-md transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-[1.03]"
      />
    </div>
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
      className="relative max-w-xl"
    >
      <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-navy" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="O que você precisa? Ex.: luva nitrílica"
        aria-label="Buscar produtos por nome, marca ou referência"
        className="h-14 w-full rounded-pill border border-line-strong bg-white pr-32 pl-13 text-base text-strong shadow-sm placeholder:text-muted focus:border-navy focus:ring-4 focus:ring-[#d6e8f8] focus:outline-none"
      />
      <button type="submit" className="absolute top-1.5 right-1.5 h-11 rounded-pill bg-green px-6 text-sm font-bold text-white transition-colors hover:bg-[#358510]">
        Buscar
      </button>
    </form>
  );
}
