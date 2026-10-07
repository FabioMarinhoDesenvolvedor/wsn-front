# Importar `@shared/quote` ou `@shared/proposal` puxa o zod para o site público

O bundle principal caiu de 179 KB para 153 KB gzip ao tirar o zod. Regras:
- Carrinho/catálogo importam limites de `@shared/quote-limits` (sem dependências).
- `refSchema` mora em `shared/quote.ts`, não em `shared/catalog.ts`.
- Páginas que validam com zod (`QuotePage`, `ProposalPage`, painel) são `lazy()`.

Conferir: `grep -c ZodError dist/client/assets/index-*.js` deve dar 0.
