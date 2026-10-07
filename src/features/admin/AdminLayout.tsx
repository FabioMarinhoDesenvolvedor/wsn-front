import { useQueryClient } from "@tanstack/react-query";
import { ClipboardList, LayoutDashboard, LogOut, Mail, Package, ShieldCheck, Users } from "lucide-react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { Symbol } from "@/ui/Logo";
import { useMe } from "./api";

const NAV = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/admin/cotacoes", label: "Cotações", icon: ClipboardList },
  { to: "/admin/catalogo", label: "Catálogo", icon: Package },
  { to: "/admin/mensagens", label: "Mensagens", icon: Mail },
  { to: "/admin/equipe", label: "Equipe e LGPD", icon: Users, adminOnly: true },
];

export function AdminLayout() {
  const { data: me, isLoading, isError } = useMe();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();

  if (isLoading) return <div className="grid min-h-dvh place-items-center text-muted">Carregando…</div>;
  if (isError || !me) return <Navigate to="/admin/entrar" replace state={{ from: location.pathname }} />;

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    navigate("/admin/entrar", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-[var(--z-header)] flex items-center gap-2 border-b border-line bg-raised px-3 py-2 md:h-dvh md:flex-col md:items-stretch md:gap-1 md:border-r md:border-b-0 md:px-4 md:py-6">
        <div className="hidden items-center gap-2 px-2 pb-6 md:flex">
          <Symbol className="size-8" />
          <div>
            <p className="font-display text-lg leading-none font-bold tracking-tight text-strong">WSN</p>
            <p className="label !text-[10px]">Painel comercial</p>
          </div>
        </div>
        <nav aria-label="Painel" className="flex flex-1 gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          {NAV.filter((n) => !n.adminOnly || me.role === "admin").map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive ? "bg-action text-action-text" : "text-muted hover:bg-sunken hover:text-strong",
                )
              }
            >
              <n.icon className="size-4" />
              <span className="hidden sm:inline">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2 md:mt-auto md:flex-col md:items-stretch md:border-t md:border-line md:pt-4">
          <div className="hidden px-2 md:block">
            <p className="truncate text-sm font-medium text-strong">{me.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted">
              <ShieldCheck className="size-3" /> {me.role === "admin" ? "Administrador" : "Vendedor"}
            </p>
          </div>
          <button type="button" onClick={logout} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-sunken hover:text-strong" aria-label="Sair">
            <LogOut className="size-4" />
            <span className="hidden md:inline">Sair</span>
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 md:px-10 md:py-10">
        <Outlet context={me} />
      </main>
    </div>
  );
}

export function AdminHeader({ title, label, actions }: { title: string; label?: string; actions?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {label && <p className="label mb-2">{label}</p>}
        <h1 className="display-3 text-[clamp(26px,2.6vw,36px)]">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
