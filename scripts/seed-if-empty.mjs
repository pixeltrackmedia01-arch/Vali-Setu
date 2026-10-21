// Seeds the demo data only when the database has no users yet, so redeploying a
// hosted demo keeps whatever visitors have created. DEMO_RESEED=true forces a
// fresh seed. Uses the generated client.
//
// On PostgreSQL the data comes from prisma/postgres/demo-data.sql, a snapshot of
// prisma/seed.ts: a few large INSERTs instead of thousands of round-trips, which
// matters when the database is far from the build server.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const SNAPSHOT = "prisma/postgres/demo-data.sql";

const db = new PrismaClient({ transactionOptions: { maxWait: 10_000, timeout: 120_000 } });
const users = await db.user.count();
const postgres = /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");

if (users > 0 && process.env.DEMO_RESEED !== "true") {
  console.log(`Database already has ${users} users; skipping seed.`);
} else if (postgres && existsSync(SNAPSHOT)) {
  console.log("Loading demo data snapshot.");
  const statements = readFileSync(SNAPSHOT, "utf8")
    .split(/;\n(?=INSERT INTO )/)
    .map((s) => s.replace(/^--.*\n/gm, "").trim().replace(/;$/, ""))
    .filter(Boolean);
  const tables = [...new Set(statements.map((s) => s.match(/^INSERT INTO ("[^"]+")/)[1]))];
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`TRUNCATE ${tables.join(", ")} CASCADE`);
    for (const s of statements) await tx.$executeRawUnsafe(s);
  });
  console.log(`Loaded ${statements.length} statements into ${tables.length} tables.`);
} else {
  console.log("Seeding demo data.");
  execSync("npx prisma db seed --schema prisma/postgres/schema.prisma", { stdio: "inherit" });
}
await db.$disconnect();
