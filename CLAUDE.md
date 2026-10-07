# CLAUDE.md — Manual operacional do site WSN Distribuidora (v2)

Leia no início de toda sessão. Ele vence os padrões genéricos.

## O que é

Site + sistema comercial da **WSN Distribuidora** (descartáveis, EPIs e limpeza, São
Paulo, desde 2006). O visitante B2B monta uma **cotação** (sem preço público), a
equipe responde com uma **proposta** precificada por link pessoal, e o cliente
**aprova online**. O painel mede conversão, tempo de resposta e demanda não atendida.

Um único Worker da Cloudflare serve tudo (plano gratuito):

- `src/` — React 19 + React Router 7 (SPA) + Tailwind 4 por tokens.
- `worker/` — API Hono + D1 (SQLite) + R2 (fotos enviadas) + Cron Triggers.
- `shared/` — regras de negócio puras usadas nos dois lados (zod, validações BR, totais).
- `migrations/` — esquema D1. `scripts/` — seed, imagens, link de admin.

## Regra Zero — memória antes de agir

1. Ler `docs/memory/README.md`.
2. Consultar `docs/memory/decisions/` — não contradizer decisão sem falar com o Fábio.
3. Consultar `docs/memory/gotchas/` e o último `docs/memory/handoffs/`.
4. Ao fim da sessão: handoff novo + decisões/gotchas que surgiram. Doc que mente é pior que nenhum.

`docs/memory/` é continuidade de sessão de IA. `docs/project/` é para pessoas.
A spec viva é `docs/specs/2026-10-07-wsn-v2-replataforma-design.md` (regras R-*).

## Inegociáveis

- **Preço nunca é público** (R-CAT-4). `price_cents` não sai em rota pública; teste cobre.
- **Dado pessoal só cifrado** (`*_enc`, AES-256-GCM com AAD por linha) e buscado por `*_hash`.
  Log sem PII. Nada de e-mail/telefone em `audit_log.detail`.
- **Copy preservada.** Texto vive em `src/content/`; não reescrever sem pedido. O que é
  duvidoso usa `<Pendente>` (selo "a confirmar" em `?revisao=1`).
- **Tokens, não valores.** Cor/espaço/raio/z-index/movimento em `src/styles/tokens.css`.
  Tailwind só tem cores de papel (`bg-raised`, `text-strong`…); `blue-600` não existe.
- **Mobile-first 375px**, a11y estrutural (`Field` liga label/erro), `prefers-reduced-motion`.
- **KISS no plano gratuito**: 10 ms de CPU por requisição. Nada de hash de senha
  (login é link mágico), nada de decifrar centenas de linhas por request.
- Regras de negócio novas entram em `shared/` com teste em `test/domain.test.ts`.

## Comandos

```
npm run dev              # site + API + D1 local em http://localhost:5173
npm run check            # lint + typecheck + testes (workerd)
npm run db:migrate:local && npm run db:seed:local
npm run admin:link -- email@x.com "Nome" admin   # link de acesso local
npm run images           # regenera WebP a partir de assets/originais
npm run deploy           # build + wrangler deploy (ver docs/project/05-operacao.md)
```

## Validação de qualquer mudança

`npm run check` verde + página afetada vista em 375 / 768 / 1280 (sem rolagem
horizontal, sem erro de console). Fluxo crítico: cotação → proposta → aprovação.
