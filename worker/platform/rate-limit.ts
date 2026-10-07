import { HttpError } from "./http";

export interface RateRule {
  /** Nome da regra + identificador já em hash (nunca IP ou e-mail em claro). */
  key: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Janela fixa em D1, atômica por UPSERT. KISS: sem Redis/Durable Object — o volume
 * de formulários de uma distribuidora cabe folgado no plano gratuito.
 */
export async function hitRateLimit(db: D1Database, rule: RateRule, now = Date.now()): Promise<void> {
  const windowStart = Math.floor(now / 1000 / rule.windowSeconds) * rule.windowSeconds;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END,
         window_start = ?2
       RETURNING count`,
    )
    .bind(rule.key, windowStart)
    .first<{ count: number }>();

  if ((row?.count ?? 0) > rule.limit) {
    throw new HttpError(429, "rate_limited", "Muitas tentativas. Aguarde alguns minutos e tente de novo.");
  }
}

export const RATE = {
  quoteSubmit: (ipHash: string): RateRule => ({ key: `quote:${ipHash}`, limit: 5, windowSeconds: 3600 }),
  contactSubmit: (ipHash: string): RateRule => ({ key: `contact:${ipHash}`, limit: 5, windowSeconds: 3600 }),
  loginRequestIp: (ipHash: string): RateRule => ({ key: `login-ip:${ipHash}`, limit: 5, windowSeconds: 900 }),
  loginRequestEmail: (emailHash: string): RateRule => ({ key: `login-email:${emailHash}`, limit: 3, windowSeconds: 900 }),
  proposalApprove: (ipHash: string): RateRule => ({ key: `approve:${ipHash}`, limit: 10, windowSeconds: 3600 }),
  searchMiss: (ipHash: string): RateRule => ({ key: `miss:${ipHash}`, limit: 30, windowSeconds: 3600 }),
};
