import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateExpectedCash,
  calculateDifference,
  calculateTotalIncome,
  calculateTotalExpense,
  calculateTotalFees,
} from "@/lib/calculations";
import { createAuditLog } from "@/lib/audit";

// GET /api/closings - Get all closings/sessions history or specific date
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const limit = parseInt(searchParams.get("limit") || "60");
  const page = parseInt(searchParams.get("page") || "1");

  if (date) {
    // 1. Try to find formal daily closing
    const closing = await prisma.dailyClosing.findFirst({
      where: { date },
      include: {
        session: {
          include: {
            operations: {
              include: {
                category: true,
                voucher: true,
                user: { select: { id: true, name: true } },
              },
              orderBy: { operatedAt: "asc" },
            },
            cashCounts: {
              include: {
                details: true,
                user: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });

    if (closing) {
      return NextResponse.json({ closing });
    }

    // 2. If no formal closing exists, fallback to cashSession for that date
    const cashSession = await prisma.cashSession.findUnique({
      where: { date },
      include: {
        operations: {
          include: {
            category: true,
            voucher: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { operatedAt: "asc" },
        },
        cashCounts: {
          include: {
            details: true,
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        openedBy: { select: { id: true, name: true } },
      },
    });

    if (!cashSession) {
      return NextResponse.json({ closing: null });
    }

    const activeOps = cashSession.operations.filter((op) => op.status !== "CANCELADA");
    const totalIncome = calculateTotalIncome(activeOps);
    const totalExpense = calculateTotalExpense(activeOps);
    const totalFees = calculateTotalFees(activeOps);
    const expectedCash = calculateExpectedCash(cashSession.initialCash, activeOps);
    const latestCount = cashSession.cashCounts[0];
    const countedCash = latestCount?.countedCash ?? expectedCash;
    const { difference, status } = latestCount
      ? calculateDifference(latestCount.countedCash, expectedCash)
      : { difference: 0, status: cashSession.status === "ABIERTA" ? "EN_CURSO" : "CUADRADO" };

    const virtualClosing = {
      id: cashSession.id,
      sessionId: cashSession.id,
      date: cashSession.date,
      status: cashSession.status === "ABIERTA" ? "EN_CURSO" : status,
      initialCash: cashSession.initialCash,
      totalIncome,
      totalExpense,
      totalFees,
      expectedCash,
      countedCash,
      difference,
      operationsCount: activeOps.length,
      vouchersCount: cashSession.operations.filter((o) => !!o.voucher).length,
      pendingVouchers: cashSession.operations.filter((o) => o.voucher?.status === "PENDIENTE" || o.voucher?.status === "FALTA").length,
      operationsNoVoucher: cashSession.operations.filter((o) => !o.voucher).length,
      notes: cashSession.notes,
      createdAt: cashSession.createdAt,
      user: cashSession.openedBy || { id: "system", name: "Operador" },
      session: cashSession,
    };

    return NextResponse.json({ closing: virtualClosing });
  }

  // List all historical sessions/closings
  const sessions = await prisma.cashSession.findMany({
    include: {
      closing: {
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      operations: {
        where: { status: { not: "CANCELADA" } },
      },
      cashCounts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      openedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });

  const total = await prisma.cashSession.count();

  const closingsList = sessions.map((s) => {
    if (s.closing) {
      return {
        id: s.closing.id,
        date: s.closing.date,
        initialCash: s.closing.initialCash,
        totalIncome: s.closing.totalIncome,
        totalExpense: s.closing.totalExpense,
        totalFees: s.closing.totalFees,
        expectedCash: s.closing.expectedCash,
        countedCash: s.closing.countedCash,
        difference: s.closing.difference,
        status: s.closing.status,
        operationsCount: s.closing.operationsCount,
        closedAt: s.closedAt || s.closing.createdAt,
        user: s.closing.user || s.openedBy || { name: "Operador" },
        isClosed: true,
      };
    }

    // Dynamic unclosed session calculation
    const totalIncome = calculateTotalIncome(s.operations);
    const totalExpense = calculateTotalExpense(s.operations);
    const totalFees = calculateTotalFees(s.operations);
    const expectedCash = calculateExpectedCash(s.initialCash, s.operations);
    const latestCount = s.cashCounts[0];
    const countedCash = latestCount?.countedCash ?? expectedCash;
    const { difference, status } = latestCount
      ? calculateDifference(latestCount.countedCash, expectedCash)
      : { difference: 0, status: s.status === "ABIERTA" ? "EN_CURSO" : "CUADRADO" };

    return {
      id: s.id,
      date: s.date,
      initialCash: s.initialCash,
      totalIncome,
      totalExpense,
      totalFees,
      expectedCash,
      countedCash,
      difference,
      status: s.status === "ABIERTA" ? "EN_CURSO" : status,
      operationsCount: s.operations.length,
      closedAt: s.closedAt || s.createdAt,
      user: s.openedBy || { name: "Operador" },
      isClosed: s.status === "CERRADA",
    };
  });

  return NextResponse.json({ closings: closingsList, total });
}

// POST /api/closings - Create daily closing
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN", "OPERADOR"].includes(userRole)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { sessionId, countedCash, notes } = body;

  if (!sessionId || countedCash === undefined) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Get full session data
  const cashSession = await prisma.cashSession.findUnique({
    where: { id: sessionId },
    include: {
      operations: {
        where: { status: { not: "CANCELADA" } },
      },
      closing: true,
    },
  });

  if (!cashSession) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  if (cashSession.closing) {
    return NextResponse.json({ error: "Esta jornada ya fue cerrada" }, { status: 409 });
  }

  const activeOps = cashSession.operations.filter((op) => op.status !== "CANCELADA");
  const totalIncome = calculateTotalIncome(activeOps);
  const totalExpense = calculateTotalExpense(activeOps);
  const totalFees = calculateTotalFees(activeOps);
  const expectedCash = calculateExpectedCash(cashSession.initialCash, activeOps);
  const { difference, status } = calculateDifference(parseInt(String(countedCash)), expectedCash);

  const voucherStats = await prisma.voucher.findMany({
    where: {
      operationId: { in: activeOps.map((op) => op.id) },
    },
    select: { status: true },
  });

  const vouchersCount = voucherStats.length;
  const pendingVouchers = voucherStats.filter((v) => v.status === "PENDIENTE" || v.status === "FALTA").length;
  const operationsNoVoucher = activeOps.length - vouchersCount;

  // Create closing
  const closing = await prisma.dailyClosing.create({
    data: {
      sessionId,
      userId: session.user.id!,
      date: cashSession.date,
      initialCash: cashSession.initialCash,
      totalIncome,
      totalExpense,
      totalFees,
      expectedCash,
      countedCash: parseInt(String(countedCash)),
      difference,
      status,
      operationsCount: activeOps.length,
      vouchersCount,
      pendingVouchers,
      operationsNoVoucher,
      notes,
    },
    include: {
      user: { select: { id: true, name: true } },
      session: true,
    },
  });

  // Close the session
  await prisma.cashSession.update({
    where: { id: sessionId },
    data: {
      status: "CERRADA",
      closedAt: new Date(),
      closedById: session.user.id,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "DAILY_CLOSE",
    entity: "DailyClosing",
    entityId: closing.id,
    newValue: {
      date: cashSession.date,
      expectedCash,
      countedCash,
      difference,
      status,
    },
  });

  return NextResponse.json({ closing }, { status: 201 });
}
