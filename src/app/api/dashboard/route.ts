import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateExpectedCash,
  calculateDifference,
  calculateTotalIncome,
  calculateTotalExpense,
  calculateTotalFees,
  getTodayString,
} from "@/lib/calculations";

// GET /api/dashboard - Get all dashboard data
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || getTodayString();

  // Get today's session
  const cashSession = await prisma.cashSession.findUnique({
    where: { date },
    include: {
      operations: {
        where: { status: { not: "CANCELADA" } },
        include: {
          category: true,
          user: { select: { id: true, name: true } },
          voucher: true,
        },
        orderBy: { operatedAt: "desc" },
      },
      cashCounts: {
        include: { details: true },
        orderBy: { countedAt: "desc" },
        take: 1,
      },
      closing: true,
      openedBy: { select: { id: true, name: true } },
    },
  });

  if (!cashSession) {
    // Check for last closing
    const lastClosing = await prisma.dailyClosing.findFirst({
      orderBy: { date: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      session: null,
      summary: null,
      alerts: [],
      recentOperations: [],
      lastClosing,
    });
  }

  const operations = cashSession.operations;
  const totalIncome = calculateTotalIncome(operations);
  const totalExpense = calculateTotalExpense(operations);
  const totalFees = calculateTotalFees(operations);
  const expectedCash = calculateExpectedCash(cashSession.initialCash, operations);

  // Latest cash count
  const latestCount = cashSession.cashCounts[0];
  const countedCash = latestCount?.countedCash;
  const { difference, status: cashStatus } = latestCount
    ? calculateDifference(latestCount.countedCash, expectedCash)
    : { difference: 0, status: "CUADRADO" as const };

  // Alerts
  const alerts: Array<{ type: string; message: string; severity: string }> = [];

  const operationsWithoutVoucher = operations.filter((op) => !op.voucher).length;
  const pendingVouchers = operations.filter(
    (op) => op.voucher?.status === "PENDIENTE" || op.voucher?.status === "FALTA"
  ).length;

  if (operationsWithoutVoucher > 0) {
    alerts.push({
      type: "SIN_COMPROBANTE",
      message: `${operationsWithoutVoucher} operación(es) sin comprobante`,
      severity: "WARNING",
    });
  }
  if (pendingVouchers > 0) {
    alerts.push({
      type: "VOUCHER_PENDIENTE",
      message: `${pendingVouchers} voucher(s) pendiente(s)`,
      severity: "WARNING",
    });
  }
  if (latestCount && cashStatus === "FALTANTE") {
    alerts.push({
      type: "FALTANTE",
      message: `Faltante de caja: $${Math.abs(difference).toLocaleString("es-CO")}`,
      severity: "DANGER",
    });
  }
  if (latestCount && cashStatus === "SOBRANTE") {
    alerts.push({
      type: "SOBRANTE",
      message: `Sobrante de caja: $${difference.toLocaleString("es-CO")}`,
      severity: "WARNING",
    });
  }
  if (!cashSession.closing && date === getTodayString()) {
    // Check if it's past closing time (optional alert)
  }

  const summary = {
    date,
    initialCash: cashSession.initialCash,
    totalIncome,
    totalExpense,
    totalFees,
    expectedCash,
    countedCash: countedCash ?? null,
    difference: latestCount ? difference : null,
    cashStatus: latestCount ? cashStatus : null,
    operationsCount: operations.length,
    sessionStatus: cashSession.status,
    sessionId: cashSession.id,
    isClosed: cashSession.status === "CERRADA" || !!cashSession.closing,
    openedBy: cashSession.openedBy,
    openedAt: cashSession.openedAt,
  };

  return NextResponse.json({
    session: cashSession,
    summary,
    alerts,
    recentOperations: operations.slice(0, 10),
  });
}
