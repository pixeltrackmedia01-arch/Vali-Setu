import { execSync } from "node:child_process";

/**
 * Integration tests run against their own SQLite file (prisma/test.db), never
 * the development database. It is migrated and seeded once per run.
 */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./test.db", SEED_DEMO_PASSWORD: "ValiSetu@2026" };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx --conditions=react-server prisma/seed.ts", { env, stdio: "ignore" });
}
