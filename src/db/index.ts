/**
 * The app's database handle. Import `db` from here in Server Components and
 * Server Actions. `server-only` makes the build fail if a Client Component
 * ever imports this file, so credentials can't leak into browser bundles.
 */
import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One connection pool per server process. In development, Next.js re-evaluates
// modules on every code change, so the pool is stashed on globalThis to avoid
// opening a new pool (and leaking connections) on each hot reload.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
