import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// GET /api/users - List team members (DUENO / ADMIN only)
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Acceso denegado: solo para Dueño o Administrador" }, { status: 403 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            operations: true,
            sessions: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error al cargar la lista de usuarios" }, { status: 500 });
  }
}

// POST /api/users - Create new team member (Vendedor / Operador / Admin)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Acceso denegado: solo para Dueño o Administrador" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role = "OPERADOR", active = true } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Nombre, correo y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Ya existe un usuario registrado con este correo" },
        { status: 409 }
      );
    }

    // Validate role
    const validRoles = ["OPERADOR", "ADMIN", "DUENO"];
    const finalRole = validRoles.includes(role) ? role : "OPERADOR";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: finalRole,
        active: Boolean(active),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
      },
    });

    // Record audit log
    const userId = (session.user as { id?: string }).id;
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CREATE",
          entity: "User",
          entityId: newUser.id,
          newValue: JSON.stringify({ name: newUser.name, email: newUser.email, role: newUser.role }),
        },
      }).catch(console.error);
    }

    return NextResponse.json({
      message: "Usuario creado exitosamente",
      user: newUser,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json({ error: "Error interno al crear el usuario" }, { status: 500 });
  }
}

// PATCH /api/users - Update user details, role, status or reset password
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Acceso denegado: solo para Dueño o Administrador" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, name, role, active, password } = body;

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const currentUserId = (session.user as { id?: string }).id;

    // Prevent deactivating own account
    if (id === currentUserId && active === false) {
      return NextResponse.json(
        { error: "No puedes desactivar tu propia cuenta activa" },
        { status: 400 }
      );
    }

    const updateData: {
      name?: string;
      role?: string;
      active?: boolean;
      password?: string;
    } = {};

    if (name) updateData.name = name.trim();
    if (role && ["OPERADOR", "ADMIN", "DUENO"].includes(role)) updateData.role = role;
    if (typeof active === "boolean") updateData.active = active;
    if (password && password.length >= 4) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    if (currentUserId) {
      await prisma.auditLog.create({
        data: {
          userId: currentUserId,
          action: "UPDATE",
          entity: "User",
          entityId: updatedUser.id,
          newValue: JSON.stringify(updateData),
        },
      }).catch(console.error);
    }

    return NextResponse.json({
      message: "Usuario actualizado correctamente",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error al actualizar el usuario" }, { status: 500 });
  }
}

// DELETE /api/users - Delete user
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as { role?: string }).role || "";
  if (!["DUENO", "ADMIN"].includes(userRole)) {
    return NextResponse.json({ error: "Acceso denegado: solo para Dueño o Administrador" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const currentUserId = (session.user as { id?: string }).id;
    if (id === currentUserId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta activa" }, { status: 400 });
    }

    // Check if user has operations before deleting
    const userOperationsCount = await prisma.operation.count({ where: { userId: id } });

    if (userOperationsCount > 0) {
      // If user has financial operations, deactivate to preserve audit history and balance integrity
      await prisma.user.update({
        where: { id },
        data: { active: false },
      });
      return NextResponse.json({
        message: `El usuario tiene ${userOperationsCount} operaciones registradas. Se ha desactivado el acceso para preservar el historial financiero.`,
      });
    }

    // Clean up audit logs associated with this user before hard delete
    await prisma.auditLog.deleteMany({ where: { userId: id } }).catch(() => {});
    await prisma.cashSession.deleteMany({ where: { openedById: id, operations: { none: {} } } }).catch(() => {});

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Usuario eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error al eliminar el usuario de la base de datos" }, { status: 500 });
  }
}
