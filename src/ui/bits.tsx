// Peças pequenas do design system. Cada uma tem um papel só.
import type { ReactNode } from "react";
import { useReviewMode } from "@/lib/hooks";
import { cn } from "@/lib/cn";

/** Selo discreto com a referência do produto (busca por Ref. continua sendo atalho do comprador). */
export function RefTag({ value, className, inverse }: { value: string; className?: string; inverse?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-pill px-2.5 text-[11px] font-semibold tabular transition-colors duration-200",
        inverse ? "bg-navy text-white" : "bg-white/90 text-muted shadow-sm",
        className,
      )}
    >
      Ref. {value}
    </span>
  );
}

type Tone = "neutral" | "navy" | "green" | "ok" | "warn" | "danger" | "signal";
const tones: Record<Tone, string> = {
  neutral: "bg-sunken text-body",
  navy: "bg-navy text-white",
  green: "bg-green text-white",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  danger: "bg-danger-soft text-danger",
  signal: "bg-signal text-[#0d1b2a]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-pill px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Copy preservada do site antigo que ainda precisa ser confirmada pela WSN.
 * Em revisão (dev ou ?revisao=1) aparece com selo amarelo; para o público, texto normal.
 */
export function Pendente({ children, note }: { children: ReactNode; note: string }) {
  const review = useReviewMode();
  if (!review) return <>{children}</>;
  return (
    <span className="rounded-sm bg-signal/25 outline-1 outline-dashed outline-signal" title={`A confirmar: ${note}`}>
      {children}
      <span className="ml-1 rounded-sm bg-signal px-1 align-middle font-mono text-[9px] font-semibold tracking-wider text-[#0d1b2a] uppercase">
        a confirmar
      </span>
    </span>
  );
}

export function SectionHeading({
  label,
  title,
  lead,
  align = "left",
  className,
  as: Tag = "h2",
}: {
  /** Mantido por compatibilidade; a numeração técnica saiu do design. */
  index?: string;
  label?: string;
  title: ReactNode;
  lead?: ReactNode;
  align?: "left" | "center";
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex max-w-2xl flex-col gap-3", align === "center" && "mx-auto items-center text-center", className)}>
      {label && <p className="eyebrow">{label}</p>}
      <Tag className="display-2">{title}</Tag>
      {lead && <p className="lead max-w-xl text-muted">{lead}</p>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-sunken", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-sunken px-6 py-14 text-center">
      {icon && <div className="text-muted [&>svg]:size-10 [&>svg]:stroke-[1.25]">{icon}</div>}
      <h3 className="display-3 text-xl">{title}</h3>
      {children && <p className="max-w-md text-muted">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "ok" | "warn"; children: ReactNode }) {
  const style = { danger: "bg-danger-soft text-danger", ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn" }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-md px-4 py-3 text-sm font-medium", style)}>
      {children}
    </div>
  );
}
