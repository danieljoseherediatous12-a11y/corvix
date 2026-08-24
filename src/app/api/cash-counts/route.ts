import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateExpectedCash,
  calculateDifference,
  calculateCountTotal,
} from "@/lib/calculations";
import { createAuditLog } from "@/lib/audit";

// GET /api/cash-counts - Get cash counts for a session
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  const where: Record<string, unknown> = {};
  if (sessionId) where.sessionId = sessionId;

  const cashCounts = await prisma.cashCount.findMany({
    where,
    include: {
      details: true,
      user: { select: { id: true, name: true } },
    },
    orderBy: { countedAt: "desc" },
  });

  return NextResponse.json({ cashCounts });
}

// POST /api/cash-counts - Create new cash count (arqueo)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { sessionId, details, notes } = body;

  if (!details || !Array.isArray(details)) {
    return NextResponse.json({ error: "Faltan los detalles de denominaciones del conteo" }, { status: 400 });
  }

  // Get session with operations to calculate expected cash
  let targetSessionId = sessionId;
  let cashSession = targetSessionId
    ? await prisma.cashSession.findUnique({
        where: { id: targetSessionId },
        include: {
          operations: {
            where: { status: { not: "CANCELADA" } },
            select: { netCashFlow: true },
          },
        },
      })
    : null;

  if (!cashSession) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
    cashSession = await prisma.cashSession.findFirst({
      where: { date: today, status: "ABIERTA" },
      include: {
        operations: {
          where: { status: { not: "CANCELADA" } },
          select: { netCashFlow: true },
        },
      },
    });

    if (!cashSession) {
      cashSession = await prisma.cashSession.findFirst({
        where: { status: "ABIERTA" },
        orderBy: { date: "desc" },
        include: {
          operations: {
            where: { status: { not: "CANCELADA" } },
            select: { netCashFlow: true },
          },
        },
      });
    }

    if (cashSession) {
      targetSessionId = cashSession.id;
    }
  }

  if (!cashSession || !targetSessionId) {
    return NextResponse.json({ error: "No hay una jornada activa abierta para registrar el arqueo" }, { status: 404 });
  }

  // Sanitize details
  const parsedDetails = details
    .map((d: any) => ({
      denomination: Number(d.denomination ?? d.value ?? 0),
      quantity: Number(d.quantity ?? 0),
    }))
    .filter((d) => d.denomination > 0 && d.quantity > 0);

  // Calculate expected and counted amounts
  const expectedCash = calculateExpectedCash(cashSession.initialCash, cashSession.operations);
  const countedCash = calculateCountTotal(parsedDetails);
  const { difference, status } = calculateDifference(countedCash, expectedCash);

  // Create cash count with details
  const cashCount = await prisma.cashCount.create({
    data: {
      sessionId: targetSessionId,
      userId: session.user.id!,
      expectedCash,
      countedCash,
      difference,
      status,
      notes: notes || null,
      details: {
        create: parsedDetails.map((d) => ({
          denomination: d.denomination,
          quantity: d.quantity,
          subtotal: d.denomination * d.quantity,
        })),
      },
    },
    include: {
      details: true,
      user: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "CASH_COUNT",
    entity: "CashCount",
    entityId: cashCount.id,
    newValue: { expectedCash, countedCash, difference, status },
  });

  return NextResponse.json({ cashCount }, { status: 201 });
}
