import { useRef } from "react";
import { Link } from "react-router";
import { productPath, unitLabel, type PublicProduct } from "@shared/catalog";
import { cn } from "@/lib/cn";
import { RefTag } from "@/ui/bits";
import { AddToQuote } from "../quote/AddToQuote";

/** Foto em quadro neutro; sem foto, um placeholder tipográfico com a ref (R-CAT-6). */
export function ProductImage({
  product,
  className,
  imgRef,
  eager,
}: {
  product: Pick<PublicProduct, "ref" | "name" | "imagePath">;
  className?: string;
  imgRef?: React.Ref<HTMLDivElement>;
  eager?: boolean;
}) {
  return (
    <div ref={imgRef} className={cn("relative grid aspect-square place-items-center overflow-hidden bg-white", className)}>
      {product.imagePath ? (
        <img
          src={product.imagePath}
          alt={product.name}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="size-[78%] object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          style={{ viewTransitionName: `product-${product.ref}` }}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-[#5d6b7a]">
          <span className="font-mono text-3xl tracking-tight">{product.ref}</span>
          <span className="label">foto em breve</span>
        </div>
      )}
    </div>
  );
}

interface Props {
  product: PublicProduct;
  categoryName?: string;
  brandName?: string | null;
  view?: "grid" | "list";
}

export function ProductCard({ product, categoryName, brandName, view = "grid" }: Props) {
  const imageRef = useRef<HTMLDivElement>(null);
  const href = productPath(product);

  if (view === "list") {
    return (
      <li className="group grid grid-cols-[64px_1fr] items-center gap-4 border-b border-line py-3 sm:grid-cols-[64px_88px_1fr_120px_180px]">
        <Link to={href} viewTransition tabIndex={-1} aria-hidden>
          <ProductImage product={product} imgRef={imageRef} className="size-16 rounded-md border border-line" />
        </Link>
        <span className="hidden font-mono text-sm text-muted tabular sm:block">{product.ref}</span>
        <div className="min-w-0">
          <Link to={href} viewTransition className="link-grow font-medium text-strong">
            {product.name}
          </Link>
          <p className="text-sm text-muted sm:hidden">
            Ref {product.ref} · {unitLabel(product.unit)}
          </p>
        </div>
        <span className="hidden text-sm text-muted sm:block">por {unitLabel(product.unit)}</span>
        <div className="col-span-2 sm:col-span-1">
          <AddToQuote productRef={product.ref} productName={product.name} imageRef={imageRef} />
        </div>
      </li>
    );
  }

  return (
    <li className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-raised transition-[border-color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-line-strong">
      <Link to={href} viewTransition className="flex flex-1 flex-col focus-visible:outline-offset-[-3px]">
        <ProductImage product={product} imgRef={imageRef} className="border-b border-line" />
        <RefTag value={product.ref} className="absolute top-3 left-3 group-hover:bg-navy group-hover:text-white" />
        <div className="flex flex-1 flex-col gap-2 p-4 pb-3">
          {(categoryName || brandName) && <p className="label truncate">{[categoryName, brandName].filter(Boolean).join(" · ")}</p>}
          <h3 className="line-clamp-2 font-sans text-[15px] leading-snug font-medium tracking-normal text-strong">{product.name}</h3>
          <p className="mt-auto text-[13px] text-muted">Vendido por {unitLabel(product.unit)}</p>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToQuote productRef={product.ref} productName={product.name} imageRef={imageRef} />
      </div>
    </li>
  );
}
