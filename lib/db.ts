import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
  prismaClientKey?: string;
};

/** Prisma slots this process may open to PgBouncer. */
const POOL_SIZE = 5;
const CLIENT_KEY = `pool-${POOL_SIZE}-retry-p1001-stock-ledger`;

function datasourceUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const url = new URL(raw);
  // Neon PgBouncer already multiplexes. Prisma still needs several local
  // slots: a page can overlap layout auth with Promise.all data queries,
  // and Next.js may prefetch. connection_limit=1 causes P2024.
  url.searchParams.set("connection_limit", String(POOL_SIZE));
  url.searchParams.set("pool_timeout", "30");
  // Neon compute wake-ups often exceed 15s; P1001 follows connect_timeout.
  url.searchParams.set("connect_timeout", "60");
  if (url.hostname.includes("-pooler") && !url.searchParams.has("pgbouncer")) {
    url.searchParams.set("pgbouncer", "true");
  }
  return url.toString();
}

function isRetryableConnectError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  const code = String(error.code);
  return code === "P1001" || code === "P1017";
}

function createPrismaClient() {
  const client = new PrismaClient({ datasourceUrl: datasourceUrl() });
  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isRetryableConnectError(error)) throw error;
          await client.$disconnect();
          await new Promise((resolve) => setTimeout(resolve, 800));
          return query(args);
        }
      },
    },
  }) as unknown as PrismaClient;
}

function getClient(): PrismaClient {
  if (
    globalForPrisma.prismaClient &&
    globalForPrisma.prismaClientKey === CLIENT_KEY
  ) {
    return globalForPrisma.prismaClient;
  }
  void globalForPrisma.prismaClient?.$disconnect();
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClient = client;
    globalForPrisma.prismaClientKey = CLIENT_KEY;
  }
  return client;
}

export const prisma: PrismaClient = getClient();
