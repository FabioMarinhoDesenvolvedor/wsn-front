// SEO sem SSR: o Worker entrega o mesmo index.html da SPA, mas com título, descrição,
// Open Graph, canonical e JSON-LD do produto já no HTML (HTMLRewriter, custo de CPU mínimo).
// Admin edita o catálogo e o Google vê a mudança na hora — sem rebuild.
import { parseProductSegment, productPath, unitLabel } from "../shared/catalog";
import { company } from "../shared/company";
import type { Env } from "./env";
import { findProductByRef } from "./modules/catalog";

interface PageMeta {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  jsonLd?: object;
  noindex?: boolean;
  status?: number;
}

const escapeJson = (o: object) => JSON.stringify(o).replace(/</g, "\\u003c");

async function renderWithMeta(env: Env, request: Request, meta: PageMeta): Promise<Response> {
  const shell = await env.ASSETS.fetch(new Request(new URL("/", request.url), { headers: request.headers }));
  const origin = new URL(request.url).origin;
  const abs = (p: string) => (p.startsWith("http") ? p : `${origin}${p}`);

  const rewritten = new HTMLRewriter()
    .on("title", { element: (el) => void el.setInnerContent(meta.title) })
    .on('meta[name="description"]', { element: (el) => void el.setAttribute("content", meta.description) })
    .on('meta[property="og:title"]', { element: (el) => void el.setAttribute("content", meta.title) })
    .on('meta[property="og:description"]', { element: (el) => void el.setAttribute("content", meta.description) })
    .on('meta[property="og:url"]', { element: (el) => void el.setAttribute("content", abs(meta.canonical ?? new URL(request.url).pathname)) })
    .on('meta[property="og:image"]', { element: (el) => void (meta.image && el.setAttribute("content", abs(meta.image))) })
    .on("head", {
      element(el) {
        if (meta.noindex) el.append('<meta name="robots" content="noindex, nofollow">', { html: true });
        if (meta.canonical) el.append(`<link rel="canonical" href="${abs(meta.canonical)}">`, { html: true });
        if (meta.jsonLd) el.append(`<script type="application/ld+json">${escapeJson(meta.jsonLd)}</script>`, { html: true });
      },
    })
    .transform(shell);

  const headers = new Headers(rewritten.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=300, must-revalidate");
  if (meta.noindex) headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(rewritten.body, { status: meta.status ?? 200, headers });
}

export async function handlePage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean);

  if (parts[0] === "proposta") {
    return renderWithMeta(env, request, {
      title: `Proposta comercial · ${company.name}`,
      description: "Proposta comercial pessoal da WSN Distribuidora.",
      noindex: true,
    });
  }

  // /produtos/:ref-slug
  if (parts[0] === "produtos" && parts.length === 2) {
    const parsed = parseProductSegment(decodeURIComponent(parts[1]));
    const product = parsed ? await findProductByRef(env.DB, parsed.ref) : null;
    if (!product) {
      return renderWithMeta(env, request, {
        title: `Produto não encontrado · ${company.name}`,
        description: "Este produto não está no catálogo. Busque por nome ou referência.",
        noindex: true,
        status: 404,
      });
    }
    const canonical = productPath(product);
    if (url.pathname !== canonical) return Response.redirect(new URL(canonical, url).toString(), 301);

    const description = `${product.name} — Ref. ${product.ref}, vendido por ${unitLabel(product.unit)}. ${product.categoryName} para empresas: solicite sua cotação com a ${company.name}.`;
    return renderWithMeta(env, request, {
      title: `${product.name} · Ref. ${product.ref} · ${company.name}`,
      description,
      canonical,
      image: product.imagePath ?? "/images/og-logo.png",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.name,
        sku: product.ref,
        category: product.categoryName,
        ...(product.brandName ? { brand: { "@type": "Brand", name: product.brandName } } : {}),
        ...(product.imagePath ? { image: new URL(product.imagePath, url).toString() } : {}),
        description,
        // Sem "offers": o preço não é público (R-CAT-4).
      },
      // R-CAT-5: inativo continua respondendo (preserva links), mas sai do índice.
      noindex: !product.active,
    });
  }

  return env.ASSETS.fetch(request);
}
