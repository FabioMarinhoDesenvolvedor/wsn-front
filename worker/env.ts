export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  MEDIA: R2Bucket;

  APP_URL: string;
  MAIL_FROM: string;
  MAIL_TO_SALES: string;
  TURNSTILE_SITE_KEY: string;
  ENVIRONMENT: "development" | "staging" | "production";

  /** JSON {"1":"<base64 32 bytes>", ...} — chaves AES-256-GCM por versão. */
  PII_KEYS: string;
  /** Versão usada para cifrar dados novos; as antigas seguem decifrando. */
  PII_ACTIVE_KEY: string;
  /** Base64 32 bytes — HMAC para hashes de busca (e-mail, IP, tokens). */
  HMAC_KEY: string;
  TURNSTILE_SECRET: string;
  RESEND_API_KEY?: string;
}

export type UserRole = "admin" | "vendedor";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AppVariables {
  user: SessionUser;
  ipHash: string;
}

export type AppEnv = { Bindings: Env; Variables: AppVariables };
