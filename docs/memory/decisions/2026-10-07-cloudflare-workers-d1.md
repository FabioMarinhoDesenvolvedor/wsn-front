# Cloudflare Workers + D1 no lugar de Render/NestJS + Postgres

- **Data**: 2026-10-07 · **Status**: aprovada (Fábio pediu "Render ou algum gratuito melhor")
- **Substitui**: §5 da spec original (NestJS + Prisma + PostgreSQL)

## Contexto
O projeto não gera receita recorrente ao Fábio; hospedagem precisa ser gratuita e o
site precisa responder rápido na primeira cotação do dia.

## Decisão
Um único Worker serve a SPA (Static Assets), a API (Hono), o SEO por produto
(HTMLRewriter) e os jobs (Cron Triggers). Banco D1, fotos enviadas em R2,
antirrobô Turnstile. Tudo no plano gratuito, uso comercial permitido.

## Por quê
- Render gratuito dorme após 15 min e leva 30–60 s para acordar (cotação travada).
- Workers não tem cold start perceptível; D1/R2/Turnstile/Cron são do mesmo provedor.
- Uma origem só: sem CORS, cookie `__Host-` simples, deploy único.

## Custos aceitos
- 10 ms de CPU por requisição → sem hash de senha (ver decisão do link mágico),
  exportação CSV paginada em 300 linhas, decifrar só o que a tela mostra.
- SQLite: busca por nome de cliente é impossível com PII cifrada — busca exata por
  protocolo ou e-mail (hash). Aceito.
- Raw SQL + repositórios por módulo em vez de ORM (10 tabelas, KISS).
