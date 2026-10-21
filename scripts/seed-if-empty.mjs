// Seeds the demo data only when the database has no users yet, so redeploying a
// hosted demo keeps whatever visitors have created. DEMO_RESEED=true forces a
// fresh seed (the seed wipes the tables first). Uses the generated client.
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const users = await db.user.count();
await db.$disconnect();
if (users > 0 && process.env.DEMO_RESEED !== "true") {
  console.log(`Database already has ${users} users; skipping seed.`);
} else {
  console.log("Empty database; seeding demo data.");
  execSync("npx prisma db seed --schema prisma/postgres/schema.prisma", { stdio: "inherit" });
}
