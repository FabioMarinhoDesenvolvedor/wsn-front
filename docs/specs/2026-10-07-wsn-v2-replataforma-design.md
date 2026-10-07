# WSN v2 — Replataforma: spec de design, regras de negócio e arquitetura

- **Data**: 2026-10-07
- **Status**: aprovada e **implementada** em 2026-10-07 (ver "Revisão 1" no fim — ela prevalece sobre o corpo onde divergirem)
- **Escopo**: transformar o site-vitrine estático (React + Vite, sem backend) em um
  produto completo: catálogo B2B com pedido de cotação real, backend seguro,
  painel administrativo, design system próprio e camada de movimento/3D.
- **Invariante**: a **copy existente é preservada** (textos de Home, Nossa História,
  Missão/Visão/Valores, Sustentabilidade, Contato, FAQ). Ela muda de lugar
  (vira dado em `content/`), não de texto. Afirmações não verificáveis ficam
  marcadas como "a confirmar" (§8), nunca reescritas em silêncio.

---

## 1. Auditoria do estado atual (o que motiva a v2)

Problemas encontrados lendo o código em `main` (d1cd304). Os três primeiros são
**de negócio**, não estéticos:

| # | Problema | Onde | Impacto |
|---|----------|------|---------|
| 1 | **Pedido de orçamento não envia.** EmailJS com `seu_service_id` / `seu_template_id` / `seu_user_id` placeholders | `src/components/Cart.tsx:95-97` | Todo lead do carrinho falha (cai no `catch` → alert de erro) |
| 2 | **Formulário de contato só faz `console.log`** e mostra "enviado" | `src/pages/Contact.tsx` `handleSubmit` | Cliente acha que enviou; WSN nunca recebe |
| 3 | **Preços expostos publicamente** no `public/catalogo_produtos.json` (`preco`), embora o site não os mostre | `public/catalogo_produtos.json` | Tabela de preço de custo/venda baixável por qualquer concorrente |
| 4 | ~~Foto errada por produto~~ — **corrigido na auditoria**: o índice coincidia com a ref (as refs pulam 0044–0047 como os arquivos); era frágil, não errado | `Products.tsx` `AVAILABLE_IMAGE_NUMBERS` | Agora o vínculo é explícito por ref |
| 5 | Categoria inferida no navegador por ~80 `includes()` de palavras-chave | `Products.tsx:1476-1598` | Frágil, não editável, regra de negócio no lugar errado |
| 6 | Newsletter falsa (só muda estado local) | `Footer.tsx` | Promessa não cumprida + coleta sem consentimento |
| 7 | Dois números de WhatsApp: (11) 4070-5300 e (11) 97384-6070 | `Navbar.tsx`, `Contact.tsx`, `AboutUs.tsx` | Qual é o oficial? |
| 8 | Links `#`, `goo.gl/maps/example`, botões sem ação ("Falar com Consultor", "Conhecer Produtos Sustentáveis") | Footer, Contact, AboutUs, Products | Becos sem saída |
| 9 | Paleta fora da marca: Tailwind `blue-600` genérico; o logo é **navy + verde** | todo `src/` | Site não parece da WSN |
| 10 | Logo raster com ~40% de margem branca (por isso `h-32` na navbar) | `src/assets/WSN_LOGO (1).png` | Header gigante, logo borrado em retina |
| 11 | Favicon quebrado: arquivo `WSN_FAVICON (1).png`, `href="/WSN_FAVICON.png"` | `index.html` | 404 |
| 12 | 4 bibliotecas de ícone (FA via CDN + FA npm + lucide + react-icons) + `swiper` sem uso; `Carousel.tsx` não compila (`Navigator` indefinido) | `package.json`, `Carousel.tsx` | Bundle inchado, código morto |
| 13 | `useCart` duplicado (`CartContext.ts` e `useCart.ts`) | `src/context/` | Violação DRY |
| 14 | Carrinho não persiste (refresh perde a cotação) | `CartProvider.tsx` | Abandono |
| 15 | "19 anos" fixo na Home vs `ano - 2006` calculado no Sobre (hoje = 20) | `Home.tsx`, `AboutUs.tsx` | Inconsistência |
| 16 | SEO: `<title>WSN</title>`, SPA sem meta, sem página por produto | `index.html` | Invisível no Google para "luva nitrílica caixa" |
| 17 | Sem docs de sessão (memória/decisões/handoff); README descreve `.jsx`/`pages/` que não existem | `README.md` | Nenhuma continuidade |

---

## 2. Objetivo, método, restrições, validação

