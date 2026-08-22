import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// GET /api/settings - Get all settings
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const settings = await prisma.setting.findMany({ orderBy: { key: "asc" } });
  const denominations = await prisma.cashDenomination.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  const categories = await prisma.operationCategory.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { order: "asc" }],
  });

  return NextResponse.json({ settings, denominations, categories });
}

// PATCH /api/settings - Update settings (Admin/Dueno only)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const body = await req.json();
  const { settings } = body;

  if (!settings || typeof settings !== "object") {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "UPDATE",
    entity: "Settings",
    newValue: settings,
  });

  return NextResponse.json({ success: true });
}
