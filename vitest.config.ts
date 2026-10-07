import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// Testes da API rodam dentro do workerd (mesmo runtime de produção) com D1 local isolado.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  return {
    resolve: { alias: { "@shared": path.resolve(__dirname, "./shared") } },
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // Chaves só de teste — nunca usadas fora daqui.
          bindings: {
            TEST_MIGRATIONS: migrations,
            ENVIRONMENT: "development",
            APP_URL: "http://example.com",
            PII_KEYS: JSON.stringify({ "1": "g0CD9Peip31MNG4zRHXGttQ8Y9gApRmiv7DJPPz4I0w=" }),
            PII_ACTIVE_KEY: "1",
            HMAC_KEY: "EzD6v0obMH5sbRruJ+STC4mYR5fqZtgw/F9RmBm3/9g=",
            TURNSTILE_SECRET: "1x0000000000000000000000000000000AA",
          },
        },
      }),
    ],
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/setup.ts"],
    },
  };
});
