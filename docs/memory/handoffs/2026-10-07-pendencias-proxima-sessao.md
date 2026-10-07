# Handoff 2026-10-07 — O QUE FALTA (ler primeiro na próxima sessão)

> Se o Fábio perguntar "o que falta?", responda com a lista abaixo, na ordem.
> Estado do código: branch `v2` no GitHub (commits 54a5c79 → 9c7e939), tudo verde
> (29 testes, lint, tipos, fluxo ponta a ponta). Design "Fresco & Confiável" **aprovado**.
> `main` ainda é o site v1 (Vercel). Nada foi publicado na Cloudflare ainda.

## 1. Deploy na Cloudflare — BLOQUEADO esperando o Fábio
- [ ] Fábio roda `! npx wrangler login` (interativo, navegador). Sem isso nada abaixo anda.
- [ ] `npx wrangler d1 create wsn` → copiar `database_id` para `wrangler.jsonc`
- [ ] `npx wrangler r2 bucket create wsn-media`
- [ ] `npm run db:migrate:remote` e `npm run db:seed:remote`
      (o seed usa `data/precos.local.json` — existe só na máquina do Fábio, fora do git)
- [ ] Gerar e cadastrar segredos: `PII_KEYS`, `PII_ACTIVE_KEY`, `HMAC_KEY`, `TURNSTILE_SECRET`
      (`wrangler secret put ...`). **Guardar as chaves PII em cofre** — sem elas os dados não decifram.
- [ ] Em `wrangler.jsonc` → `vars`: `APP_URL` (URL workers.dev), `ENVIRONMENT: "production"`
      só quando houver Turnstile real (com segredo de teste o Worker recusa produção de propósito;
      para o primeiro deploy pode ficar `staging`).
- [ ] `npm run deploy` → site em `wsn.<conta>.workers.dev`
- [ ] `APP_URL=<url> npm run admin:link -- alvarofillipe6@gmail.com "Fábio" admin --remote`
- [ ] Rodar uma cotação real ponta a ponta em produção.
Roteiro completo: `docs/project/05-operacao.md`.

## 2. Depende do Fábio / da WSN (não técnico)
- [ ] **Repositório GitHub é PÚBLICO** e o histórico tem a tabela de preços antiga → tornar privado
      (GitHub → Settings → Danger Zone → Change visibility). Não fazer sem o Fábio pedir.
- [ ] Domínio `wsndistribuidora.com.br` na Cloudflare (acesso ao registro.br) → Custom Domain
      + widget Turnstile real (`TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET`).
- [ ] E-mail real: verificar o domínio no Resend e `wrangler secret put RESEND_API_KEY`
      (sem isso os e-mails só vão para o log; o outbox reenvia depois).
- [ ] Confirmar copy marcada "a confirmar" (ver com `?revisao=1`): 300+ produtos (catálogo tem 60),
      500+ clientes, 100% comprometimento, textos de sustentabilidade ("fabricação",
      "linha biodegradável"), telefone fixo (3789-3789 × 4070-5300). WhatsApp assumido: (11) 97384-6070.
- [ ] Logo em vetor (SVG) — hoje é PNG recortado; com vetor dá para tema escuro e mais nitidez.
- [ ] Fotos de produto em alta resolução (as atuais têm ~200 px).
- [ ] Cadastrar o Wesley (admin) e vendedores pelo painel → Equipe e LGPD.
- [ ] Revisar política de privacidade e termos com o jurídico da WSN (`src/content/legal.ts`).

## 3. Depois do deploy
- [ ] Abrir PR `v2` → `main` e desligar o projeto antigo na Vercel quando o domínio migrar.
- [ ] Medir Lighthouse (critério 8 da spec nunca foi medido).
- [ ] Conversa comercial com o Wesley usando `docs/project/00-proposta-de-valor.md`.

## Avisos para a próxima sessão
- Servidor local foi encerrado por falta de memória do Windows (não é bug). Subir com `npm run dev`
  só quando o Fábio pedir. Link de admin local: `npm run admin:link -- alvarofillipe6@gmail.com "Fábio" admin`.
- Screenshots com Git Bash: usar `MSYS_NO_PATHCONV=1` ao passar caminhos começando com "/".
- Design: pesquisar referências do setor antes de qualquer mudança visual (decisão "Fresco & Confiável").
