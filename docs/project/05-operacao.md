# 05 — Operação: deploy, segredos, backup

Tudo roda no plano **gratuito** da Cloudflare (Workers, D1, R2, Turnstile, Cron).

## Primeiro deploy (uma vez)

```bash
npx wrangler login                                  # abre o navegador (conta do Fábio/WSN)
npx wrangler d1 create wsn                          # copie o database_id para wrangler.jsonc
npx wrangler r2 bucket create wsn-media
npm run db:migrate:remote
npm run db:seed:remote                              # precisa de data/precos.local.json para preços internos

# Segredos (gere cada chave com: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
npx wrangler secret put PII_KEYS          # {"1":"<chave>"}  — GUARDE em cofre: sem ela os dados não decifram
npx wrangler secret put PII_ACTIVE_KEY    # 1
npx wrangler secret put HMAC_KEY          # <outra chave>
npx wrangler secret put TURNSTILE_SECRET  # do painel Cloudflare → Turnstile (widget do domínio)
npx wrangler secret put RESEND_API_KEY    # opcional; exige domínio verificado no Resend
```

Em `wrangler.jsonc` → `vars`: `APP_URL` (URL pública), `TURNSTILE_SITE_KEY` (a pública
do widget), `ENVIRONMENT: "production"` (com segredo de teste do Turnstile o Worker se
recusa a rodar em produção — de propósito).

```bash
npm run deploy
APP_URL=https://<url> npm run admin:link -- wesley@... "Wesley" admin --remote
```

## Domínio
Adicionar `wsndistribuidora.com.br` à Cloudflare (troca de nameservers no registro.br) e
ligar o Worker como Custom Domain. Até lá, o site funciona em `wsn.<conta>.workers.dev`.

## Rotina
- **Cron `*/15`**: reenvia e-mails pendentes (backoff exponencial, 8 tentativas).
- **Cron diário 06:00 SP**: expira propostas vencidas, anonimiza dados com mais de 24
  meses (cotações não convertidas e contatos), limpa sessões/tokens/limites antigos.
- **Backup**: D1 tem Time Travel (restauração a qualquer minuto dos últimos dias:
  `wrangler d1 time-travel restore wsn --timestamp=...`). Exportação manual mensal:
  `wrangler d1 export wsn --remote --output=backup-AAAA-MM.sql` (o arquivo contém dados
  cifrados; guarde junto com a chave em local separado).
- **Rotação de chave PII**: adicionar `"2":"<nova>"` em `PII_KEYS`, `PII_ACTIVE_KEY=2`;
  dados antigos continuam legíveis pela v1.

## Atualizar catálogo
Pelo painel (`/admin/catalogo`). Mudanças aparecem no site e no Google na hora (o Worker
gera título/descrição por produto). Foto: botão "Trocar foto" (reduzida no navegador).
