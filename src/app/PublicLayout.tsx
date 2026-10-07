import { ClipboardList, Headset, Mail, MapPin, Menu, MessageCircle, Search, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { company, whatsappLink } from "@shared/company";
import { footer } from "@/content/site";
import { cn } from "@/lib/cn";
import { useQuote, useQuoteCount } from "@/features/quote/store";
import { QuoteSheet } from "@/features/quote/QuoteSheet";
import { categoryIcon, useCatalog, useCatalogIndex } from "@/features/catalog/data";
import { Dialog } from "@/ui/Dialog";
import { Logo } from "@/ui/Logo";
import { Waves } from "@/ui/Waves";
import { SearchDialog } from "./SearchDialog";

const PAGES = [
  { to: "/", label: "Início", end: true },
  { to: "/produtos", label: "Todos os produtos", end: true },
  { to: "/sobre", label: "Nossa História" },
  { to: "/contato", label: "Contato" },
];

export function PublicLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  useCatalog(); // pré-carrega o catálogo para busca e cotação

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  // Atalho "/" abre a busca.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest("input, textarea, select, [contenteditable]");
      if (e.key === "/" && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#conteudo" className="sr-only z-[var(--z-toast)] rounded-md bg-action px-4 py-2 text-action-text focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <AnnouncementBar />
      <Header onSearch={() => setSearchOpen(true)} onMenu={() => setMenuOpen(true)} />
      <main id="conteudo" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <a
        href={whatsappLink("Olá! Vim pelo site da WSN.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar no WhatsApp"
        className="no-print fixed right-4 bottom-4 z-[var(--z-float)] grid size-14 place-items-center rounded-pill bg-whatsapp text-white shadow-lg transition-transform duration-300 hover:scale-105 md:right-6 md:bottom-6"
      >
        <MessageCircle className="size-7" />
      </a>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <QuoteSheet />
    </div>
  );
}

function AnnouncementBar() {
  return (
    <div className="no-print bg-navy text-[13px] text-white">
      <div className="container-page flex h-9 items-center justify-center gap-6 md:justify-between">
        <p className="flex items-center gap-2">
          <Truck className="size-4 text-brand-sky" /> Entregas rápidas para São Paulo e todo o Brasil
        </p>
        <div className="hidden items-center gap-6 md:flex">
          <span className="text-on-deep-muted">Pague com Pix, cartão ou boleto</span>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 font-semibold hover:underline">
            <MessageCircle className="size-4" /> {company.whatsapp.display}
          </a>
        </div>
      </div>
    </div>
  );
}

function Header({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const count = useQuoteCount();
  const pulse = useQuote((s) => s.pulse);
  const openSheet = useQuote((s) => s.openSheet);
  const { data } = useCatalog();
  const { categories } = useCatalogIndex(data);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("no-print sticky top-0 z-[var(--z-header)] bg-white/95 backdrop-blur-md transition-shadow duration-300", scrolled ? "shadow-md" : "shadow-[0_1px_0_var(--hairline)]")}>
      <div className="container-page flex h-[var(--header-h)] items-center gap-4 md:gap-8">
        <Link to="/" aria-label="WSN Distribuidora — início" className="shrink-0">
          <Logo />
        </Link>

        <button
          type="button"
          onClick={onSearch}
          className="hidden h-12 flex-1 items-center gap-3 rounded-pill border border-line-strong bg-sunken/60 px-5 text-[15px] text-muted transition-colors hover:border-navy hover:bg-white md:flex lg:max-w-xl"
        >
          <Search className="size-5 text-navy" />
          Buscar por produto, marca ou referência
          <kbd className="ml-auto rounded-md border border-line-strong bg-white px-2 py-0.5 text-xs font-semibold">/</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1 md:gap-3">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hidden items-center gap-2.5 rounded-pill px-3 py-2 text-sm hover:bg-sunken xl:flex">
            <span className="grid size-9 place-items-center rounded-pill bg-mint text-whatsapp">
              <Headset className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-xs text-muted">Fale com um consultor</span>
              <span className="font-semibold text-strong">{company.whatsapp.display}</span>
            </span>
          </a>
          <button type="button" onClick={onSearch} className="grid size-11 place-items-center rounded-pill text-navy hover:bg-sunken md:hidden" aria-label="Buscar">
            <Search className="size-5" />
          </button>
          <button
            id="quote-button"
            type="button"
            onClick={() => openSheet(true)}
            className="relative inline-flex h-11 items-center gap-2 rounded-pill bg-action pr-4 pl-4 text-sm font-semibold text-action-text shadow-sm transition-colors hover:bg-action-hover"
            aria-label={`Minha cotação, ${count} itens`}
          >
            <ClipboardList className="size-5" />
            <span className="hidden sm:inline">Minha cotação</span>
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center overflow-hidden rounded-pill bg-green px-1.5 text-[11px] font-bold text-white tabular">
                <span key={pulse} className={pulse ? "tick" : undefined}>
                  {count}
                </span>
              </span>
            )}
          </button>
          <button type="button" onClick={onMenu} className="grid size-11 place-items-center rounded-pill text-navy hover:bg-sunken lg:hidden" aria-label="Abrir menu">
            <Menu className="size-6" />
          </button>
        </div>
      </div>

      {/* Barra de categorias (desktop) */}
      <nav aria-label="Categorias" className="hidden border-t border-line lg:block">
        <ul className="container-page flex h-12 items-center gap-1 text-[14px] font-semibold">
          <li>
            <NavLink to="/produtos" end viewTransition className={({ isActive }) => navItem(isActive)}>
              Todos os produtos
            </NavLink>
          </li>
          {categories.map((c) => {
            const Icon = categoryIcon(c.slug);
            return (
              <li key={c.id}>
                <NavLink to={`/produtos/c/${c.slug}`} viewTransition className={({ isActive }) => navItem(isActive)}>
                  <Icon className="size-4 text-accent-text" />
                  {c.name}
                </NavLink>
              </li>
            );
          })}
          <li className="ml-auto">
            <NavLink to="/sobre" viewTransition className={({ isActive }) => navItem(isActive)}>
              Nossa História
            </NavLink>
          </li>
          <li>
            <NavLink to="/contato" viewTransition className={({ isActive }) => navItem(isActive)}>
              Contato
            </NavLink>
          </li>
        </ul>
      </nav>
    </header>
  );
}

