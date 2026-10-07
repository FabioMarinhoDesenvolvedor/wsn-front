import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Cabeçalho padrão das páginas internas: faixa azul-céu suave, como o hero da Home. */
export function PageHeader({
  eyebrow,
  title,
  lead,
  aside,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("bg-hero", className)}>
      <div className="container-page flex flex-col gap-6 pt-10 pb-10 md:flex-row md:items-end md:justify-between md:pt-14 md:pb-12">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="display-1 text-[clamp(32px,4.2vw,52px)]">{title}</h1>
          {lead && <p className="lead mt-4 text-muted">{lead}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
