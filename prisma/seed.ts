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
    { name: "Daniel", email: "ddaniel2607@hotmail.com", password: await bcrypt.hash("Eltra510@", 12), role: "DUENO" },
    { name: "Asesor", email: "asesor@gmail.com", password: await bcrypt.hash("123456", 12), role: "OPERADOR" },
  ];

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: userData.password,
        role: userData.role,
        name: userData.name,
      },
      create: userData,
    });
  }
  console.log("✅ Usuarios creados y actualizados");

  console.log("\n🎉 ¡Datos iniciales sembrados exitosamente!");
  console.log("\n📋 Credenciales de acceso:");
  console.log("  👑 Dueño:      ddaniel2607@hotmail.com / Eltra510@");
  console.log("  👤 Asesor:     asesor@gmail.com / 123456");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