- **Objetivo**: o visitante B2B (síndico, comprador de restaurante, técnico de
  segurança) encontra o produto pela referência ou nome, monta uma cotação e
  **a WSN recebe essa cotação de forma confiável**, com protocolo, e responde.
  Secundário: a marca passa a parecer uma distribuidora de 20 anos, não um template.
- **Método**: monorepo com front (Vite + React Router 7) e API (NestJS + PostgreSQL),
  regras de domínio puras e testadas, design system por tokens, entregas em fases
  com checkpoint visual.
- **Restrições**: sem checkout/pagamento online (o negócio é cotação); sem preço
  público (decisão §4.1); sem fotos de banco de imagem; sem microserviços, filas
  ou Redis na v2; nenhum segredo no bundle do navegador.
- **Validação**: critérios de aceitação (§12) + build/test/lint verdes em CI +
  passe responsivo renderizado em 375 / 768 / 1280+ por página.

---

## 3. Personas e jornada

| Persona | Chega por | Precisa |
|---------|-----------|---------|
| Comprador recorrente (restaurante, condomínio) | Google / link direto | Buscar por **Ref** ou nome, repetir pedido anterior |
| Técnico de segurança (EPIs) | Google "luva nitrílica caixa 100" | Ficha do produto, unidade de venda, CA (quando houver) |
| Primeiro contato | Indicação / Instagram | Confiar na empresa (história, marcas, endereço real) e falar rápido (WhatsApp) |
| Equipe WSN (vendedor/admin) | `/admin` | Ver cotações novas, mudar status, responder, editar catálogo |

Jornada principal: **Busca/Categoria → Produto → "Adicionar à cotação" →
Revisar cotação → Dados da empresa → Enviar → Protocolo na tela + e-mail**.

---

## 4. Regras de negócio

### 4.1 Catálogo
- **R-CAT-1** Produto é identificado por `ref` (4 dígitos, único, imutável). Slug
  derivado do nome para URL (`/produtos/0003-detergente-neutro-500-ml`); se o nome
  muda, o slug antigo redireciona 301.
- **R-CAT-2** Unidade de venda é enum: `unidade | caixa | pacote | par | fardo | galao`
  (o JSON atual usa `pct` → migra para `pacote`). Toda quantidade é na unidade de venda.
- **R-CAT-3** Categoria é **dado** (tabela), atribuída pelo admin. O classificador
  por palavra-chave atual roda **uma única vez** no seed para sugerir, e é apagado.
  Categorias iniciais: Limpeza e Higiene, Descartáveis, EPIs, Embalagens, Uniformes, Papéis.
