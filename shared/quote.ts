import { z } from "zod";
import { isValidCep, isValidCnpj, isValidPhoneBR } from "./br";

/** Referência do produto: 4 dígitos (R-CAT-1). Fica aqui para o catálogo público não carregar o zod. */
export const refSchema = z.string().regex(/^\d{4}$/, "Referência tem 4 dígitos");

import { QUOTE_LIMITS } from "./quote-limits";
export { clampQuantity, QUOTE_LIMITS } from "./quote-limits";

// ---- Envio de cotação (R-COT-3) — mesmo schema no formulário e na API ----
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(120),
  email: z.string().trim().toLowerCase().max(160).pipe(z.email("E-mail inválido")),
  phone: z.string().trim().refine(isValidPhoneBR, "Telefone com DDD inválido"),
  company: optionalText(120),
  cnpj: optionalText(18).refine((v) => !v || isValidCnpj(v), "CNPJ inválido"),
  cep: z.string().trim().refine(isValidCep, "CEP inválido"),
  message: optionalText(1000),
});
export type CustomerInput = z.input<typeof customerSchema>;

export const quoteItemInputSchema = z.object({
  ref: refSchema,
  quantity: z.number().int().min(QUOTE_LIMITS.minQuantity).max(QUOTE_LIMITS.maxQuantity),
});

export const submitQuoteSchema = z.object({
  items: z
    .array(quoteItemInputSchema)
    .min(1, "Adicione ao menos um produto")
    .max(QUOTE_LIMITS.maxItems)
    .refine((items) => new Set(items.map((i) => i.ref)).size === items.length, "Item repetido"),
  customer: customerSchema,
  consent: z.literal(true, "É preciso aceitar a política de privacidade"),
  turnstileToken: z.string().max(4096),
  /** Honeypot: humanos não veem o campo; bots preenchem. */
  website: z.string().max(0).optional(),
});
export type SubmitQuoteInput = z.input<typeof submitQuoteSchema>;
export type SubmitQuoteData = z.output<typeof submitQuoteSchema>;

export interface SubmitQuoteResult {
  protocol: string;
  isSpCapital: boolean;
}

// ---- Protocolo (R-COT-5) ----
export const formatProtocol = (year: number, sequence: number): string =>
  `WSN-${year}-${String(sequence).padStart(6, "0")}`;

export const protocolSchema = z.string().regex(/^WSN-\d{4}-\d{6}$/);

// ---- Ciclo de vida (R-COT-7) ----
export const QUOTE_STATUSES = [
  "recebida",
  "em_analise",
  "respondida",
  "ganha",
  "perdida",
  "cancelada",
  "expirada",
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = {
  recebida: "Recebida",
  em_analise: "Em análise",
  respondida: "Proposta enviada",
  ganha: "Ganha",
  perdida: "Perdida",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

const TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  recebida: ["em_analise", "respondida", "cancelada"],
  em_analise: ["respondida", "perdida", "cancelada"],
  respondida: ["ganha", "perdida", "expirada", "em_analise", "respondida"],
  expirada: ["em_analise", "respondida", "perdida"],
  ganha: [],
  perdida: [],
  cancelada: [],
};

export const canTransition = (from: QuoteStatus, to: QuoteStatus): boolean =>
  TRANSITIONS[from].includes(to);

export const nextStatuses = (from: QuoteStatus): readonly QuoteStatus[] => TRANSITIONS[from];

export const isTerminal = (status: QuoteStatus): boolean => TRANSITIONS[status].length === 0;

/** Transições que a equipe faz à mão; "respondida" só acontece ao enviar proposta. */
export const manualStatuses = (from: QuoteStatus): QuoteStatus[] =>
  TRANSITIONS[from].filter((s) => s !== "respondida" && s !== "expirada" && s !== from);
