// Limites da cotação (R-COT-2) sem dependências — o carrinho do site importa daqui
// para o bundle público não carregar o zod.
export const QUOTE_LIMITS = {
  minQuantity: 1,
  maxQuantity: 9999,
  maxItems: 100,
  cartTtlDays: 30,
} as const;

export const clampQuantity = (n: number): number =>
  Math.min(QUOTE_LIMITS.maxQuantity, Math.max(QUOTE_LIMITS.minQuantity, Math.trunc(n) || 1));
