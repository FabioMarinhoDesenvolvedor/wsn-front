import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Marca o elemento como visível uma única vez ao entrar na viewport (classe .reveal). */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.dataset.visible = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** Título da aba por página (o Worker já entrega o título certo para produtos). */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · WSN Distribuidora` : "WSN Distribuidora · Descartáveis, EPIs e Limpeza";
  }, [title]);
}

export function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Modo de revisão de copy: ?revisao=1 mostra os selos "a confirmar" (também em dev). */
export function useReviewMode(): boolean {
  return import.meta.env.DEV || new URLSearchParams(window.location.search).has("revisao");
}
