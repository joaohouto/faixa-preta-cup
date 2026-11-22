import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  sqliteConfigured: boolean | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (!globalForPrisma.sqliteConfigured) {
  globalForPrisma.sqliteConfigured = true;
  // Configura WAL e busy_timeout no SQLite para suportar leituras SSE +
  // múltiplos árbitros simultâneos no dia do evento sem erros SQLITE_BUSY.
  db.$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .then(() => db.$queryRawUnsafe("PRAGMA busy_timeout = 5000;"))
    .catch(() => {
      // Ignora silenciosamente se o banco ainda não estiver pronto no build
    });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
