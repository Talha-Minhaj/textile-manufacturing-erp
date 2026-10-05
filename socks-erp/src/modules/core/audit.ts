import { PrismaClient, Prisma } from "@prisma/client";

export type AuditClient = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  userId?: number | null;
  action: string;
  entity: string;
  entityId?: number | null;
  oldValue?: unknown;
  newValue?: unknown;
};

/**
 * Persists an immutable audit log entry within the active database transaction.
 *
 * @param tx - Prisma Transaction or Client instance.
 * @param entry - Audit record parameters including entity diff.
 */
export async function audit(tx: AuditClient, entry: AuditEntry): Promise<void> {
  await tx.auditLog.create({
    data: {
      userId: entry.userId,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId,
      oldValue: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      newValue: entry.newValue ? JSON.stringify(entry.newValue) : null,
    },
  });
}
