// Writes prisma/postgres/schema.prisma: the same data model as prisma/schema.prisma,
// with the PostgreSQL provider. Used for hosted deployments (see README, Deployment).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const source = readFileSync("prisma/schema.prisma", "utf8");
if (!source.includes('provider = "sqlite"')) throw new Error("prisma/schema.prisma no longer uses the sqlite provider");
const header = "// GENERATED from prisma/schema.prisma by scripts/postgres-schema.mjs. Do not edit by hand.\n";
mkdirSync("prisma/postgres", { recursive: true });
writeFileSync("prisma/postgres/schema.prisma", header + source.replace('provider = "sqlite"', 'provider = "postgresql"'));
