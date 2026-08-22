import { prisma } from "../src/lib/db";
import bcrypt from "bcryptjs";
import "dotenv/config";

async function main() {
  console.log("🌱 Sembrando datos iniciales...");

  const settings = [
    { key: "business_name", value: "Mi Corresponsal", label: "Nombre del negocio" },
    { key: "owner_name", value: "Propietario", label: "Nombre del propietario" },
    { key: "currency", value: "COP", label: "Moneda" },
    { key: "currency_symbol", value: "$", label: "Símbolo de moneda" },
    { key: "timezone", value: "America/Bogota", label: "Zona horaria" },
    { key: "open_time", value: "08:00", label: "Hora de apertura" },
    { key: "close_time", value: "18:00", label: "Hora de cierre" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({ where: { key: setting.key }, update: {}, create: setting });
  }
  console.log("✅ Configuración creada");

  const denominations = [
    { value: 100000, label: "$100.000", type: "BILLETE", order: 1 },
    { value: 50000, label: "$50.000", type: "BILLETE", order: 2 },
    { value: 20000, label: "$20.000", type: "BILLETE", order: 3 },
    { value: 10000, label: "$10.000", type: "BILLETE", order: 4 },
    { value: 5000, label: "$5.000", type: "BILLETE", order: 5 },
    { value: 2000, label: "$2.000", type: "BILLETE", order: 6 },
    { value: 1000, label: "$1.000", type: "BILLETE", order: 7 },
    { value: 500, label: "$500", type: "MONEDA", order: 8 },
    { value: 200, label: "$200", type: "MONEDA", order: 9 },
    { value: 100, label: "$100", type: "MONEDA", order: 10 },
    { value: 50, label: "$50", type: "MONEDA", order: 11 },
  ];

  for (const denom of denominations) {
    const existing = await prisma.cashDenomination.findFirst({ where: { value: denom.value } });
    if (!existing) await prisma.cashDenomination.create({ data: denom });
  }
  console.log("✅ Denominaciones COP creadas");

  const categories = [
    { name: "Depósito", type: "INGRESO", color: "#22c55e", order: 1 },
    { name: "Pago de factura", type: "INGRESO", color: "#16a34a", order: 2 },
    { name: "Recarga", type: "INGRESO", color: "#15803d", order: 3 },
    { name: "Pago de servicio", type: "INGRESO", color: "#166534", order: 4 },
    { name: "Comisión", type: "INGRESO", color: "#14532d", order: 5 },
    { name: "Otro ingreso", type: "INGRESO", color: "#4ade80", order: 6 },
    { name: "Retiro", type: "EGRESO", color: "#ef4444", order: 7 },
    { name: "Pago", type: "EGRESO", color: "#dc2626", order: 8 },
    { name: "Devolución", type: "EGRESO", color: "#b91c1c", order: 9 },
    { name: "Entrega de efectivo", type: "EGRESO", color: "#991b1b", order: 10 },
    { name: "Gasto autorizado", type: "EGRESO", color: "#7f1d1d", order: 11 },
    { name: "Otro egreso", type: "EGRESO", color: "#f87171", order: 12 },
  ];

  for (const cat of categories) {
    const existing = await prisma.operationCategory.findFirst({ where: { name: cat.name, type: cat.type } });
    if (!existing) await prisma.operationCategory.create({ data: cat });
  }
  console.log("✅ Categorías creadas");

  const users = [
    { name: "Dueño", email: "dueno@corresponsal.com", password: await bcrypt.hash("dueno123", 12), role: "DUENO" },
    { name: "Administrador", email: "admin@corresponsal.com", password: await bcrypt.hash("admin123", 12), role: "ADMIN" },
    { name: "Operador", email: "operador@corresponsal.com", password: await bcrypt.hash("operador123", 12), role: "OPERADOR" },
  ];

  for (const userData of users) {
    const existing = await prisma.user.findUnique({ where: { email: userData.email } });
    if (!existing) await prisma.user.create({ data: userData });
  }
  console.log("✅ Usuarios creados");

  console.log("\n🎉 ¡Datos iniciales sembrados exitosamente!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("  👑 Dueño:      dueno@corresponsal.com / dueno123");
  console.log("  🔐 Admin:      admin@corresponsal.com / admin123");
  console.log("  👤 Operador:   operador@corresponsal.com / operador123");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
