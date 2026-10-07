import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Props {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** "sheet" desliza da direita (tela cheia no celular); "modal" centraliza. */
  variant?: "sheet" | "modal";
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * <dialog> nativo com showModal(): foco preso, Esc fecha, fundo inerte e
 * restauração do foco — sem biblioteca. Clique no backdrop fecha.
 */
export function Dialog({ open, onClose, title, variant = "modal", children, footer, className }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && el.open) {
      el.close();
    }
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-labelledby="dialog-title"
      className={cn(
        "m-0 max-h-none max-w-none bg-transparent p-0 text-body backdrop:bg-[#0d1b2a]/45 backdrop:backdrop-blur-[2px] open:flex",
        variant === "sheet"
          ? "ml-auto h-dvh w-full sm:w-[440px] open:[animation:sheet-in_var(--dur-base)_var(--ease-out)]"
          : "m-auto w-[min(100%-32px,560px)] open:[animation:rise-in_var(--dur-base)_var(--ease-out)]",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col bg-raised",
          variant === "sheet" ? "h-full border-l border-line" : "max-h-[90dvh] rounded-lg border border-line",
        )}
      >
        <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="dialog-title" className="display-3 text-xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-10 place-items-center rounded-pill text-muted transition-colors hover:bg-sunken hover:text-strong"
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
