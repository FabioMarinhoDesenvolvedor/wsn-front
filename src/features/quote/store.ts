// Cotação em montagem: só ref + quantidade, no navegador, sem dado pessoal (R-COT-1).
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { clampQuantity, QUOTE_LIMITS } from "@shared/quote-limits";

export interface QuoteLine {
  ref: string;
  quantity: number;
}

interface QuoteState {
  lines: QuoteLine[];
  updatedAt: number;
  /** Chave de idempotência da tentativa de envio atual (R-COT-8). */
  submitKey: string | null;
  sheetOpen: boolean;
  /** Incrementa a cada adição — dispara a animação do contador. */
  pulse: number;
  add(ref: string, quantity?: number): "added" | "increased" | "full";
  setQuantity(ref: string, quantity: number): void;
  remove(ref: string): void;
  clear(): void;
  replace(lines: QuoteLine[]): void;
  ensureSubmitKey(): string;
  openSheet(open: boolean): void;
}

const TTL_MS = QUOTE_LIMITS.cartTtlDays * 86400_000;
const newKey = () => crypto.randomUUID().replace(/-/g, "");

const safeStorage = createJSONStorage(() => {
  try {
    localStorage.setItem("__wsn", "1");
    localStorage.removeItem("__wsn");
    return localStorage;
  } catch {
    // Modo privado/armazenamento bloqueado: a cotação funciona, só não sobrevive ao refresh.
    const mem = new Map<string, string>();
    return { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => void mem.set(k, v), removeItem: (k) => void mem.delete(k) };
  }
});

export const useQuote = create<QuoteState>()(
  persist(
    (set, get) => {
      const touch = (lines: QuoteLine[]) => set({ lines, updatedAt: Date.now(), submitKey: null });
      return {
        lines: [],
        updatedAt: Date.now(),
        submitKey: null,
        sheetOpen: false,
        pulse: 0,
        add(ref, quantity = 1) {
          const { lines } = get();
          const existing = lines.find((l) => l.ref === ref);
          if (existing) {
            touch(lines.map((l) => (l.ref === ref ? { ...l, quantity: clampQuantity(l.quantity + quantity) } : l)));
            set((s) => ({ pulse: s.pulse + 1 }));
            return "increased";
          }
          if (lines.length >= QUOTE_LIMITS.maxItems) return "full";
          touch([...lines, { ref, quantity: clampQuantity(quantity) }]);
          set((s) => ({ pulse: s.pulse + 1 }));
          return "added";
        },
        setQuantity: (ref, quantity) => touch(get().lines.map((l) => (l.ref === ref ? { ...l, quantity: clampQuantity(quantity) } : l))),
        remove: (ref) => touch(get().lines.filter((l) => l.ref !== ref)),
        clear: () => touch([]),
        replace: (lines) => touch(lines.slice(0, QUOTE_LIMITS.maxItems).map((l) => ({ ref: l.ref, quantity: clampQuantity(l.quantity) }))),
        ensureSubmitKey() {
          const key = get().submitKey ?? newKey();
          set({ submitKey: key });
          return key;
        },
        openSheet: (open) => set({ sheetOpen: open }),
      };
    },
    {
      name: "wsn-cotacao",
      version: 1,
      storage: safeStorage,
      partialize: (s) => ({ lines: s.lines, updatedAt: s.updatedAt, submitKey: s.submitKey }),
      onRehydrateStorage: () => (state) => {
        if (state && Date.now() - state.updatedAt > TTL_MS) state.clear();
      },
    },
  ),
);

export const useQuoteCount = () => useQuote((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
export const useQuoteLineCount = () => useQuote((s) => s.lines.length);
