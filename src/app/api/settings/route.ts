import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// GET /api/settings - Get all settings
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const [settings, denominations, categories] = await Promise.all([
    prisma.setting.findMany({ orderBy: { key: "asc" } }),
    prisma.cashDenomination.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
    prisma.operationCategory.findMany({
      where: { active: true },
      orderBy: [{ type: "asc" }, { order: "asc" }],
    }),
  ]);

  return NextResponse.json(
    { settings, denominations, categories },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    }
  );
}

// POST & PATCH /api/settings - Update settings (Admin/Dueno only)
async function updateSettingsHandler(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role || "";
  const isAuthorized = ["DUENO", "DUEÑO", "ADMIN"].includes(userRole.toUpperCase());
  if (!isAuthorized) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const rawSettings = body.settings || body;

    if (!rawSettings) {
      return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
    }

    const entries: [string, string][] = [];

    if (Array.isArray(rawSettings)) {
      for (const item of rawSettings) {
        if (item && typeof item === "object" && "key" in item) {
          entries.push([String(item.key), String(item.value ?? "")]);
        }
      }
    } else if (typeof rawSettings === "object") {
      for (const [k, v] of Object.entries(rawSettings)) {
        if (k && v !== undefined && v !== null) {
          entries.push([k, String(v)]);
        }
      }
    }

    for (const [key, value] of entries) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name || "",
      action: "UPDATE",
      entity: "Settings",
      newValue: Object.fromEntries(entries),
    });

    return NextResponse.json({ success: true, count: entries.length });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return updateSettingsHandler(req);
}

export async function PATCH(req: NextRequest) {
  return updateSettingsHandler(req);
}
