import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

// GET /api/operations/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const operation = await prisma.operation.findUnique({
    where: { id },
    include: {
      category: true,
      user: { select: { id: true, name: true } },
      voucher: true,
      session: { select: { id: true, date: true, status: true } },
    },
  });

  if (!operation) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  return NextResponse.json({ operation });
}

// PATCH /api/operations/[id] - Update operation (Admin/Dueno only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Sin permisos para editar operaciones" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  const updated = await prisma.operation.update({
    where: { id },
    data: {
      description: body.description ?? existing.description,
      reference: body.reference ?? existing.reference,
      voucherNumber: body.voucherNumber ?? existing.voucherNumber,
      operationNumber: body.operationNumber ?? existing.operationNumber,
      status: body.status ?? existing.status,
      categoryId: body.categoryId ?? existing.categoryId,
    },
    include: {
      category: true,
      user: { select: { id: true, name: true } },
      voucher: true,
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "UPDATE",
    entity: "Operation",
    entityId: id,
    oldValue: existing,
    newValue: updated,
  });

  return NextResponse.json({ operation: updated });
}

// DELETE /api/operations/[id] - Soft delete (Dueno/Admin only with audit)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.operation.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Operación no encontrada" }, { status: 404 });

  // Mark as CANCELADA instead of deleting (preserve audit trail)
  const updated = await prisma.operation.update({
    where: { id },
    data: { status: "CANCELADA" },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "DELETE",
    entity: "Operation",
    entityId: id,
    oldValue: existing,
    newValue: { status: "CANCELADA" },
  });

  return NextResponse.json({ operation: updated });
}
