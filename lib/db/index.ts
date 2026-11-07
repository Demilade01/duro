import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Node < 22 has no global WebSocket; `ws` keeps the Neon driver portable.
neonConfig.webSocketConstructor = ws;

export type Db = NeonDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __duroDb?: Db; __duroPool?: Pool };

/**
 * Lazily-created Drizzle client over Neon's WebSocket Pool (supports
 * interactive transactions, which we need for atomic balance mutations).
 * Lazy so `next build` never needs DATABASE_URL.
 */
export function getDb(): Db {
  if (globalForDb.__duroDb) return globalForDb.__duroDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env.local",
    );
  }
  const pool = new Pool({ connectionString: url });
  const db = drizzle({ client: pool, schema });
  globalForDb.__duroPool = pool;
  globalForDb.__duroDb = db;
  return db;
}

export { schema };
