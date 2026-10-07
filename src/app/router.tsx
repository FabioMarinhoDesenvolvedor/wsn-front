import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import { CatalogPage } from "@/features/catalog/CatalogPage";
import { ProductPage } from "@/features/catalog/ProductPage";
import { AboutPage } from "@/features/institutional/AboutPage";
import { ContactPage } from "@/features/institutional/ContactPage";
import { HomePage } from "@/features/institutional/HomePage";
import { NotFoundPage, PrivacyPage, TermsPage } from "@/features/institutional/SimplePages";
import { PublicLayout } from "./PublicLayout";

// Páginas com formulário validado (zod) e o painel só são baixados quando usados.
const QuotePage = lazy(() => import("@/features/quote/QuotePage").then((m) => ({ default: m.QuotePage })));
const ProposalPage = lazy(() => import("@/features/proposal/ProposalPage").then((m) => ({ default: m.ProposalPage })));

// O painel só é baixado por quem entra nele.
const Admin = {
  Layout: lazy(() => import("@/features/admin/AdminLayout").then((m) => ({ default: m.AdminLayout }))),
  Login: lazy(() => import("@/features/admin/LoginPages").then((m) => ({ default: m.LoginPage }))),
  Verify: lazy(() => import("@/features/admin/LoginPages").then((m) => ({ default: m.VerifyPage }))),
  Dashboard: lazy(() => import("@/features/admin/DashboardPage").then((m) => ({ default: m.DashboardPage }))),
  Quotes: lazy(() => import("@/features/admin/QuotesPage").then((m) => ({ default: m.QuotesPage }))),
  Quote: lazy(() => import("@/features/admin/QuoteDetailPage").then((m) => ({ default: m.QuoteDetailPage }))),
  Catalog: lazy(() => import("@/features/admin/CatalogAdminPage").then((m) => ({ default: m.CatalogAdminPage }))),
  Messages: lazy(() => import("@/features/admin/OtherPages").then((m) => ({ default: m.MessagesPage }))),
  Team: lazy(() => import("@/features/admin/OtherPages").then((m) => ({ default: m.TeamPage }))),
};

const Lazy = ({ children }: { children: React.ReactNode }) => <Suspense fallback={<div className="min-h-[60dvh]" />}>{children}</Suspense>;

const AdminShell = () => (
  <Suspense fallback={<div className="grid min-h-dvh place-items-center text-muted">Carregando…</div>}>
    <Outlet />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/produtos", element: <CatalogPage /> },
      { path: "/produtos/c/:categoria", element: <CatalogPage /> },
      { path: "/produtos/:segment", element: <ProductPage /> },
      { path: "/cotacao", element: <Lazy><QuotePage /></Lazy> },
      { path: "/sobre", element: <AboutPage /> },
      { path: "/contato", element: <ContactPage /> },
      { path: "/privacidade", element: <PrivacyPage /> },
      { path: "/termos", element: <TermsPage /> },
      // Rotas do site v1 (links antigos e Google)
      { path: "/aboutus", element: <Navigate to="/sobre" replace /> },
      { path: "/products", element: <Navigate to="/produtos" replace /> },
      { path: "/contact", element: <Navigate to="/contato" replace /> },
      { path: "/cart", element: <Navigate to="/cotacao" replace /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  { path: "/proposta/:token", element: <Lazy><ProposalPage /></Lazy> },
  {
    element: <AdminShell />,
    children: [
      { path: "/admin/entrar", element: <Admin.Login /> },
      { path: "/admin/entrar/:token", element: <Admin.Verify /> },
      {
        element: <Admin.Layout />,
        children: [
          { path: "/admin", element: <Admin.Dashboard /> },
          { path: "/admin/cotacoes", element: <Admin.Quotes /> },
          { path: "/admin/cotacoes/:id", element: <Admin.Quote /> },
          { path: "/admin/catalogo", element: <Admin.Catalog /> },
          { path: "/admin/mensagens", element: <Admin.Messages /> },
          { path: "/admin/equipe", element: <Admin.Team /> },
        ],
      },
    ],
  },
]);