const navItem = (active: boolean) =>
  cn(
    "inline-flex h-9 items-center gap-2 rounded-pill px-3.5 transition-colors",
    active ? "bg-sky text-navy" : "text-body hover:bg-sunken hover:text-navy",
  );

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useCatalog();
  const { categories, countByCategory } = useCatalogIndex(data);
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title="Menu">
      <nav aria-label="Menu" className="flex flex-col gap-6">
        <ul className="flex flex-col gap-1">
          {PAGES.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.end}
                onClick={onClose}
                className={({ isActive }) => cn("flex rounded-md px-4 py-3 text-lg font-bold", isActive ? "bg-sky text-navy" : "text-strong hover:bg-sunken")}
              >
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div>
          <p className="label mb-2 px-4">Categorias</p>
          <ul className="grid grid-cols-2 gap-2">
            {categories.map((c) => {
              const Icon = categoryIcon(c.slug);
              return (
                <li key={c.id}>
                  <Link to={`/produtos/c/${c.slug}`} onClick={onClose} className="flex h-full flex-col gap-2 rounded-md bg-sunken p-4 hover:bg-sky">
                    <Icon className="size-6 text-accent-text" />
                    <span className="text-sm font-bold text-strong">{c.name}</span>
                    <span className="text-xs text-muted">{countByCategory.get(c.id)} itens</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md bg-mint p-4 font-semibold text-strong">
          <MessageCircle className="size-5 text-whatsapp" /> {company.whatsapp.display} · WhatsApp
        </a>
      </nav>
    </Dialog>
  );
}

const SERVICE_ICONS = [Truck, ShieldCheck, Headset];

function Footer() {
  return (
    <footer className="no-print mt-[var(--section)]">
      <Waves to="#072a4f" />
      <div className="bg-navy-deep text-on-deep">
        <div className="container-page grid gap-6 border-b border-line-deep py-10 sm:grid-cols-3">
          {footer.services.map((s, i) => {
            const Icon = SERVICE_ICONS[i];
            return (
              <div key={s.title} className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-pill bg-white/10">
                  <Icon className="size-6 text-brand-sky" />
                </span>
                <div>
                  <p className="font-bold text-white">{s.title}</p>
                  <p className="text-sm text-on-deep-muted">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="flex flex-col items-start gap-4">
            <span className="rounded-md bg-white px-4 py-3">
              <Logo className="w-[140px]" />
            </span>
            <p className="text-sm font-semibold text-brand-sky">{footer.since}</p>
            <p className="max-w-sm text-sm text-on-deep-muted">{footer.blurb}</p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">{footer.contactTitle}</h2>
            <address className="flex flex-col gap-3 text-sm text-on-deep-muted not-italic">
              <span className="flex gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-sky" />
                {company.address.street} – {company.address.district}, {company.address.city} – {company.address.state}
              </span>
              <a href={`mailto:${company.email}`} className="flex gap-2 break-all hover:text-white">
                <Mail className="mt-0.5 size-4 shrink-0 text-brand-sky" /> {company.email}
              </a>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="flex gap-2 hover:text-white">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-sky" /> WhatsApp {company.whatsapp.display}
              </a>
            </address>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">{footer.institutionalTitle}</h2>
            <ul className="flex flex-col gap-2.5 text-sm text-on-deep-muted">
              <li><Link to="/sobre" className="hover:text-white">Sobre nós</Link></li>
              <li><Link to="/sobre" className="hover:text-white">Nossa história</Link></li>
              <li><Link to="/privacidade" className="hover:text-white">Política de privacidade</Link></li>
              <li><Link to="/termos" className="hover:text-white">Termos de uso</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-line-deep">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-on-deep-muted md:flex-row md:items-center md:justify-between">
            <p>
              {company.legalName} - CNPJ: {company.cnpj}
            </p>
            <p>© {new Date().getFullYear()} {company.name}. Todos os direitos reservados.</p>
            <a href={footer.creditUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              {footer.credit}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
