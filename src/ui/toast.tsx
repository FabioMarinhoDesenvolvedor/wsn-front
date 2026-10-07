import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { create } from "zustand";
import { cn } from "@/lib/cn";

type ToastTone = "ok" | "info" | "danger";
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const useToasts = create<{ items: ToastItem[]; push: (t: Omit<ToastItem, "id">) => void; dismiss: (id: number) => void }>((set) => ({
  items: [],
  push: (t) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-2), { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((i) => i.id !== id) })), 3800);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = {
  ok: (message: string) => useToasts.getState().push({ tone: "ok", message }),
  info: (message: string) => useToasts.getState().push({ tone: "info", message }),
  error: (message: string) => useToasts.getState().push({ tone: "danger", message }),
};

const icons = { ok: CheckCircle2, info: Info, danger: TriangleAlert };

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[var(--z-toast)] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {items.map((t) => {
        const Icon = icons[t.tone];
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cn(
              "pointer-events-auto flex max-w-md items-center gap-3 rounded-pill bg-deepest py-2.5 pr-5 pl-3 text-sm text-on-deep shadow-[0_8px_30px_rgb(13_27_42/0.25)]",
              "[animation:rise-in_var(--dur-base)_var(--ease-out)]",
            )}
          >
            <Icon className={cn("size-5", t.tone === "ok" ? "text-green" : t.tone === "danger" ? "text-[#ff8a7a]" : "text-signal")} />
            {t.message}
          </button>
        );
      })}
    </div>
  );
}
