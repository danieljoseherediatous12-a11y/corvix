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
  const sessionId = searchParams.get("sessionId");

  const sessionInclude = {
    cashCounts: {
      include: { details: true },
      orderBy: { countedAt: "desc" as const },
      take: 1,
    },
    closing: true,
    openedBy: { select: { id: true, name: true } },
  };

  let cashSession = sessionId
    ? await prisma.cashSession.findUnique({
        where: { id: sessionId },
        include: sessionInclude,
      })
    : null;

  if (!cashSession) {
    cashSession = await prisma.cashSession.findFirst({
      where: { date, status: "ABIERTA" },
      orderBy: { openedAt: "desc" },
      include: sessionInclude,
    });
  }

  if (!cashSession) {
    cashSession = await prisma.cashSession.findFirst({
      where: { date },
      orderBy: { openedAt: "desc" },
      include: sessionInclude,
    });
  }

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

  try {
    const [
      incomeAgg,
      expenseAgg,
      opsCount,
      opsWithoutVoucherCount,
      pendingVouchersCount,
      recentOperations,
    ] = await Promise.all([
      prisma.operation.aggregate({
        where: { sessionId: cashSession.id, type: "INGRESO", status: { not: "CANCELADA" } },
        _sum: { amount: true, fee: true },
      }),
      prisma.operation.aggregate({
        where: { sessionId: cashSession.id, type: "EGRESO", status: { not: "CANCELADA" } },
        _sum: { amount: true, fee: true },
      }),
      prisma.operation.count({
        where: { sessionId: cashSession.id, status: { not: "CANCELADA" } },
      }),
      prisma.operation.count({
        where: { sessionId: cashSession.id, status: { not: "CANCELADA" }, voucher: null },
      }),
      prisma.voucher.count({
        where: {
          operation: { sessionId: cashSession.id, status: { not: "CANCELADA" } },
          status: { in: ["PENDIENTE", "FALTA"] },
        },
      }),
      prisma.operation.findMany({
        where: { sessionId: cashSession.id },
        include: {
          category: true,
          user: { select: { id: true, name: true } },
          voucher: true,
        },
        orderBy: { operatedAt: "desc" },
        take: 10,
      }),
    ]);

    const incomePrincipal = incomeAgg._sum.amount || 0;
    const incomeFees = incomeAgg._sum.fee || 0;
    const expensePrincipal = expenseAgg._sum.amount || 0;
    const expenseFees = expenseAgg._sum.fee || 0;

    // Total cash received into drawer for INGRESO is (principal + fee)
    const totalIncome = incomePrincipal + incomeFees;
    // Total cash disbursed from drawer for EGRESO
    const totalExpense = expensePrincipal;
    const totalFees = incomeFees + expenseFees;
    const netFlow = totalIncome - totalExpense;
    const expectedCash = cashSession.initialCash + netFlow;

    // Latest cash count
    const latestCount = cashSession.cashCounts[0];
    const countedCash = latestCount?.countedCash;
    const { difference, status: cashStatus } = latestCount
      ? calculateDifference(latestCount.countedCash, expectedCash)
      : { difference: 0, status: "CUADRADO" as const };

    // Alerts
    const alerts: Array<{ type: string; message: string; severity: string }> = [];

    if (opsWithoutVoucherCount > 0) {
      alerts.push({
        type: "SIN_COMPROBANTE",
        message: `${opsWithoutVoucherCount} operación(es) sin comprobante`,
        severity: "WARNING",
      });
    }
    if (pendingVouchersCount > 0) {
      alerts.push({
        type: "VOUCHER_PENDIENTE",
        message: `${pendingVouchersCount} voucher(s) pendiente(s)`,
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
      operationsCount: opsCount,
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
      recentOperations,
    });
  } catch (error) {
    console.error("Error in GET /api/dashboard:", error);
    return NextResponse.json({ error: "Error al obtener datos del dashboard" }, { status: 500 });
  }
}
