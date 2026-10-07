// Cria (se preciso) um usuário do painel e imprime um link de acesso de uso único.
// Serve para o primeiro admin e para quando o e-mail transacional ainda não está configurado.
//
//   npm run admin:link -- fabio@exemplo.com "Fábio" admin            (banco local)
//   npm run admin:link -- wesley@wsn.com.br "Wesley" admin --remote  (produção)
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const [email, name = "Administrador", role = "admin"] = args.filter((a) => a !== "--remote");

if (!email || !/^\S+@\S+\.\S+$/.test(email) || !["admin", "vendedor"].includes(role)) {
  console.error('Uso: npm run admin:link -- <email> "<nome>" [admin|vendedor] [--remote]');
  process.exit(1);
}

const appUrl = remote ? process.env.APP_URL : "http://localhost:5173";
if (!appUrl) {
  console.error("Defina APP_URL (ex.: APP_URL=https://www.wsndistribuidora.com.br) para gerar o link de produção.");
  process.exit(1);
}

const sql = (v) => `'${String(v).replace(/'/g, "''")}'`;
const token = randomBytes(32).toString("base64url");
const tokenHash = createHash("sha256").update(token).digest("hex");
const expires = new Date(Date.now() + 15 * 60_000).toISOString();
const normalized = email.trim().toLowerCase();

const command = [
  `INSERT OR IGNORE INTO users (id, email, name, role) VALUES (${sql(randomUUID())}, ${sql(normalized)}, ${sql(name)}, ${sql(role)});`,
  `INSERT INTO login_tokens (token_hash, user_id, expires_at) SELECT ${sql(tokenHash)}, id, ${sql(expires)} FROM users WHERE email = ${sql(normalized)} AND active = 1;`,
].join(" ");

// SQL vai por arquivo temporário: evita problemas de aspas no shell do Windows.
const dir = mkdtempSync(join(tmpdir(), "wsn-admin-"));
const file = join(dir, "link.sql");
writeFileSync(file, command);
try {
  execFileSync("npx", ["wrangler", "d1", "execute", "wsn", remote ? "--remote" : "--local", "--file", file], {
    stdio: ["ignore", "ignore", "inherit"],
    shell: process.platform === "win32",
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\nLink de acesso (15 min, uso único) para ${normalized}:\n${appUrl}/admin/entrar/${token}\n`);
