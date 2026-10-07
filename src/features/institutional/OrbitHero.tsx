import { CupSoda, HardHat, Package, SprayCan } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { Symbol } from "@/ui/Logo";
import type { OrbitScene } from "./orbit-scene";

/**
 * Palco do hero. O SVG estático é sempre renderizado (é o LCP e o fallback);
 * o canvas 3D entra por cima quando: há WebGL, movimento permitido, sem
 * economia de dados e tela ≥ 768px. Render só com o palco visível e a aba ativa.
 */
export function OrbitStage({ trackRef }: { trackRef: React.RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
    if (!canvas || !track || reduced || nav.connection?.saveData || window.innerWidth < 768) return;

    let scene: OrbitScene | null = null;
    let disposed = false;
    let visible = true;
    const cleanups: (() => void)[] = [];

    void import("./orbit-scene").then(({ createOrbitScene, supportsWebGL }) => {
      if (disposed || !supportsWebGL()) return;
      try {
        scene = createOrbitScene(canvas, { lowPower: (navigator.hardwareConcurrency ?? 8) <= 4 });
      } catch {
        return; // GPU indisponível: fica o SVG
      }
      setReady(true);

      const onScroll = () => {
        const r = track.getBoundingClientRect();
        scene?.setProgress(Math.min(1, Math.max(0, -r.top / (r.height * 0.4))));
      };
      const onPointer = (e: PointerEvent) => scene?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      const onResize = () => scene?.resize();
      const sync = () => scene?.setActive(visible && document.visibilityState === "visible");
      const io = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        sync();
      });
      io.observe(canvas);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("resize", onResize);
      document.addEventListener("visibilitychange", sync);
      cleanups.push(() => {
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("pointermove", onPointer);
        window.removeEventListener("resize", onResize);
        document.removeEventListener("visibilitychange", sync);
      });
    });

    return () => {
      disposed = true;
      cleanups.forEach((c) => c());
      scene?.dispose();
    };
  }, [reduced, trackRef]);

  return (
    <div className="relative aspect-square w-full">
      <StaticOrbit className={cn("transition-opacity duration-700", ready && "opacity-0")} />
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn("absolute inset-[-12%] size-[124%] transition-opacity duration-700", ready ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}

/** Estado estático: símbolo + categorias ao redor (movimento reduzido, mobile, sem WebGL). */
function StaticOrbit({ className }: { className?: string }) {
  const items = [
    { Icon: SprayCan, label: "Limpeza", pos: "left-[2%] top-[14%]", tone: "bg-green text-white" },
    { Icon: CupSoda, label: "Descartáveis", pos: "right-[2%] top-[18%]", tone: "bg-white text-navy border border-line" },
    { Icon: HardHat, label: "EPIs", pos: "right-[4%] bottom-[16%]", tone: "bg-signal text-[#0d1b2a]" },
    { Icon: Package, label: "Embalagens", pos: "left-[4%] bottom-[12%]", tone: "bg-[#c79a5b] text-white" },
  ];
  return (
    <div className={cn("absolute inset-0", className)} aria-hidden>
      <Symbol className="absolute inset-[18%]" />
      {items.map(({ Icon, label, pos, tone }) => (
        <div key={label} className={cn("absolute flex items-center gap-2", pos)}>
          <span className={cn("grid size-12 place-items-center rounded-pill md:size-14", tone)}>
            <Icon className="size-6" />
          </span>
          <span className="label hidden !text-strong sm:inline">{label}</span>
        </div>
      ))}
    </div>
  );
}
