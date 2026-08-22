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

// GET /api/closings - Get all closings or specific date
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const limit = parseInt(searchParams.get("limit") || "30");
  const page = parseInt(searchParams.get("page") || "1");

  if (date) {
    const closing = await prisma.dailyClosing.findFirst({
      where: { date },
      include: {
        session: {
          include: {
            operations: {
              include: { category: true, voucher: true },
              orderBy: { operatedAt: "asc" },
            },
          },
        },
        user: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ closing });
  }

  const [closings, total] = await Promise.all([
    prisma.dailyClosing.findMany({
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.dailyClosing.count(),
  ]);

  return NextResponse.json({ closings, total });
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

  // Count voucher stats
  const operationsWithVoucher = activeOps.filter((op) => {
    // We'll check via separate query
    return true;
  });

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
