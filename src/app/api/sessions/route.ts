import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTodayString } from "@/lib/calculations";
import { createAuditLog } from "@/lib/audit";

// GET /api/sessions - Get current or today's session
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || getTodayString();

  const cashSession = await prisma.cashSession.findUnique({
    where: { date },
    include: {
      openedBy: { select: { id: true, name: true, email: true } },
      operations: {
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
      },
      closing: true,
    },
  });

  // Also get the last daily closing to suggest initial cash
  const lastClosing = await prisma.dailyClosing.findFirst({
    orderBy: { date: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ session: cashSession, lastClosing });
}

// POST /api/sessions - Open a new session
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!["DUENO", "ADMIN", "OPERADOR"].includes((session.user as { role?: string }).role || "")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { initialCash, notes } = body;

  const today = getTodayString();

  // Check if session already exists for today
  const existing = await prisma.cashSession.findUnique({ where: { date: today } });
  if (existing) {
    if (existing.status === "ABIERTA") {
      return NextResponse.json({ error: "Ya existe una caja abierta para hoy", session: existing }, { status: 409 });
    }

    // If it was closed, reopen it with the new initial cash
    const updatedSession = await prisma.cashSession.update({
      where: { id: existing.id },
      data: {
        status: "ABIERTA",
        initialCash: parseInt(String(initialCash)) || 0,
        openedById: session.user.id!,
        notes: notes || undefined,
        closedAt: null,
        closedById: null,
      },
      include: {
        openedBy: { select: { id: true, name: true } },
      },
    });

    // Remove closing record so session is fresh and editable
    await prisma.dailyClosing.deleteMany({
      where: { sessionId: existing.id },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name || "",
      action: "OPEN_SESSION",
      entity: "CashSession",
      entityId: existing.id,
      newValue: { date: today, initialCash },
    });

    return NextResponse.json({ session: updatedSession }, { status: 200 });
  }

  const cashSession = await prisma.cashSession.create({
    data: {
      date: today,
      initialCash: parseInt(String(initialCash)) || 0,
      openedById: session.user.id!,
      notes,
      status: "ABIERTA",
    },
    include: {
      openedBy: { select: { id: true, name: true } },
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "OPEN_SESSION",
    entity: "CashSession",
    entityId: cashSession.id,
    newValue: { date: today, initialCash },
  });

  return NextResponse.json({ session: cashSession }, { status: 201 });
}
