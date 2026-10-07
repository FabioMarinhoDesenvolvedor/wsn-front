import { ArrowLeft, MessageCircle, PackageCheck, Truck } from "lucide-react";
import { useRef } from "react";
import { Link, Navigate, useParams } from "react-router";
import { parseProductSegment, productPath, unitLabel } from "@shared/catalog";
import { company, whatsappLink } from "@shared/company";
import { useDocumentTitle } from "@/lib/hooks";
import { AnchorButton, LinkButton } from "@/ui/Button";
import { EmptyState, RefTag, Skeleton } from "@/ui/bits";
import { AddToQuote } from "../quote/AddToQuote";
import { categoryIcon, useCatalog, useCatalogIndex } from "./data";
import { ProductCard, ProductImage } from "./ProductCard";

export function ProductPage() {
  const { segment = "" } = useParams();
  const parsed = parseProductSegment(segment);
  const { data, isLoading } = useCatalog();
  const idx = useCatalogIndex(data);
  const imageRef = useRef<HTMLDivElement>(null);
  const product = parsed ? idx.productByRef.get(parsed.ref) : undefined;
  useDocumentTitle(product ? `${product.name} · Ref. ${product.ref}` : "Produto");

  if (isLoading) {
    return (
      <div className="container-page grid gap-10 py-14 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-16" />
          <Skeleton className="h-12 w-60" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-page py-20">
        <EmptyState
          title="Produto indisponível"
          action={<LinkButton to="/produtos">Ver catálogo completo</LinkButton>}
        >
          Este produto saiu do catálogo ou o endereço está incorreto. Veja produtos similares no catálogo ou fale com a gente.
        </EmptyState>
      </div>
    );
  }
  // URL com nome antigo → canônica (o Worker já faz 301 na primeira carga).
  if (parsed && parsed.slug !== product.slug) return <Navigate to={productPath(product)} replace />;

  const category = idx.categoryById.get(product.categoryId);
  const brand = product.brandId ? idx.brandById.get(product.brandId) : undefined;
  const CategoryIcon = categoryIcon(category?.slug ?? "");
  const similar = (data?.products ?? []).filter((p) => p.categoryId === product.categoryId && p.ref !== product.ref).slice(0, 4);

  const specs: [string, React.ReactNode][] = [
    ["Referência", <span className="tabular">{product.ref}</span>],
    ["Unidade de venda", unitLabel(product.unit)],
    ["Categoria", category ? <Link className="link-grow" to={`/produtos/c/${category.slug}`}>{category.name}</Link> : "—"],
    ["Marca", brand?.name ?? "—"],
  ];

  return (
    <div className="pb-[var(--section)]">
      <div className="container-page pt-6">
        <nav aria-label="Trilha" className="flex items-center gap-2 text-sm text-muted">
          <Link to="/produtos" viewTransition className="inline-flex items-center gap-1 hover:text-strong">
            <ArrowLeft className="size-4" /> Catálogo
          </Link>
          {category && (
            <>
              <span aria-hidden>/</span>
              <Link to={`/produtos/c/${category.slug}`} viewTransition className="hover:text-strong">
                {category.name}
              </Link>
            </>
          )}
        </nav>
      </div>

      <article className="container-page mt-6 grid gap-8 md:grid-cols-[1.05fr_1fr] md:gap-14">
        <div className="relative">
          <ProductImage product={product} imgRef={imageRef} eager className="rounded-xl bg-photo md:sticky md:top-[calc(var(--header-h)+24px)]" />
          <RefTag value={product.ref} inverse className="absolute top-4 left-4" />
        </div>

        <div className="flex flex-col gap-6">
          <p className="label flex items-center gap-2">
            <CategoryIcon className="size-4 text-accent-text" /> {category?.name}
            {brand && <span>· {brand.name}</span>}
          </p>
          <h1 className="display-2 text-[clamp(30px,3.4vw,48px)]">{product.name}</h1>
          {product.description && <p className="lead">{product.description}</p>}

          <div className="card flex flex-col gap-3 p-5">
            <p className="text-sm text-muted">
              Quantidade em <strong className="text-strong">{unitLabel(product.unit, 2)}</strong>. O preço vem na proposta, de acordo com volume e região.
            </p>
            <AddToQuote productRef={product.ref} productName={product.name} imageRef={imageRef} size="md" />
            <AnchorButton variant="ghost" external href={whatsappLink(`Olá! Tenho interesse no produto Ref. ${product.ref} — ${product.name}.`)}>
              <MessageCircle className="size-4 text-whatsapp" /> Tirar dúvida no WhatsApp
            </AnchorButton>
          </div>

          <dl className="divide-y divide-line border-y border-line">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-[150px_1fr] gap-4 py-3 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="text-strong">{v}</dd>
              </div>
            ))}
          </dl>

          <ul className="grid gap-3 text-sm text-body sm:grid-cols-2">
            <li className="flex gap-3">
              <Truck className="size-5 shrink-0 text-accent-text" /> Entregas para São Paulo e todo Brasil
            </li>
            <li className="flex gap-3">
              <PackageCheck className="size-5 shrink-0 text-accent-text" /> Pedido mínimo de {company.minimumOrderSpCapital} para São Paulo capital
            </li>
          </ul>
        </div>
      </article>

      {similar.length > 0 && (
        <section className="container-page mt-[var(--section)]" aria-labelledby="similares">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 id="similares" className="display-3">
              Mais em {category?.name}
            </h2>
            {category && (
              <Link to={`/produtos/c/${category.slug}`} viewTransition className="link-grow text-sm font-medium text-strong">
                Ver todos
              </Link>
            )}
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} brandName={p.brandId ? idx.brandById.get(p.brandId)?.name : null} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
