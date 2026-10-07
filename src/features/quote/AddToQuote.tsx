import { Minus, Plus } from "lucide-react";
import { useRef } from "react";
import { QUOTE_LIMITS } from "@shared/quote-limits";
import { cn } from "@/lib/cn";
import { toast } from "@/ui/toast";
import { useQuote } from "./store";

/** Item "voa" da foto até o botão Cotação (FLIP com Web Animations; nada se movimento reduzido). */
export function flyToQuote(from: HTMLElement | null) {
  const target = document.getElementById("quote-button");
  if (!from || !target || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = from.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: "0",
    zIndex: "var(--z-toast)",
    pointerEvents: "none",
    borderRadius: "12px",
  });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  ghost
    .animate(
      [
        { transform: "translate(0,0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.08)`, opacity: 0.4 },
      ],
      { duration: 620, easing: "cubic-bezier(.22,1,.36,1)" },
    )
    .finished.finally(() => ghost.remove());
}

interface Props {
  productRef: string;
  productName: string;
  /** Elemento da foto, para a animação de "voo". */
  imageRef?: React.RefObject<HTMLElement | null>;
  size?: "sm" | "md";
  className?: string;
}

/** Botão "+ Cotação" que vira seletor de quantidade depois de adicionado. */
export function AddToQuote({ productRef, productName, imageRef, size = "sm", className }: Props) {
  const line = useQuote((s) => s.lines.find((l) => l.ref === productRef));
  const add = useQuote((s) => s.add);
  const setQuantity = useQuote((s) => s.setQuantity);
  const remove = useQuote((s) => s.remove);
  const inputRef = useRef<HTMLInputElement>(null);
  const h = size === "sm" ? "h-10" : "h-12";

  if (!line) {
    return (
      <button
        type="button"
        onClick={() => {
          const result = add(productRef);
          if (result === "full") return toast.error(`A cotação aceita até ${QUOTE_LIMITS.maxItems} produtos diferentes.`);
          flyToQuote(imageRef?.current ?? null);
          toast.ok(`${productName.slice(0, 48)} na cotação`);
        }}
        className={cn(
          h,
          "group/add inline-flex w-full items-center justify-center gap-2 rounded-pill bg-sky px-4 text-sm font-bold text-navy transition-colors duration-200",
          "hover:bg-action hover:text-action-text",
          className,
        )}
        aria-label={`Adicionar ${productName} à cotação`}
      >
        <Plus className="size-4 transition-transform duration-300 group-hover/add:rotate-90" />
        <span className="sm:hidden">Adicionar</span>
        <span className="hidden sm:inline">Adicionar à cotação</span>
      </button>
    );
  }

  return (
    <div
      className={cn(h, "inline-flex w-full items-center justify-between rounded-pill bg-action text-action-text", className)}
      role="group"
      aria-label={`Quantidade de ${productName} na cotação`}
    >
      <button
        type="button"
        className="grid h-full w-11 place-items-center rounded-l-pill transition-colors hover:bg-white/10"
        onClick={() => (line.quantity <= 1 ? remove(productRef) : setQuantity(productRef, line.quantity - 1))}
        aria-label={line.quantity <= 1 ? "Remover da cotação" : "Diminuir quantidade"}
      >
        <Minus className="size-4" />
      </button>
      <input
        ref={inputRef}
        inputMode="numeric"
        className="w-14 bg-transparent text-center text-sm font-bold tabular outline-none focus-visible:outline-2 focus-visible:outline-signal"
        value={line.quantity}
        aria-label="Quantidade"
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/\D/g, ""));
          if (n > 0) setQuantity(productRef, n);
        }}
      />
      <button
        type="button"
        className="grid h-full w-11 place-items-center rounded-r-pill transition-colors hover:bg-white/10"
        onClick={() => setQuantity(productRef, line.quantity + 1)}
        aria-label="Aumentar quantidade"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
