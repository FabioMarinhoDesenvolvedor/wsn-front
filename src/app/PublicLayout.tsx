import { ClipboardList, Headset, Menu, MessageCircle, Search, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { company, whatsappLink } from "@shared/company";
import { footer } from "@/content/site";
import { cn } from "@/lib/cn";
import { useQuote, useQuoteCount } from "@/features/quote/store";
import { QuoteSheet } from "@/features/quote/QuoteSheet";
import { useCatalog } from "@/features/catalog/data";
import { Dialog } from "@/ui/Dialog";
import { Logo } from "@/ui/Logo";
import { SearchDialog } from "./SearchDialog";

const NAV = [
  { to: "/", label: "Início", end: true },
  { to: "/produtos", label: "Produtos" },
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

  // Atalho "/" abre a busca (padrão de catálogos técnicos).
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
        className="no-print fixed right-4 bottom-4 z-[var(--z-float)] grid size-14 place-items-center rounded-pill bg-whatsapp text-white shadow-[0_8px_24px_rgb(18_140_74/0.35)] transition-transform duration-300 hover:scale-105 md:right-6 md:bottom-6"
      >
        <MessageCircle className="size-7" />
      </a>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <QuoteSheet />
    </div>
  );
}

function Header({ onSearch, onMenu }: { onSearch: () => void; onMenu: () => void }) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastY = useRef(0);
  const count = useQuoteCount();
  const pulse = useQuote((s) => s.pulse);
  const openSheet = useQuote((s) => s.openSheet);

  // Some ao descer e volta ao subir (comportamento do site v1, mantido).
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      setScrolled(y > 8);
      if (y < 80) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "no-print sticky top-0 z-[var(--z-header)] border-b transition-[transform,background-color,border-color] duration-300 ease-out",
        scrolled ? "border-line bg-canvas/90 backdrop-blur-md" : "border-transparent bg-canvas",
        hidden && "-translate-y-full",
      )}
    >
      <div className="container-page flex h-[var(--header-h)] items-center gap-6">
        <Link to="/" aria-label="WSN Distribuidora — início" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink
                  to={n.to}
                  end={n.end}
                  viewTransition
                  className={({ isActive }) =>
                    cn(
                      "relative rounded-pill px-3.5 py-2 text-[15px] font-medium transition-colors",
                      isActive ? "text-strong after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-pill after:bg-green" : "text-muted hover:text-strong",
                    )
                  }
                >
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSearch}
            className="hidden h-10 w-64 items-center gap-3 rounded-pill border border-line-strong bg-raised px-4 text-sm text-muted transition-colors hover:border-action md:flex"
          >
            <Search className="size-4" />
            Buscar produto ou Ref.
            <kbd className="ml-auto rounded-sm border border-line px-1.5 font-mono text-[11px]">/</kbd>
          </button>
          <button type="button" onClick={onSearch} className="grid size-10 place-items-center rounded-pill hover:bg-sunken md:hidden" aria-label="Buscar">
            <Search className="size-5" />
          </button>
          <button
            id="quote-button"
            type="button"
            onClick={() => openSheet(true)}
            className="relative inline-flex h-10 items-center gap-2 rounded-pill bg-action pr-4 pl-3.5 text-sm font-medium text-action-text transition-colors hover:bg-action-hover"
            aria-label={`Cotação, ${count} itens`}
          >
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">Cotação</span>
            <span className="relative grid h-5 min-w-5 place-items-center overflow-hidden rounded-pill bg-signal px-1 font-mono text-[11px] text-[#0d1b2a] tabular">
              <span key={pulse} className={pulse ? "tick" : undefined}>
                {count}
              </span>
            </span>
          </button>
          <button type="button" onClick={onMenu} className="grid size-10 place-items-center rounded-pill hover:bg-sunken lg:hidden" aria-label="Abrir menu">
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} variant="sheet" title="Menu">
      <nav aria-label="Menu">
        <ul className="flex flex-col">
          {NAV.map((n, i) => (
            <li key={n.to} className="border-b border-line">
              <NavLink
                to={n.to}
                end={n.end}
                onClick={onClose}
                className={({ isActive }) => cn("flex items-baseline gap-4 py-4 font-display text-3xl tracking-[-0.03em]", isActive ? "text-strong" : "text-muted")}
              >
                <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="mt-8 flex items-center gap-3 rounded-md bg-sunken p-4 text-strong">
        <MessageCircle className="size-5 text-whatsapp" /> {company.whatsapp.display} (WhatsApp)
      </a>
    </Dialog>
  );
}

const SERVICE_ICONS = [Truck, ShieldCheck, Headset];

function Footer() {
  return (
    <footer className="no-print border-t border-line bg-raised">
      <div className="container-page grid gap-px border-b border-line sm:grid-cols-3">
        {footer.services.map((s, i) => {
          const Icon = SERVICE_ICONS[i];
          return (
            <div key={s.title} className={cn("flex items-center gap-4 py-6", i > 0 && "sm:border-l sm:border-line sm:pl-8")}>
              <Icon className="size-6 stroke-[1.4] text-accent-text" />
              <div>
                <p className="font-medium text-strong">{s.title}</p>
                <p className="text-sm text-muted">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo className="w-[160px]" />
          <p className="label">{footer.since}</p>
          <p className="max-w-sm text-sm text-muted">{footer.blurb}</p>
        </div>
        <div>
          <h2 className="label mb-4 !text-strong">{footer.contactTitle}</h2>
          <address className="flex flex-col gap-2 text-sm not-italic">
            <span>
              {company.address.street} – {company.address.district}, {company.address.city} – {company.address.state}
            </span>
            <a href={`mailto:${company.email}`} className="link-grow self-start break-all">
              {company.email}
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="link-grow self-start">
              WhatsApp {company.whatsapp.display}
            </a>
          </address>
        </div>
        <div>
          <h2 className="label mb-4 !text-strong">{footer.institutionalTitle}</h2>
          <ul className="flex flex-col gap-2 text-sm">
            <li><Link to="/sobre" className="link-grow">Sobre nós</Link></li>
            <li><Link to="/sobre" className="link-grow">Nossa história</Link></li>
            <li><Link to="/privacidade" className="link-grow">Política de privacidade</Link></li>
            <li><Link to="/termos" className="link-grow">Termos de uso</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted md:flex-row md:items-center md:justify-between">
          <p>
            {company.legalName} - CNPJ: {company.cnpj}
          </p>
          <p>© {new Date().getFullYear()} {company.name}. Todos os direitos reservados.</p>
          <a href={footer.creditUrl} target="_blank" rel="noopener noreferrer" className="link-grow">
            {footer.credit}
          </a>
        </div>
      </div>
    </footer>
  );
}
