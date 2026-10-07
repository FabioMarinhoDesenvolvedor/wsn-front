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
          className="absolute inset-[10%] size-[80%] object-contain mix-blend-multiply transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          style={{ viewTransitionName: `product-${product.ref}` }}
        />
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted">
          <span className="text-3xl font-bold tracking-tight">{product.ref}</span>
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
          <ProductImage product={product} imgRef={imageRef} className="size-16 rounded-md bg-photo" />
        </Link>
        <span className="hidden text-sm font-semibold text-muted tabular sm:block">Ref. {product.ref}</span>
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
    <li className="card card-hover group relative flex flex-col overflow-hidden">
      <Link to={href} viewTransition className="flex flex-1 flex-col rounded-lg focus-visible:outline-offset-[-3px]">
        <div className="p-2.5 pb-0">
          <ProductImage product={product} imgRef={imageRef} className="rounded-md bg-photo" />
        </div>
        <RefTag value={product.ref} className="absolute top-4 left-4" />
        <div className="flex flex-1 flex-col gap-1 px-4 pt-3 pb-3">
          {brandName ? <p className="text-xs font-bold text-accent-text">{brandName}</p> : categoryName && <p className="text-xs font-semibold text-muted">{categoryName}</p>}
          <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold tracking-normal text-strong">{product.name}</h3>
          <p className="mt-auto pt-1 text-[13px] text-muted">Vendido por {unitLabel(product.unit)}</p>
        </div>
      </Link>
      <div className="px-4 pb-4">
        <AddToQuote productRef={product.ref} productName={product.name} imageRef={imageRef} />
      </div>
    </li>
  );
}
