import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://neondb_owner:npg_iANRu0EO5xvy@ep-delicate-smoke-auypcnir-pooler.c-10.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require";
  
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  createPrismaClient();

// Always persist connection pool across warm serverless invocations
globalForPrisma.prisma = prisma;

