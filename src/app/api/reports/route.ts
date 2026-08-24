import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

function getColombiaDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(date);
}

// GET /api/reports - Generate reports with live session data
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "daily"; // daily | weekly | monthly
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  let dateFilter: { gte?: string; lte?: string } = {};

  const todayStr = getColombiaDateStr();

  if (startDate && endDate) {
    dateFilter = { gte: startDate, lte: endDate };
  } else {
    if (type === "daily") {
      dateFilter = { gte: todayStr, lte: todayStr };
    } else if (type === "weekly") {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);
      dateFilter = {
        gte: getColombiaDateStr(monday),
        lte: todayStr,
      };
    } else if (type === "monthly") {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = {
        gte: getColombiaDateStr(monthStart),
        lte: todayStr,
      };
    }
  }

  // 1. Get all operations in date range (live & closed)
  const operations = await prisma.operation.findMany({
    where: {
      status: { not: "CANCELADA" },
      session: {
        date: dateFilter,
      },
    },
    include: {
      category: true,
      session: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { operatedAt: "desc" },
  });

  // 2. Get closings in date range
  const closings = await prisma.dailyClosing.findMany({
    where: { date: dateFilter },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  // 3. Get open sessions in date range (not yet closed)
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
      openedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "asc" },
  });

  // Calculate live aggregates from all operations in period
  let totalIncome = 0;
  let totalExpense = 0;
  const totalOperations = operations.length;
  const byCategory: Record<string, { name: string; type: string; total: number; count: number }> = {};
  const datesSet = new Set<string>();

  for (const op of operations) {
    if (op.session?.date) {
      datesSet.add(op.session.date);
    }
    if (op.type === "INGRESO") {
      totalIncome += op.amount;
    } else {
      totalExpense += op.amount;
    }

    const catName = op.category?.name || (op.type === "INGRESO" ? "Ingresos / Depósitos" : "Retiros / Pagos");
    if (!byCategory[catName]) {
      byCategory[catName] = { name: catName, type: op.type, total: 0, count: 0 };
    }
    byCategory[catName].total += op.amount;
    byCategory[catName].count++;
  }

  // Also account for sessions dates
  closings.forEach((c) => datesSet.add(c.date));
  openSessions.forEach((s) => datesSet.add(s.date));

  // Build unified chronological daily entries (Closings + Live Open Sessions)
  const closingDates = new Set(closings.map((c) => c.date));
  const dailyEntries: Array<{
    date: string;
    totalIncome: number;
    totalExpense: number;
    difference: number;
    status: string;
    operationsCount: number;
  }> = closings.map((c) => ({
    date: c.date,
    totalIncome: c.totalIncome,
    totalExpense: c.totalExpense,
    difference: c.difference,
    status: c.status,
    operationsCount: c.operationsCount,
  }));

  // Add open sessions that don't have a closing yet
  for (const openSess of openSessions) {
    if (!closingDates.has(openSess.date)) {
      let openIncome = 0;
      let openExpense = 0;
      for (const op of openSess.operations) {
        if (op.type === "INGRESO") openIncome += op.amount;
        else openExpense += op.amount;
      }

      dailyEntries.push({
        date: openSess.date,
        totalIncome: openIncome,
        totalExpense: openExpense,
        difference: 0,
        status: "EN CURSO (ABIERTA)",
        operationsCount: openSess.operations.length,
      });
    }
  }

  // Sort daily entries newest first
  dailyEntries.sort((a, b) => b.date.localeCompare(a.date));

  let squaredDays = 0;
  let surplusDays = 0;
  let deficitDays = 0;
  let totalDifference = 0;

  for (const c of closings) {
    totalDifference += c.difference;
    if (c.status === "CUADRADO") squaredDays++;
    else if (c.status === "SOBRANTE") surplusDays++;
    else if (c.status === "FALTANTE") deficitDays++;
  }

  return NextResponse.json({
    type,
    period: dateFilter,
    closings: dailyEntries,
    summary: {
      totalIncome,
      totalExpense,
      totalOperations,
      daysWithData: datesSet.size,
      squaredDays,
      surplusDays,
      deficitDays,
      totalDifference,
      averageDifference: closings.length > 0 ? totalDifference / closings.length : 0,
    },
    byCategory: Object.values(byCategory),
  });
}
