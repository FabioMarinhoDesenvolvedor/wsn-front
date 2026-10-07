import { z } from "zod";
import type { Unit } from "./catalog";

// Proposta comercial: a resposta da WSN a uma cotação, com preço visível
// apenas para quem recebe o link (R-CAT-4 continua valendo no site público).

export const PROPOSAL_LIMITS = {
  minValidDays: 1,
  maxValidDays: 60,
  defaultValidDays: 7,
  maxUnitPriceCents: 10_000_000, // R$ 100.000,00 por unidade
} as const;

export const PROPOSAL_STATUSES = ["enviada", "aprovada", "substituida", "expirada"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

const cents = z.number().int().min(0).max(PROPOSAL_LIMITS.maxUnitPriceCents * 100);

export const createProposalSchema = z.object({
  items: z
    .array(
      z.object({
        quoteItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(9999),
        unitPriceCents: z.number().int().min(0).max(PROPOSAL_LIMITS.maxUnitPriceCents),
      }),
    )
    .min(1)
    .max(100),
  validDays: z.number().int().min(PROPOSAL_LIMITS.minValidDays).max(PROPOSAL_LIMITS.maxValidDays),
  shippingCents: cents,
  discountCents: cents,
  paymentTerms: z.string().trim().max(300).optional(),
  deliveryTerms: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(1000).optional(),
  notifyCustomer: z.boolean(),
});
export type CreateProposalInput = z.input<typeof createProposalSchema>;

export interface ProposalLine {
  quantity: number;
  unitPriceCents: number;
}

export interface ProposalTotals {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
}

/** Totais em centavos inteiros — nunca ponto flutuante para dinheiro. */
export function computeTotals(
  lines: readonly ProposalLine[],
  discountCents: number,
  shippingCents: number,
): ProposalTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.quantity * l.unitPriceCents, 0);
  const discount = Math.min(discountCents, subtotalCents);
  return {
    subtotalCents,
    discountCents: discount,
    shippingCents,
    totalCents: subtotalCents - discount + shippingCents,
  };
}

/** Validade inclusiva até 23:59:59 de São Paulo do último dia. */
export function validUntil(from: Date, days: number): string {
  const spOffsetMs = 3 * 60 * 60 * 1000; // America/Sao_Paulo sem horário de verão desde 2019
  const local = new Date(from.getTime() - spOffsetMs);
  local.setUTCDate(local.getUTCDate() + days);
  local.setUTCHours(23, 59, 59, 0);
  return new Date(local.getTime() + spOffsetMs).toISOString();
}

export const isProposalExpired = (validUntilIso: string, now: Date = new Date()): boolean =>
  now.getTime() > Date.parse(validUntilIso);

export const approveProposalSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  accept: z.literal(true, "Confirme a aprovação"),
});

export interface PublicProposalItem {
  ref: string;
  name: string;
  unit: Unit;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
}

export interface PublicProposal {
  protocol: string;
  version: number;
  status: ProposalStatus;
  customerName: string;
  companyName: string | null;
  createdAt: string;
  validUntil: string;
  items: PublicProposalItem[];
  totals: ProposalTotals;
  paymentTerms: string | null;
  deliveryTerms: string | null;
  notes: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  sellerName: string | null;
}

export const formatBRL = (cents: number): string =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "12,50" | "12.50" | "R$ 1.234,56" → centavos; null se inválido. */
export function parseBRL(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : /^\d{1,3}(\.\d{3})+$/.test(cleaned)
      ? cleaned.replace(/\./g, "") // "1.234" é milhar no pt-BR
      : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}
