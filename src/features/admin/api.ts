import { useQuery } from "@tanstack/react-query";
import type { Unit } from "@shared/catalog";
import type { ProposalStatus } from "@shared/proposal";
import type { QuoteStatus } from "@shared/quote";
import { api } from "@/lib/api";

export interface Me {
  id: string;
  name: string;
  email: string;
  role: "admin" | "vendedor";
}

export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api<{ user: Me }>("/auth/me").then((r) => r.user), retry: false, staleTime: 60_000 });

export interface QuoteListItem {
  id: string;
  protocol: string;
  status: QuoteStatus;
  name: string | null;
  company: string | null;
  isSpCapital: boolean;
  createdAt: string;
  firstResponseAt: string | null;
  itemCount: number;
  totalCents: number | null;
  assignedName: string | null;
}

export interface QuoteDetail {
  id: string;
  protocol: string;
  status: QuoteStatus;
  nextStatuses: QuoteStatus[];
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    cnpj: string | null;
    message: string | null;
    cep: string;
    isSpCapital: boolean;
  };
  anonymized: boolean;
  assignedName: string | null;
  createdAt: string;
  firstResponseAt: string | null;
  items: {
    id: number;
    ref: string;
    name: string;
    unit: Unit;
    quantity: number;
    productId: number | null;
    imagePath: string | null;
    internalPriceCents: number | null;
    lastProposal: { quantity: number; unit_price_cents: number } | null;
  }[];
  events: { from_status: QuoteStatus | null; to_status: QuoteStatus; note: string | null; created_at: string; actor_name: string | null }[];
  proposals: {
    id: string;
    version: number;
    status: ProposalStatus;
    validUntil: string;
    totalCents: number;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    paymentTerms: string | null;
    deliveryTerms: string | null;
    notes: string | null;
    createdAt: string;
    createdByName: string | null;
    firstViewedAt: string | null;
    viewCount: number;
    approvedAt: string | null;
    approvedBy: string | null;
    link: string;
  }[];
}

export interface AdminProduct {
  id: number;
  ref: string;
  slug: string;
  name: string;
  unit: Unit;
  categoryId: number;
  brandId: number | null;
  description: string | null;
  priceCents: number | null;
  imagePath: string | null;
  active: boolean;
  updatedAt: string;
  timesQuoted: number;
}

export interface Insights {
  days: number;
  received: number;
  waiting: number;
  proposed: number;
  won: number;
  lost: number;
  expired: number;
  conversionRate: number | null;
  wonValueCents: number;
  approvedProposals: number;
  avgFirstResponseHours: number | null;
  topProducts: { ref: string; name: string; quotes: number; quantity: number; unit: Unit }[];
  weekly: { week: string; n: number; won: number }[];
  searchMisses: { term: string; count: number; last_at: string }[];
  stale: { id: string; protocol: string; created_at: string }[];
  hotProposals: { id: string; protocol: string; total_cents: number; view_count: number; first_viewed_at: string; valid_until: string }[];
}

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

export const fmtRelative = (iso: string) => {
  const diff = Date.now() - Date.parse(iso);
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return `há ${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
};
