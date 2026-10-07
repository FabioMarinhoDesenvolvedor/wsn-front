import { HttpError } from "./http";

export interface CaptchaVerifier {
  verify(token: string, ip: string): Promise<boolean>;
}

/** Cloudflare Turnstile — gratuito e sem rastrear o visitante como o reCAPTCHA. */
export function createTurnstileVerifier(secret: string, fetcher: typeof fetch = fetch): CaptchaVerifier {
  return {
    async verify(token, ip) {
      if (!token) return false;
      const body = new FormData();
      body.append("secret", secret);
      body.append("response", token);
      body.append("remoteip", ip);
      const res = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
      if (!res.ok) return false;
      const data = (await res.json()) as { success?: boolean };
      return data.success === true;
    },
  };
}

export async function assertHuman(verifier: CaptchaVerifier, token: string, ip: string): Promise<void> {
  if (!(await verifier.verify(token, ip))) {
    throw new HttpError(403, "captcha", "Não foi possível confirmar que você não é um robô. Recarregue a página.");
  }
}
