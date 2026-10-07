# WSN Distribuidora — site e sistema comercial (v2)

Site oficial da **WSN Distribuidora** (descartáveis, EPIs e produtos de limpeza, São Paulo,
desde 2006) com catálogo, **cotação online**, **propostas com aprovação pelo cliente** e
**painel comercial**.

- Front: React 19, React Router 7, Tailwind 4 (design system por tokens), Three.js no hero.
- API: Cloudflare Workers + Hono, banco D1, fotos em R2, antirrobô Turnstile, Cron Triggers.
- Segurança: dados pessoais cifrados por campo (AES-256-GCM), login sem senha, auditoria
  somente-inclusão, LGPD (retenção e anonimização).

## Rodar localmente

```bash
npm install
cp .dev.vars.example .dev.vars        # preencha as chaves (instruções no arquivo)
npm run db:migrate:local
npm run db:seed:local
npm run dev                            # http://localhost:5173
npm run admin:link -- voce@email.com "Seu nome" admin   # link de acesso ao /admin
```

`npm run check` roda lint, checagem de tipos e os testes (no runtime do Workers).

## Documentação

- `CLAUDE.md` — regras do projeto (comece aqui).
- `docs/specs/` — especificação e regras de negócio (R-*).
- `docs/project/00-proposta-de-valor.md` — o que o sistema entrega.
- `docs/project/05-operacao.md` — deploy, segredos, backup.
- `docs/memory/` — decisões, armadilhas conhecidas e handoffs de cada sessão.

## Direitos

Projeto proprietário, desenvolvido para a WSN Distribuidora. Uso, cópia ou redistribuição
dependem de autorização dos titulares.
