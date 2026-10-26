import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js, so it doesn't get Next's automatic .env
// loading. Node's built-in loader fills the gap (skipped if there's no file,
// e.g. in CI/CD where DATABASE_URL comes from the real environment).
try {
  process.loadEnvFile(".env");
} catch {}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
