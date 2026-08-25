import { prisma } from "@/lib/db";

let lastPurgeTime = 0;
const PURGE_COOLDOWN_MS = 1000 * 60 * 60 * 4; // Run at most once every 4 hours

function getColombiaDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date);
}

/**
 * Automatically purges closed sessions, operations, vouchers, and cash counts
 * that are older than 30 days to keep the database lightweight, fast, and clean.
 */
export async function purgeOldHistoryData(force: boolean = false): Promise<{ purgedCount: number; cutoffDate: string }> {
  const now = Date.now();
  if (!force && now - lastPurgeTime < PURGE_COOLDOWN_MS) {
    return { purgedCount: 0, cutoffDate: "" };
  }

  lastPurgeTime = now;

  try {
    // 30 days in milliseconds = 30 * 24 * 60 * 60 * 1000 = 2,592,000,000 ms
    const cutoffTimestamp = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const cutoffDateStr = getColombiaDateStr(cutoffTimestamp);

    // 1. Find all closed sessions older than 30 days
    const oldSessions = await prisma.cashSession.findMany({
      where: {
        date: { lt: cutoffDateStr },
        status: "CERRADA",
      },
      select: { id: true },
    });

    if (oldSessions.length === 0) {
      await prisma.auditLog.deleteMany({
        where: { createdAt: { lt: cutoffTimestamp } },
      }).catch(() => {});

      return { purgedCount: 0, cutoffDate: cutoffDateStr };
    }

    const sessionIds = oldSessions.map((s) => s.id);

    // 2. Find all operation IDs belonging to these sessions
    const oldOperations = await prisma.operation.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true },
    });
    const operationIds = oldOperations.map((o) => o.id);

    // 3. Delete in referential order
    const oldCashCounts = await prisma.cashCount.findMany({
      where: { sessionId: { in: sessionIds } },
      select: { id: true },
    });
    const cashCountIds = oldCashCounts.map((c) => c.id);

    if (cashCountIds.length > 0) {
      await prisma.cashCountDetail.deleteMany({
        where: { cashCountId: { in: cashCountIds } },
      }).catch(() => {});

      await prisma.cashCount.deleteMany({
        where: { id: { in: cashCountIds } },
      }).catch(() => {});
    }

    if (operationIds.length > 0) {
      await prisma.voucher.deleteMany({
        where: { operationId: { in: operationIds } },
      }).catch(() => {});

      await prisma.operation.deleteMany({
        where: { id: { in: operationIds } },
      }).catch(() => {});
    }

    await prisma.dailyClosing.deleteMany({
      where: { sessionId: { in: sessionIds } },
    }).catch(() => {});

    const deletedSessions = await prisma.cashSession.deleteMany({
      where: { id: { in: sessionIds } },
    });

    await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffTimestamp } },
    }).catch(() => {});

    console.log("[Auto-Purge 30d] Removed " + deletedSessions.count + " closed sessions older than " + cutoffDateStr);
    return { purgedCount: deletedSessions.count, cutoffDate: cutoffDateStr };
  } catch (error) {
    console.error("[Auto-Purge 30d] Error during maintenance:", error);
    return { purgedCount: 0, cutoffDate: "" };
  }
}
