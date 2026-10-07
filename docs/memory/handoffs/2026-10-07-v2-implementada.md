# Handoff 2026-10-07 — v2 implementada

## Feito e verificado
- API (Workers/Hono/D1): catálogo público sem preço, cotação com protocolo/idempotência/
  Turnstile/limite por IP, contato, propostas versionadas com aprovação online, login por
  link mágico, papéis, auditoria somente-inclusão, insights, CSV, LGPD (retenção 24 meses
  + anonimização por titular), SEO por produto (HTMLRewriter), cron de e-mail e expiração.
- **29 testes** no workerd (`npm test`): domínio + fluxos da API + LGPD + auditoria + SEO.
- Front: Home com hero 3D, catálogo (busca instantânea, `/` global, filtros na URL,
  grade/lista, buscas sem resultado reportadas), produto, cotação 2 etapas, sobre,
  contato, legais, 404, proposta pública, painel completo.
- `tsc -b`, `eslint .` e `vite build` verdes. Fluxo ponta a ponta rodado no Chrome
  headless (cliente cota → admin propõe → cliente aprova → painel mostra R$): sem erros
  de console; 0 px de rolagem horizontal em 390 px nas páginas públicas.

## Não feito / pendente
- **Deploy**: precisa da conta Cloudflare do Fábio (`wrangler login`), criar D1/R2,
  segredos e apontar o domínio (ver `docs/project/05-operacao.md`).
- **E-mail real**: Resend exige verificar o domínio `wsndistribuidora.com.br` (DNS da
  WSN). Sem `RESEND_API_KEY`, e-mails vão para o log (o outbox guarda e reenvia).
- Copy "a confirmar" (`?revisao=1`): 300+/500+/100%, sustentabilidade, telefone fixo
  (3789-3789 × 4070-5300). WhatsApp assumido = (11) 97384-6070.
- Logo vetorial (tema escuro e nitidez), fotos reais em alta.
- Chunk 3D com 131 KB gzip (meta era 120) — carrega só no desktop, lazy. Lighthouse
  não medido (sem Lighthouse no ambiente).
- Repositório GitHub é **público** e o histórico contém a tabela de preços antiga e o
  README v1 — recomendar tornar privado.

## Próximo passo sugerido
Deploy em `*.workers.dev`, criar o Wesley como admin, rodar uma cotação real, depois DNS.

## Atualização (mesmo dia) — redesign
Design "Ficha Técnica" rejeitado pelo Fábio. Refeito como "Fresco & Confiável" após pesquisa
de referências (ver decisão). Three.js removido; bundle principal sem zod. 29 testes, lint,
tipos e fluxo ponta a ponta verdes; 0 px de rolagem horizontal em 390 px. Próximo: Fábio
validar visualmente em http://localhost:5173 (desktop e celular).
