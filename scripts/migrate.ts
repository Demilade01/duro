import { existsSync, readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDb } from "../lib/db";

if (existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

async function main() {
  const db = getDb();
  const raw = readFileSync("./drizzle/0000_dapper_mandroid.sql", "utf8");
  const statements = [
    ...raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean),
    `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "password_hash" text;`,
    `ALTER TABLE "user_profiles" DROP CONSTRAINT IF EXISTS "user_profiles_busha_profile_id_unique";`,
    `ALTER TABLE "trusted_recipients" DROP CONSTRAINT IF EXISTS "trusted_recipients_busha_recipient_id_unique";`,
  ];

  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt));
    } catch (err) {
      const code = (err as { cause?: { code?: string } })?.cause?.code;
      // 42P07 = duplicate_table / duplicate_relation, 42710 = duplicate_object (constraint)
      if (code === "42P07" || code === "42710") continue;
      throw err;
    }
  }

  const res = await db.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(
    "✓ Neon tables ready:",
    res.rows.map((r) => (r as { tablename: string }).tablename).join(", "),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
