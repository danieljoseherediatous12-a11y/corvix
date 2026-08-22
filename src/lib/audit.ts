import { prisma } from "./db";

export type AuditAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "OPEN_SESSION"
  | "CLOSE_SESSION"
  | "SCAN_QR"
  | "OCR"
  | "CASH_COUNT"
  | "DAILY_CLOSE"
  | "EXPORT";

export async function createAuditLog({
  userId,
  userName,
  action,
  entity,
  entityId,
  oldValue,
  newValue,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  userName?: string;
  action: AuditAction;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        action,
        entity,
        entityId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Audit logs should never break the main flow
    console.error("Failed to create audit log:", error);
  }
}
