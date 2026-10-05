import { PrismaClient } from "@prisma/client";

/**
 * Global Prisma Client singleton with connection pooling and dev logging.
 * Prevents multiple instances during Next.js Hot Module Replacement (HMR).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
