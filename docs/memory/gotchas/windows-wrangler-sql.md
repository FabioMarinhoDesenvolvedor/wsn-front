# Windows: SQL para o D1 vai por arquivo, não por `--command`

`execFileSync("npx", [...])` no Windows exige `shell: true`, que concatena argumentos sem
escapar — SQL com aspas quebra. `scripts/admin-link.mjs` grava o SQL num arquivo
temporário e usa `wrangler d1 execute --file`. O aviso DEP0190 do Node é esperado e
inofensivo aqui (nenhum argumento vem de usuário externo).
