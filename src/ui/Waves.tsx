import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Onda da marca, redesenhada a partir dos banners originais da WSN:
 * faixa navy → azul-claro, um respiro branco e a faixa verde-oliva.
 * `to` é a cor da seção seguinte (a onda "desemboca" nela).
 */
export function Waves({ to = "#ffffff", className, flip }: { to?: string; className?: string; flip?: boolean }) {
  const id = useId();
  return (
    <svg
      viewBox="0 0 1440 140"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("block h-[56px] w-full md:h-[110px]", flip && "-scale-y-100", className)}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0b3a6b" />
          <stop offset="0.55" stopColor="#2f6aa6" />
          <stop offset="1" stopColor="#8cbce6" />
        </linearGradient>
      </defs>
      <path d="M0 8 C 380 92, 980 118, 1440 22 L1440 140 L0 140 Z" fill={`url(#${id}-g)`} />
      <path d="M0 40 C 380 118, 980 138, 1440 56 L1440 140 L0 140 Z" fill="#ffffff" />
      <path d="M0 50 C 380 126, 980 144, 1440 68 L1440 140 L0 140 Z" fill="#6f8f22" />
      <path d="M0 78 C 380 140, 980 150, 1440 98 L1440 140 L0 140 Z" fill={to} />
    </svg>
  );
}
