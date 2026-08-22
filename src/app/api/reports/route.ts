import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/reports - Generate reports
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "daily"; // daily | weekly | monthly
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let dateFilter: { gte?: string; lte?: string } = {};

  if (startDate && endDate) {
    dateFilter = { gte: startDate, lte: endDate };
  } else {
    const today = new Date();
    if (type === "daily") {
      const dateStr = today.toISOString().split("T")[0];
      dateFilter = { gte: dateStr, lte: dateStr };
    } else if (type === "weekly") {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      dateFilter = {
        gte: weekStart.toISOString().split("T")[0],
        lte: today.toISOString().split("T")[0],
      };
    } else if (type === "monthly") {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      dateFilter = {
        gte: monthStart.toISOString().split("T")[0],
        lte: today.toISOString().split("T")[0],
      };
    }
  }

  // Get closings in date range
  const closings = await prisma.dailyClosing.findMany({
    where: { date: dateFilter },
    include: {
      session: {
        include: {
          operations: {
            where: { status: { not: "CANCELADA" } },
            include: { category: true },
          },
        },
      },
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Get open sessions in range (not yet closed)
  const openSessions = await prisma.cashSession.findMany({
    where: {
      date: dateFilter,
      status: "ABIERTA",
    },
    include: {
      operations: {
        where: { status: { not: "CANCELADA" } },
        include: { category: true },
      },
    },
  });

  // Aggregate stats
  let totalIncome = 0;
  let totalExpense = 0;
  let totalOperations = 0;
  let squaredDays = 0;
  let surplusDays = 0;
  let deficitDays = 0;
  let totalDifference = 0;

  for (const closing of closings) {
    totalIncome += closing.totalIncome;
    totalExpense += closing.totalExpense;
    totalOperations += closing.operationsCount;
    totalDifference += closing.difference;
    if (closing.status === "CUADRADO") squaredDays++;
    else if (closing.status === "SOBRANTE") surplusDays++;
    else deficitDays++;
  }

  // By category
  const byCategory: Record<string, { name: string; type: string; total: number; count: number }> = {};
  for (const closing of closings) {
    for (const op of closing.session.operations) {
      const catName = op.category?.name || "Sin categoría";
      if (!byCategory[catName]) {
        byCategory[catName] = { name: catName, type: op.type, total: 0, count: 0 };
      }
      byCategory[catName].total += op.netCashFlow;
      byCategory[catName].count++;
    }
  }

  return NextResponse.json({
    type,
    period: dateFilter,
    closings,
    openSessions,
    summary: {
      totalIncome,
      totalExpense,
      totalOperations,
      daysWithData: closings.length,
      squaredDays,
      surplusDays,
      deficitDays,
      totalDifference,
      averageDifference: closings.length > 0 ? totalDifference / closings.length : 0,
    },
    byCategory: Object.values(byCategory),
  });
}
