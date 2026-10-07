# Hono: `use()` sem caminho num sub-app montado em "/" vale para o pai inteiro

`usersRoutes.use(requireUser("admin"))` montado com `.route("/", usersRoutes)` dentro de
`/api/admin` passaria a exigir admin em **todo** `/api/admin/*` — vendedor perderia o
painel. Sub-apps com middleware de papel ficam sob prefixo próprio:
`/api/admin/team/*` e `/api/admin/export/*` (ver `worker/index.ts`). Teste
"vendedor não gerencia equipe" cobre os dois lados.
