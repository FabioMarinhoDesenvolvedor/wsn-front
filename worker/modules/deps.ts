// Composição das dependências por requisição (raiz de composição — único lugar que
// conhece as implementações concretas).
import type { Env } from "../env";
import { createFieldCipher, createHasher, type FieldCipher, type Hasher } from "../platform/crypto";
import { createMailer, deliverOutbox, type Mailer } from "../platform/mail";
import { createTurnstileVerifier, type CaptchaVerifier } from "../platform/turnstile";

/** Segredo e token de teste documentados pela Cloudflare para o Turnstile. */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";
const TURNSTILE_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

export interface Deps {
  cipher: FieldCipher;
  hasher: Hasher;
  captcha: CaptchaVerifier;
  mailer: Mailer;
  flushOutbox(): Promise<number>;
}

const cache = new WeakMap<Env, Deps>();

export function deps(env: Env): Deps {
  const hit = cache.get(env);
  if (hit) return hit;

  const isTestSecret = env.TURNSTILE_SECRET === TURNSTILE_TEST_SECRET;
  if (isTestSecret && env.ENVIRONMENT === "production") {
    throw new Error("Turnstile com segredo de teste em produção");
  }

  const cipher = createFieldCipher(env);
  const mailer = createMailer(env);
  const created: Deps = {
    cipher,
    hasher: createHasher(env),
    // Fora de produção com o segredo de teste, valida localmente (sem rede) o token de teste.
    captcha: isTestSecret
      ? { verify: async (token) => token === TURNSTILE_TEST_TOKEN }
      : createTurnstileVerifier(env.TURNSTILE_SECRET),
    mailer,
    flushOutbox: () => deliverOutbox(env.DB, cipher, mailer).catch(() => 0),
  };
  cache.set(env, created);
  return created;
}
