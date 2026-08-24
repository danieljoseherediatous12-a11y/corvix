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
  const sessionId = searchParams.get("sessionId");

  const sessionInclude = {
    openedBy: { select: { id: true, name: true, email: true } },
    operations: {
      include: {
        category: true,
        user: { select: { id: true, name: true } },
        voucher: true,
      },
      orderBy: { operatedAt: "desc" as const },
    },
    cashCounts: {
      include: { details: true },
      orderBy: { countedAt: "desc" as const },
    },
    closing: true,
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

  // Check if an open session already exists for today
  const existingOpen = await prisma.cashSession.findFirst({
    where: { date: today, status: "ABIERTA" },
  });

  if (existingOpen) {
    return NextResponse.json(
      { error: "Ya existe una caja abierta actualmente para hoy", session: existingOpen },
      { status: 409 }
    );
  }

  // Create a brand new session with fresh zero operations for this turn
  const cashSession = await prisma.cashSession.create({
    data: {
      date: today,
      initialCash: parseInt(String(initialCash)) || 0,
      openedById: session.user.id!,
      notes: notes || null,
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
