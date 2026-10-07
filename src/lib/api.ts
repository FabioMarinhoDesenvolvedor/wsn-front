// Cliente HTTP único do front: JSON, erros tipados e mesma origem (cookies do painel).

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields: Record<string, string>;
  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

type Json = Record<string, unknown> | unknown[];

export async function api<T>(path: string, init: Omit<RequestInit, "body"> & { json?: Json; body?: BodyInit } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set("content-type", "application/json");
  headers.set("accept", "application/json");

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers,
      credentials: "same-origin",
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
  } catch {
    throw new ApiError(0, "network", "Sem conexão. Verifique sua internet e tente de novo.");
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string; fields?: Record<string, string> } })
    | null;
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.code ?? "unknown", e?.message ?? "Algo deu errado. Tente novamente.", e?.fields ?? {});
  }
  return data as T;
}

export const errorMessage = (err: unknown): string =>
  err instanceof ApiError ? err.message : "Algo deu errado. Tente novamente.";
