// Criptografia de campo (AES-256-GCM, WebCrypto nativo do Workers) e hashes HMAC.
//
// Formato cifrado: "v<versão>.<iv base64url>.<cifra+tag base64url>".
// O AAD amarra a cifra ao lugar onde ela mora ("quotes.email:<id>"): copiar o
// valor de uma linha para outra faz a decifragem falhar.

import type { Env } from "../env";

const enc = new TextEncoder();
const dec = new TextDecoder();

export const b64url = {
  encode(bytes: ArrayBuffer | Uint8Array): string {
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let s = "";
    for (const b of view) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  },
  decode(value: string): Uint8Array {
    const s = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4));
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  },
};

const fromBase64 = (value: string): Uint8Array => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export interface FieldCipher {
  encrypt(plain: string, aad: string): Promise<string>;
  decrypt(cipher: string, aad: string): Promise<string>;
  encryptOpt(plain: string | undefined | null, aad: string): Promise<string | null>;
  decryptOpt(cipher: string | null, aad: string): Promise<string | null>;
}

export interface Hasher {
  /** HMAC-SHA256 hex com domínio separado ("email", "ip", ...). */
  hash(domain: string, value: string): Promise<string>;
}

const keyCache = new Map<string, CryptoKey>();

async function importAesKey(raw: string): Promise<CryptoKey> {
  const cached = keyCache.get(raw);
  if (cached) return cached;
  const bytes = fromBase64(raw);
  if (bytes.length !== 32) throw new Error("Chave PII deve ter 32 bytes");
  const key = await crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
  keyCache.set(raw, key);
  return key;
}

export function createFieldCipher(env: Pick<Env, "PII_KEYS" | "PII_ACTIVE_KEY">): FieldCipher {
  const keyring = JSON.parse(env.PII_KEYS) as Record<string, string>;
  const active = env.PII_ACTIVE_KEY;
  if (!keyring[active]) throw new Error(`Chave PII ativa v${active} ausente no keyring`);

  const encrypt = async (plain: string, aad: string): Promise<string> => {
    const key = await importAesKey(keyring[active]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: enc.encode(aad) },
      key,
      enc.encode(plain),
    );
    return `v${active}.${b64url.encode(iv)}.${b64url.encode(cipher)}`;
  };

  const decrypt = async (value: string, aad: string): Promise<string> => {
    const [v, iv, data] = value.split(".");
    const raw = keyring[v?.slice(1) ?? ""];
    if (!raw || !iv || !data) throw new Error("Cifra inválida ou chave desconhecida");
    const key = await importAesKey(raw);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64url.decode(iv), additionalData: enc.encode(aad) },
      key,
      b64url.decode(data),
    );
    return dec.decode(plain);
  };

  return {
    encrypt,
    decrypt,
    encryptOpt: async (plain, aad) => (plain ? encrypt(plain, aad) : null),
    decryptOpt: async (cipher, aad) => (cipher ? decrypt(cipher, aad) : null),
  };
}

export function createHasher(env: Pick<Env, "HMAC_KEY">): Hasher {
  let keyPromise: Promise<CryptoKey> | null = null;
  const key = () =>
    (keyPromise ??= crypto.subtle.importKey(
      "raw",
      fromBase64(env.HMAC_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    ));

  return {
    async hash(domain, value) {
      const sig = await crypto.subtle.sign("HMAC", await key(), enc.encode(`${domain}\u0000${value}`));
      return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
    },
  };
}

/** Token aleatório de 256 bits, base64url. */
export const randomToken = (): string => b64url.encode(crypto.getRandomValues(new Uint8Array(32)));

/** SHA-256 hex — para tokens que já têm 256 bits de entropia (não precisam de HMAC). */
export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparação em tempo constante para strings de mesmo tamanho. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** IP vira hash com sal diário: dá para limitar abuso sem rastrear pessoas entre dias. */
export const hashIp = (hasher: Hasher, ip: string, now: Date = new Date()): Promise<string> =>
  hasher.hash(`ip:${now.toISOString().slice(0, 10)}`, ip);
