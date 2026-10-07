import logo480 from "@/assets/wsn-logo-480.webp";
import logo960 from "@/assets/wsn-logo-960.webp";
import { cn } from "@/lib/cn";

/** Logo oficial (raster recortado do arquivo da WSN; trocar por SVG quando houver vetor). */
export function Logo({ className }: { className?: string }) {
  return (
    <img
      src={logo480}
      srcSet={`${logo480} 480w, ${logo960} 960w`}
      sizes="(max-width: 767px) 120px, 160px"
      width={480}
      height={202}
      alt="WSN Descartáveis e EPI's"
      className={cn("h-auto w-[112px] md:w-[136px]", className)}
      decoding="async"
    />
  );
}

/**
 * Símbolo do logo redesenhado em SVG (arco verde, arco navy e os três pontos).
 * Usado no favicon, no fallback estático do hero e como motivo gráfico.
 */
export function Symbol({ className, title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <path d="M53.49 10.15 A40 40 0 0 0 17.23 72.94" fill="none" stroke="var(--brand-green)" strokeWidth="7.5" strokeLinecap="round" />
      <path d="M12.41 63.68 A40 40 0 0 0 82.77 72.94" fill="none" stroke="var(--brand-navy)" strokeWidth="7.5" strokeLinecap="round" />
      <circle cx="66.27" cy="13.46" r="3.4" fill="var(--brand-navy)" />
      <circle cx="75.71" cy="19.36" r="3.8" fill="var(--brand-navy)" />
      <circle cx="83.16" cy="27.63" r="3.8" fill="var(--brand-navy)" />
    </svg>
  );
}
