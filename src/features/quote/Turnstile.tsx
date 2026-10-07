import { useQuery } from "@tanstack/react-query";
import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { api } from "@/lib/api";

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: Record<string, unknown>): string;
      reset(id: string): void;
      remove(id: string): void;
    };
  }
}

let scriptPromise: Promise<void> | null = null;
const loadScript = () =>
  (scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile"));
    };
    document.head.appendChild(s);
  }));

export interface TurnstileHandle {
  reset(): void;
}

/** Cloudflare Turnstile: verificação anti-robô sem rastreamento e quase sempre invisível. */
export function Turnstile({ onToken, ref }: { onToken: (token: string) => void; ref?: Ref<TurnstileHandle> }) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const { data } = useQuery({ queryKey: ["config"], queryFn: () => api<{ turnstileSiteKey: string }>("/config"), staleTime: Infinity });
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useImperativeHandle(ref, () => ({
    reset() {
      onTokenRef.current("");
      if (widget.current) window.turnstile?.reset(widget.current);
    },
  }));

  useEffect(() => {
    if (!data?.turnstileSiteKey || !box.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        widget.current = window.turnstile.render(box.current, {
          sitekey: data.turnstileSiteKey,
          language: "pt-br",
          appearance: "interaction-only",
          callback: (t: string) => onTokenRef.current(t),
          "expired-callback": () => onTokenRef.current(""),
          "error-callback": () => onTokenRef.current(""),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [data?.turnstileSiteKey]);

  return <div ref={box} className="min-h-0 empty:hidden" />;
}
