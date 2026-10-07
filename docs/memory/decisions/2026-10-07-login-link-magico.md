# Login do painel sem senha (link mágico por e-mail)

- **Data**: 2026-10-07 · **Status**: aprovada na implementação
- **Substitui**: Argon2id + TOTP da spec original

Argon2id/PBKDF2 com custo seguro não cabe em 10 ms de CPU do plano gratuito.
Link de uso único (256 bits, guardado como SHA-256, 15 min) enviado ao e-mail de
quem está em `users`. Resposta idêntica para e-mail existente ou não. Sessão em
cookie `__Host-wsn_session` (HttpOnly, Secure, SameSite=Strict), 8 h ociosa / 7 dias
absoluta, guardada como hash. CSRF: Origin obrigatório + SameSite=Strict.

Bootstrap/sem e-mail configurado: `npm run admin:link` grava o token direto no D1.
Revisitar se a WSN migrar para plano pago e quiser TOTP adicional.
