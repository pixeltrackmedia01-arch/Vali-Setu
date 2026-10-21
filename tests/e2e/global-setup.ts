import { execSync } from "node:child_process";

/** End-to-end tests use their own seeded SQLite file (prisma/e2e.db). */
export default function setup() {
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db", SEED_DEMO_PASSWORD: "ValiSetu@2026" };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  execSync("npx tsx --conditions=react-server prisma/seed.ts", { env, stdio: "ignore" });
}