- **R-CAT-4** **Preço não é público.** `price_cents` existe no banco como referência
  interna da equipe e **nunca** sai em endpoint público. (Se a WSN quiser "a partir
  de R$X", vira decisão nova — ver §13.)
- **R-CAT-5** Produto inativo some da busca e da listagem, mas a página
  responde "produto indisponível — veja similares na categoria" (não 404) para
  preservar SEO e links antigos.
- **R-CAT-6** Imagem é vinculada por `ref`. Produto sem foto real mostra um
  placeholder tipográfico com a `ref` (nunca a foto de outro produto).

### 4.2 Cotação (carrinho)
- **R-COT-1** A cotação em montagem vive no navegador (`localStorage`, só `ref` +
  quantidade, **sem dado pessoal**), expira em 30 dias e é revalidada contra o
  catálogo ao abrir: item inativo aparece marcado e não segue no envio.
- **R-COT-2** Quantidade inteira de 1 a 9 999 por item; no máximo 100 itens distintos.
- **R-COT-3** Envio exige: nome, e-mail, telefone BR (com DDD), CEP e aceite da
  política de privacidade. Empresa e CNPJ são opcionais; **CNPJ informado é
  validado por dígito verificador**.
- **R-COT-4** Pedido mínimo (copy do FAQ: "R$ 150,00 para São Paulo capital"):
  como preço não é público, o site **não bloqueia** — se o CEP for da capital
  (faixas 01000-000…05999-999 e 08000-000…08499-999) exibe o aviso informativo.
  A validação de valor é feita pela equipe na resposta.
- **R-COT-5** Enviada, a cotação recebe **protocolo** `WSN-AAAA-NNNNNN` sequencial
  por ano, mostrado na tela e no e-mail de confirmação. O carrinho é limpo só após
  `201` da API (hoje é limpo mesmo quando falha).
- **R-COT-6** Itens são **snapshot** (ref, nome, unidade no momento do envio):
  editar o catálogo depois não altera cotações antigas.
- **R-COT-7** Ciclo de vida (só a equipe muda, cada mudança grava evento):

  ```
  recebida → em_analise → respondida → ganha
                     ↘         ↘→ perdida
                      cancelada      expirada (respondida há 30 dias sem retorno)
  ```
- **R-COT-8** Idempotência: o envio carrega uma `Idempotency-Key` gerada no
  cliente; duplo clique/reenvio não cria duas cotações.
- **R-COT-9** Antiabuso: honeypot + Cloudflare Turnstile + limite de 5 envios/hora
  por IP (IP guardado só como hash com sal rotativo).

### 4.3 Contato e newsletter
- **R-CON-1** Formulário de contato vira mensagem persistida + e-mail para a WSN
  (mesmo antiabuso de R-COT-9).
- **R-NEW-1** Newsletter com **double opt-in** (link de confirmação com token de uso
  único, válido 48h) e descadastro em um clique. Sem confirmação, não há envio.
  Alternativa KISS se a WSN não for fazer campanhas: **remover** o bloco (§13).

### 4.4 Atendimento
- **R-ATD-1** Um único número de WhatsApp oficial, definido em configuração
  (`content/company.ts`), usado em todos os pontos. Botão de WhatsApp na cotação
  pré-preenche a mensagem com o protocolo.
- **R-ATD-2** Anos de mercado sempre calculados (`ano atual − 2006`), nunca literais.

### 4.5 Privacidade (LGPD)
- **R-LGPD-1** Base legal: execução de procedimentos preliminares a contrato
  (cotação) e consentimento (newsletter). Política de privacidade e termos viram
  páginas reais (os links do rodapé hoje são `#`).
- **R-LGPD-2** Retenção: dados pessoais de cotações **perdidas/expiradas/canceladas**
  são anonimizados após 24 meses por job agendado; ganhas seguem prazo fiscal.
- **R-LGPD-3** Pedido do titular (acesso/exclusão) por e-mail do encarregado;
  o admin tem ação "anonimizar titular" que atua por hash de e-mail.

---

## 5. Arquitetura

### 5.1 Estrutura (monorepo npm workspaces)

```
wsn/
├─ apps/
│  ├─ web/          Vite + React 19 + React Router 7 (framework mode, prerender)
│  └─ api/          NestJS 11 + Prisma + PostgreSQL
├─ packages/
│  └─ shared/       schemas zod + tipos + regras puras compartilhadas (DRY)
├─ docs/
│  ├─ memory/       README (índice) · decisions/ · gotchas/ · handoffs/
│  ├─ project/      01-visao · 02-arquitetura · 03-design-system · 04-seguranca · 05-operacao
│  └─ specs/        este arquivo e os próximos
├─ CLAUDE.md        manual operacional (Regra Zero: memória antes da ação)
└─ .github/workflows/ci.yml
```

Mesmo modelo de memória do Tina Tur / Workhub: `docs/memory` é continuidade
entre sessões de IA, `docs/project` é para pessoas. Doc que mente é pior que
nenhum doc — handoff ao fim de cada sessão de trabalho.

### 5.2 Front (`apps/web`)
- **Render**: React Router 7 em framework mode com **prerender** das páginas
  institucionais, das categorias e de cada produto (60 hoje) → HTML estático no
  Vercel, ótimo para SEO, sem servidor Node no front. Ao publicar alteração no
  catálogo, o admin dispara o *deploy hook* do Vercel (rebuild ~1 min). KISS: sem
  ISR, sem SSR em runtime.
- **Pastas por feature**: `features/catalog`, `features/quote`, `features/contact`,
  `features/institutional`, `features/admin`. Cada feature: `components/`, `hooks/`,
  `api.ts`. Nada de "components/" gigante.
- **`ui/`** = primitivas do design system (Button, Field, Chip, Sheet, Dialog,
  RefTag, Section, Stat). Componentes de feature compõem primitivas, não estilizam
  do zero.
- **`content/`** = a copy atual, extraída para arquivos tipados
  (`home.ts`, `about.ts`, `faq.ts`, `company.ts`). Fonte única de textos e
  contatos — componentes não carregam strings de negócio.
- Estado do servidor com TanStack Query; estado da cotação num store pequeno
  (Zustand com `persist`) — substitui o Context duplicado.
- Um só pacote de ícones: **lucide-react**. Saem Font Awesome (CDN + npm),
  react-icons, swiper, emailjs-com, react-floating-whatsapp.

### 5.3 API (`apps/api`)
Módulos NestJS com camadas explícitas:

```
modules/<x>/
  domain/        entidades + regras puras (sem Nest, sem Prisma) → testes unitários
  application/   casos de uso (SubmitQuote, ChangeQuoteStatus, ...)
  infra/         repositório Prisma, adaptadores (e-mail, turnstile, storage)
  http/          controller + DTO (schemas de packages/shared)
```

Módulos: `catalog`, `quotes`, `contact`, `newsletter`, `auth`, `admin-users`,
`audit`, `media`, `privacy` (jobs de retenção).

### 5.4 Princípios aplicados (com exemplos concretos, não slogans)
- **KISS**: um banco, uma API, um front estático. Fila de e-mail = tabela
  `outbox` + cron do próprio Nest; só vira fila real se houver volume.
- **DRY**: o mesmo schema zod valida o formulário no navegador e o DTO na API
  (`packages/shared/quote.schema.ts`); validação de CNPJ/telefone/CEP existe uma vez.
- **SRP**: `SubmitQuote` só orquestra; protocolo vem de `ProtocolGenerator`,
  notificação de `QuoteNotifier`, persistência de `QuoteRepository`.
- **OCP/DIP**: casos de uso dependem de interfaces (`Notifier`, `CaptchaVerifier`,
  `ObjectStorage`); trocar Resend por SMTP é um adaptador novo, não um `if`.
- **ISP**: repositórios por agregado, sem um `DatabaseService` com 40 métodos.
- **LSP**: adaptadores fake usados nos testes respeitam o mesmo contrato dos reais.

---

## 6. Banco de dados (PostgreSQL 16, Prisma)

```
categories      id, slug UNIQUE, name, position, active
brands          id, slug UNIQUE, name, logo_key
products        id, ref CHAR(4) UNIQUE, slug UNIQUE, name, unit ENUM, category_id FK,
                brand_id FK NULL, description, price_cents INT NULL (interno),
                image_key NULL, active, created_at, updated_at
product_slugs   old_slug PK, product_id FK              -- redirects 301 (R-CAT-1)

quotes          id UUID, protocol UNIQUE, status ENUM, idempotency_key UNIQUE,
                name_enc, email_enc, email_hash, phone_enc, company_enc NULL,
                cnpj_enc NULL, cep, is_sp_capital BOOL, message_enc NULL,
                consent_at, ip_hash, created_at, updated_at, anonymized_at NULL
quote_items     id, quote_id FK, product_id FK NULL, ref, name, unit, quantity
quote_events    id, quote_id FK, from_status, to_status, note, actor_id FK, at

contact_messages  id, name_enc, email_enc, email_hash, phone_enc, body_enc, ...
newsletter_subs   id, email_enc, email_hash UNIQUE, status, token_hash, confirmed_at
users           id, email UNIQUE, password_hash, role ENUM(admin,vendedor),
                totp_secret_enc NULL, failed_logins, locked_until, last_login_at
sessions        id (hash do token), user_id, expires_at, ip_hash, ua
audit_log       id, actor_id, action, entity, entity_id, diff JSONB, at  -- append-only
outbox          id, kind, payload_enc, attempts, next_attempt_at, sent_at
```

Regras de banco:
- Usuário de aplicação **sem** permissão de DDL nem superuser; migrations rodam
  com outro papel no CI/CD.
- `audit_log` com `REVOKE UPDATE, DELETE` para o papel da aplicação.
- Constraints espelham as regras (`CHECK quantity BETWEEN 1 AND 9999`, enums),
  não só a camada de app.
- Hospedagem gerenciada com criptografia em repouso, TLS obrigatório, backup
  diário com retenção de 7–30 dias e **restore testado** uma vez por fase.

---

## 7. Segurança e criptografia

| Camada | Regra |
|--------|-------|
| Segredos | Só no servidor (env do host). Bundle do navegador não contém nenhuma chave. CI falha se `gitleaks` achar segredo |
| Transporte | HTTPS only, HSTS (preload), TLS no Postgres |
| PII em repouso | **AES-256-GCM em nível de campo** (`*_enc`) com chave por envelope: DEK por registro cifrada por KEK em env/KMS, com `key_version` para rotação |
| Busca sobre PII | `email_hash` = HMAC-SHA256 (chave separada) do e-mail normalizado — permite deduplicar/achar titular sem decifrar |
| Senhas | Argon2id (memória ≥ 19 MiB, t=2), bloqueio progressivo após 5 falhas, TOTP obrigatório para `admin` |
| Sessão admin | Cookie `__Host-` httpOnly, Secure, SameSite=Strict, 8h ociosas → expira; token guardado só como hash; rotação no login |
| CSRF | Double-submit token nas mutações do admin |
| Autorização | Guards por papel em toda rota `/admin/*`; `vendedor` não gerencia usuários nem exclui produtos |
| Entrada | zod em todas as bordas; limite de corpo 32 KB; texto livre renderizado como texto (sem `dangerouslySetInnerHTML`) |
| Cabeçalhos | Helmet + CSP estrita (sem `unsafe-inline`; nonces no prerender), `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin` |
| CORS | Allowlist do domínio de produção + preview |
| Rate limit | `@nestjs/throttler`: público 60 req/min/IP; envio de formulário 5/h/IP; login 5/15 min |
| Upload (admin) | Só imagem, tipo verificado por magic bytes, ≤ 5 MB, re-encodada (sharp → AVIF/WebP) e salva em storage de objetos; nunca servida do disco da API |
| Logs | Estruturados, **sem PII** (protocolo e IDs, nunca e-mail/telefone) |
| Dependências | `npm audit` + Dependabot + CodeQL no CI |

---

## 8. Copy: preservar, centralizar, sinalizar

A copy vai para `apps/web/src/content/*` **sem reescrita**. Pontos que precisam de
confirmação da WSN entram com o helper `pendente(valor, nota)` (padrão do Tina
Tur): em dev mostram selo amarelo "a confirmar"; em produção só publicam depois
de confirmados.

| Trecho | Por que confirmar |
|--------|-------------------|
| "500+ clientes satisfeitos", "300+ produtos" (catálogo tem 60), "100% comprometimento" | Números verificáveis |
| Sustentabilidade: "desde a fabricação", "linha especial de biodegradáveis", "rotas otimizadas" | WSN é distribuidora; afirmação ambiental precisa ser verdadeira |
| "Certificações: Site Seguro" | Não é certificação; vira selo factual ("Conexão segura · Dados criptografados") |
| Pagamento "Cartão, Pix, Boleto" vs FAQ "crédito, débito, PIX, transferência e boleto" | Unificar |
| WhatsApp (11) 4070-5300 vs (11) 97384-6070 | Escolher o oficial |
| Prazo "24-48h SP capital", mínimo R$150 | Ainda vigentes? |

---

## 9. Design system — direção "Ficha Técnica"

### 9.1 Referências pesquisadas
- **McMaster-Carr / Grainger**: busca por código como cidadã de primeira classe,
  densidade de informação, zero enfeite que atrapalhe o comprador.
- **Catálogos "Swiss grid" de equipamentos B2B**: grade rígida, hairlines,
  um acento só, carrinho de cotação persistente, alternância grade/lista.
- **Siteinspire (editorial/tipográfico) e Godly (movimento)**: tipografia grande
  como estrutura e movimento concentrado em poucos momentos.
- **Seus projetos**: Connections Hub (tokens por papel, hairlines em vez de
  sombras, "laranja é pontuação, não tinta", motion curto/decelerado, Three.js com
  render sob demanda e fallbacks), Clozi (cor chapada, sem glow, estado por
  forma + cor semântica, micro-labels caixa-alta, `tabular-nums`), Tina Tur
  (tokens em `:root` como fonte única, z-index tokenizado, `pendente()`, 375/768/1280).

### 9.2 Conceito
O catálogo tratado como **ficha técnica impressa**: grade de 12 colunas visível
em hairlines, a `Ref 0003` em monoespaçada como elemento gráfico, numeração de
seções (`01 — Limpeza e Higiene`), fotos de produto sobre fundo neutro uniforme.
Sério como um fornecedor industrial, limpo como o produto que vende (higiene).
**Não** é "e-commerce simulado": não há preço, estrelas, "frete grátis", badges
de promoção.

### 9.3 Tokens (fonte única: `apps/web/src/styles/tokens.css`)

Cores da marca **amostradas do PNG do logo** — confirmar com o vetor original:

```css
:root {
  /* Marca — só usadas através dos papéis abaixo */
  --brand-navy:  #0B3A6B;   /* "WSN" e arco inferior */
  --brand-green: #3E9A12;   /* "DESCARTÁVEIS E EPI'S" e arco superior */
  --brand-ink:   #0D1B2A;
  --brand-paper: #F5F6F3;   /* branco frio-neutro (higiene), não creme */
  --brand-steel: #5D6B7A;
  --brand-mist:  #DCE2E7;
  --signal:      #F2C230;   /* amarelo de sinalização de segurança — pontuação */

  /* Superfícies */
  --surface-canvas: var(--brand-paper);
  --surface-raised: #FFFFFF;
  --surface-sunken: #ECEFEB;
  --surface-deep:   var(--brand-navy);
  --surface-deepest:var(--brand-ink);

  /* Texto */
  --text-strong: var(--brand-ink);
  --text-body:   #23313F;
  --text-muted:  var(--brand-steel);
  --text-on-deep:#F5F6F3;

  /* Ação: navy = ação; verde = confirmação/sucesso de marca; amarelo = destaque raro */
  --action: var(--brand-navy);
  --action-hover: var(--brand-ink);
  --accent: var(--brand-green);
  --focus-ring: var(--signal);

  /* Semânticas (separadas do acento) */
  --ok: #1E7B45;  --warn: #B7791F;  --danger: #B42318;

  /* Linhas — hierarquia por hairline, não por sombra */
  --hairline: color-mix(in srgb, var(--brand-navy) 12%, transparent);
  --hairline-strong: color-mix(in srgb, var(--brand-navy) 28%, transparent);

  /* Espaço — base 4px */
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-6:24px;
  --space-8:32px; --space-12:48px; --space-16:64px; --space-24:96px;
  --section: clamp(72px, 9vw, 144px);
  --page-max: 1320px;
  --gutter: clamp(16px, 4vw, 56px);

  /* Forma */
  --radius-sm: 6px; --radius-md: 12px; --radius-lg: 20px; --radius-pill: 999px;

  /* Tipo */
  --font-display: "Archivo", system-ui, sans-serif;     /* eixo wdth 62–125: expandido nos títulos */
  --font-body: "Geist", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;   /* refs, protocolo, quantidades */
  --text-caption: 12px; --text-small: 14px; --text-base: 16px;
  --text-lead: clamp(18px, 1.3vw, 21px);
  --text-h3: clamp(22px, 1.8vw, 28px);
  --text-h2: clamp(34px, 4.2vw, 60px);
  --text-h1: clamp(44px, 7vw, 112px);
  --tracking-display: -0.035em; --tracking-label: 0.12em;

  /* Movimento — curto, desacelerado, nunca elástico */
  --ease-out: cubic-bezier(.22, 1, .36, 1);
  --ease-standard: cubic-bezier(.2, 0, 0, 1);
  --dur-fast: 160ms; --dur-base: 280ms; --dur-reveal: 800ms;

  /* Camadas */
  --z-header: 100; --z-sheet: 200; --z-modal: 300; --z-toast: 400;
}
```

Tema escuro: os mesmos papéis redefinidos sob `@media (prefers-color-scheme: dark)`
e `:root[data-theme="dark"]` (navy profundo como canvas, verde clareado para
contraste AA). Tailwind 4 consome os tokens via `@theme` — classes utilitárias
só referenciam tokens, nunca `blue-600`.

### 9.4 Componentes-chave
- **Header**: 64px (56 mobile), logo **vetorial** recortado, busca por nome/Ref
  sempre visível com atalho `/`, botão "Cotação (n)" com contador em mono. Some ao
  descer e volta ao subir (comportamento atual mantido).
- **Busca instantânea**: painel com resultados enquanto digita; `Ref` exata vai
  direto ao produto; sem resultado sugere categorias + WhatsApp.
- **Card de produto**: foto em quadro neutro, `RefTag` mono no canto, nome em 2
  linhas, chip de unidade, botão "+ Cotação" que vira seletor de quantidade
  depois de adicionado. Alternância **grade/lista** (lista = tabela densa para
  comprador recorrente).
- **Página de produto** (nova): foto, ref, unidade, categoria, marca, descrição,
  "Adicionar à cotação" com quantidade, similares da categoria, JSON-LD `Product`
  (sem `offers`/preço).
- **Cotação**: *sheet* lateral (desktop) / tela cheia (mobile) com os itens; página
  `/cotacao` em 2 passos (Revisar → Seus dados) e tela de sucesso com protocolo
  grande em mono + botão WhatsApp pré-preenchido.
- **Seções institucionais**: números (anos calculados, produtos = contagem real)
  com `tabular-nums`; marcas parceiras em faixa contínua; Missão/Visão/Valores
  como três colunas numeradas.

### 9.5 Movimento, hover e 3D

Princípio do Connections Hub: **o movimento se concentra em poucos momentos**; o
resto é estático e rápido.

1. **Hero 3D — "Órbita WSN"** (Three.js, importado dinamicamente).
   Reaproveita o símbolo real do logo: o arco navy/verde e os três pontos. No
   scroll do hero, o arco gira em perspectiva ortográfica e os três pontos se
   destacam da órbita e viram os **ícones das categorias** (frasco, luva, copo,
   rolo — geometria procedural simples, cor chapada, sem texturas externas nem
   GLB); ao fim do palco, tudo se recompõe no logo 2D oficial (SVG) e a página
   segue. Sem redes de nós genéricas, sem brilho/bloom.
   Robustez obrigatória: render sob demanda, pausa fora da viewport e com aba
   oculta, DPR ≤ 2, geometria reduzida no mobile, `dispose` de tudo,
   fallback estático para `prefers-reduced-motion`, GPU fraca, *save-data* e
   sem JavaScript. Orçamento: hero interativo < 120 KB gzip adicionais, LCP não
   depende do canvas (o SVG do logo é o LCP).
2. **Transições de rota e filtros**: View Transitions API (React Router
   `viewTransition`): o card do produto expande para a página do produto; troca
   de categoria reordena a grade.
3. **Hovers** (só com `@media (hover: hover)`): card sobe 2px + hairline vira
   `--hairline-strong` + `RefTag` inverte para navy; links com sublinhado que
   cresce da esquerda; botões com preenchimento que entra da base. Nada de
   `scale(1.1)` em ícones.
4. **Microinterações**: contador da cotação faz *tick* numérico ao adicionar;
   item "voa" (FLIP) do card até o botão da cotação; toasts discretos.
5. **Reveal no scroll**: títulos de seção com máscara de linha (uma vez, 800ms).
6. **Marcas**: faixa contínua lenta, pausa no hover e estática em reduced-motion.

Sem GSAP/Lenis/Framer na largada: CSS + View Transitions + IntersectionObserver
resolvem 1–6; Three.js só no item 1. Biblioteca nova só com decisão registrada.

### 9.6 Acessibilidade e responsivo (não negociáveis)
Mobile-first a partir de 375px; um `<h1>` por página; foco visível global
(`--focus-ring`); contraste AA verificado por token; navegação completa por
teclado (busca, sheet da cotação, admin); formulários com erro associado ao
campo (`aria-describedby`); alvos de toque ≥ 44px.

---

## 10. Mapa do site

| Rota | Conteúdo | Render |
|------|----------|--------|
| `/` | Hero Órbita, categorias, por que a WSN, números, marcas, CTA atendimento | prerender |
| `/produtos` e `/produtos/c/:categoria` | Catálogo com busca, filtros (categoria, unidade, marca), grade/lista, paginação na URL | prerender + filtro client |
| `/produtos/:ref-:slug` | Página do produto | prerender |
| `/cotacao` | Revisar → Dados → Sucesso | client |
| `/sobre` (redirect de `/aboutus`) | Copy de Nossa História, M/V/V, Sustentabilidade | prerender |
| `/contato` (redirect de `/contact`) | Formulário, WhatsApp, mapa real, FAQ | prerender |
| `/privacidade`, `/termos` | Páginas legais | prerender |
| `/admin/*` | Login, cotações (lista/detalhe/status/nota/exportar CSV), catálogo, categorias, marcas, usuários, auditoria | client, `noindex` |
| `*` | 404 com busca | prerender |

Rotas antigas (`/aboutus`, `/products`, `/contact`, `/cart`) redirecionam 301.

---

## 11. Fases (cada uma: CI verde + commit + handoff em `docs/memory/handoffs/`)

| Fase | Entrega | Checkpoint |
|------|---------|------------|
| **F0 — Fundação** | Monorepo, `CLAUDE.md`, `docs/memory` + `docs/project`, CI (lint, typecheck, test, build, gitleaks, audit), limpeza de deps mortas, **hotfix imediato**: desativar envio quebrado e direcionar orçamento para WhatsApp/e-mail até a API existir | — |
| **F1 — Dados** | Schema Prisma, migrations, seed a partir do JSON (com classificação única de categoria e vínculo de imagem por ref), remoção do JSON público | Fábio revisa categorias sugeridas |
| **F2 — API** | Catálogo público, cotação, contato, outbox de e-mail, antiabuso, criptografia de campo, testes de domínio e de integração | Envio real de cotação ponta a ponta em staging |
| **F3 — Design system** | Tokens, fontes, primitivas `ui/`, logo vetorial, tema claro/escuro, página `/design` interna com todos os componentes | **Mockup aprovado** antes de aplicar nas páginas |
| **F4 — Páginas públicas** | Home (sem 3D ainda), catálogo, produto, cotação, sobre, contato, legais, SEO, redirects | Passe 375/768/1280 renderizado |
| **F5 — Movimento e 3D** | Hero Órbita + fallbacks, view transitions, hovers, microinterações | Revisão de performance (Lighthouse) |
| **F6 — Admin** | Auth com TOTP, gestão de cotações e catálogo, upload de imagem, auditoria, deploy hook | Treino com a equipe WSN |
| **F7 — Operação** | Jobs de retenção LGPD, backup + restore testado, monitoramento de erro sem PII, runbook em `docs/project/05-operacao.md` | Go-live |

---

## 12. Critérios de aceitação

1. Uma cotação enviada em produção chega por e-mail à WSN **e** fica no admin
   com protocolo; o cliente recebe confirmação com o mesmo protocolo.
2. Reenviar o mesmo formulário (duplo clique, refresh) não cria cotação duplicada.
3. Falha da API mantém o carrinho intacto e mostra erro acionável + WhatsApp.
4. Nenhum endpoint público, arquivo estático ou bundle contém `price_cents`, chave
   de API ou segredo (verificado por teste automatizado + gitleaks).
5. Um dump do banco sem a KEK não revela nome, e-mail, telefone ou CNPJ de ninguém.
6. Cada produto mostra a própria foto ou o placeholder com sua ref — nunca a de outro.
7. `vendedor` não acessa gestão de usuários; rota admin sem sessão → 401; mutação
   sem token CSRF → 403; 6ª tentativa de login em 15 min → bloqueio.
8. Lighthouse mobile na Home e no catálogo: Performance ≥ 90, A11y ≥ 95,
   SEO = 100, Best Practices ≥ 95; LCP < 2,5 s em 4G simulado.
9. Com `prefers-reduced-motion`, nenhuma animação contínua roda e o hero mostra
   o estado final estático.
10. Todas as páginas sem rolagem horizontal em 375px; navegação completa por teclado.
11. Toda a copy original está presente (diff de textos `content/` × versão atual),
    exceto itens marcados "a confirmar" ainda não confirmados.
12. `docs/memory` tem decisões, gotchas e um handoff por fase que batem com o código.

---

## 13. Decisões que dependem de você (Fábio / WSN)

1. **Preço público?** Recomendo **não** (cotação é o negócio; R-CAT-4). Alternativa:
   "a partir de R$X" por produto.
2. **WhatsApp oficial**: (11) 4070-5300 ou (11) 97384-6070?
3. **Newsletter**: a WSN vai mesmo mandar campanhas? Se não, remover (KISS).
4. **Hospedagem da API/banco**: recomendo Render (API) + Neon ou Supabase
   Postgres (região São Paulo quando disponível) — custo baixo, backup gerenciado.
   O front continua no Vercel.
5. **E-mail transacional**: Resend (simples) ou SMTP do domínio da WSN.
6. **Fotos**: a WSN tem fotos reais dos 60 itens e o **logo em vetor**? Sem vetor,
   F3 inclui vetorização do logo.
7. **Escopo comercial**: este escopo é muito maior que o projeto original de
   ~US$200 — vale alinhar com o cliente se a v2 é entregue como upgrade pago,
   manutenção mensal (hospedagem do banco tem custo recorrente) ou portfólio.

---

## Fora de escopo da v2
Checkout e pagamento online, área do cliente com login, integração com ERP/estoque
em tempo real, multi-idioma, app mobile, chat ao vivo além do WhatsApp.

---

## Revisão 1 — decisões do Fábio e da implementação (2026-10-07)

| Tema | Decisão | Onde |
|---|---|---|
| Preço público | **Não.** Preço só na proposta pessoal | `docs/memory/decisions/2026-10-07-proposta-como-produto.md` |
| WhatsApp | (11) 97384-6070 (celular do link wa.me). Fixo "a confirmar": 3789-3789 × 4070-5300 | `shared/company.ts` |
| Newsletter | **Removida** (R-NEW-1 sai do escopo) | — |
| Hospedagem | **Cloudflare Workers + D1 + R2 + Turnstile** (gratuito, sem cold start), substitui NestJS/Postgres/Render (§5–§6) | `docs/memory/decisions/2026-10-07-cloudflare-workers-d1.md` |
| Login | **Link mágico** em vez de Argon2id+TOTP (§7) — limite de 10 ms de CPU | `docs/memory/decisions/2026-10-07-login-link-magico.md` |
| CSRF | Origin obrigatório + SameSite=Strict (em vez de double-submit) | `worker/platform/http.ts` |
| Criptografia | AES-256-GCM por campo com **AAD por linha** e keyring versionado; sem envelope por registro (sem KMS no plano gratuito, ganho nulo) | `worker/platform/crypto.ts` |
| Render do front | SPA + **HTMLRewriter no Worker** para SEO por produto (sem prerender/rebuild) | `worker/seo.ts` |
| Logo | Não existe vetor; PNG recortado + símbolo redesenhado em SVG; site só em tema claro | `docs/memory/decisions/2026-10-07-tema-claro.md` |
| Feature de valor | Cotação → **proposta versionada** → **aprovação online** + painel comercial + buscas sem resultado | `docs/project/00-proposta-de-valor.md` |
| Upload de foto | Reduzida/convertida a WebP no navegador; servidor confere os bytes "RIFF…WEBP" e ≤ 1 MB | `worker/modules/admin-catalog.ts` |

Critérios de aceitação: 1–7 e 9–12 cobertos por testes ou pelo fluxo ponta a ponta
(ver handoff). **Critério 8 (Lighthouse) não medido** neste ambiente; o chunk 3D tem
131 KB gzip (meta 120) e só carrega em desktop.

