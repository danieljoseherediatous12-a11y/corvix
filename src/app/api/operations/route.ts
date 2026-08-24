import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateNetCashFlow } from "@/lib/calculations";
import { createAuditLog } from "@/lib/audit";

// GET /api/operations - Get operations (with filters)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const date = searchParams.get("date");
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const page = parseInt(searchParams.get("page") || "1");

  const where: Record<string, unknown> = {};

  if (sessionId) where.sessionId = sessionId;
  if (type) where.type = type;
  if (status) where.status = status;

  if (date && !sessionId) {
    const daySession = await prisma.cashSession.findUnique({ where: { date } });
    if (daySession) where.sessionId = daySession.id;
  }

  const [operations, total] = await Promise.all([
    prisma.operation.findMany({
      where,
      include: {
        category: true,
        user: { select: { id: true, name: true } },
        voucher: true,
      },
      orderBy: { operatedAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.operation.count({ where }),
  ]);

  return NextResponse.json({ operations, total, page, limit });
}

// POST /api/operations - Create new operation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const {
    sessionId,
    categoryId,
    type,
    amount,
    receivedAmount,
    changeAmount,
    description,
    reference,
    voucherNumber,
    operationNumber,
    status: opStatus,
    voucherData,
    fee,
  } = body;

  if (!type || !amount) {
    return NextResponse.json({ error: "El tipo y el monto de la operación son requeridos" }, { status: 400 });
  }

  // Resolve session (active open session or today's session)
  let activeSessionId = sessionId;
  if (!activeSessionId) {
    const active = await prisma.cashSession.findFirst({
      where: { status: "ABIERTA" },
      orderBy: { createdAt: "desc" },
    });
    if (active) {
      activeSessionId = active.id;
    } else {
      const today = new Date().toISOString().split("T")[0];
      const existingToday = await prisma.cashSession.findUnique({ where: { date: today } });
      if (existingToday) {
        activeSessionId = existingToday.id;
      } else {
        const newSession = await prisma.cashSession.create({
          data: {
            date: today,
            initialCash: 5000000,
            openedById: session.user.id!,
            status: "ABIERTA",
          },
        });
        activeSessionId = newSession.id;
      }
    }
  }

  const numAmount = parseInt(String(amount));
  const numFee = fee !== undefined ? parseInt(String(fee)) : 0;
  const numReceived = receivedAmount ? parseInt(String(receivedAmount)) : undefined;
  const numChange = changeAmount ? parseInt(String(changeAmount)) : undefined;

  // Calculate net cash flow
  const netCashFlow = calculateNetCashFlow(
    type as "INGRESO" | "EGRESO",
    numAmount,
    numFee,
    numReceived,
    numChange
  );

  const operation = await prisma.operation.create({
    data: {
      sessionId: activeSessionId,
      categoryId: categoryId || undefined,
      userId: session.user.id!,
      type,
      amount: numAmount,
      fee: numFee,
      receivedAmount: numReceived,
      changeAmount: numChange,
      netCashFlow,
      description,
      reference,
      voucherNumber,
      operationNumber,
      status: opStatus || "COMPLETADA",
    },
    include: {
      category: true,
      user: { select: { id: true, name: true } },
      voucher: true,
    },
  });

  // If voucherData was attached, create the linked Voucher record
  if (voucherData) {
    try {
      const qr = voucherData.qrData;
      const ocr = voucherData.ocrData;
      const scannedImage: string | undefined = voucherData.scannedImage;

      // If image is a base64 data URL, save it directly
      let imageUrl: string | undefined = undefined;
      let imageMimeType: string | undefined = undefined;
      let imageSize: number | undefined = undefined;

      if (scannedImage && scannedImage.startsWith("data:image")) {
        imageUrl = scannedImage; // store as data URL (base64) in DB
        const mimeMatch = scannedImage.match(/^data:(image\/[a-z]+);base64,/);
        imageMimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        // Estimate size in bytes (base64 is ~4/3 of original)
        const base64Data = scannedImage.split(",")[1] || "";
        imageSize = Math.round((base64Data.length * 3) / 4);
      }

      await prisma.voucher.create({
        data: {
          operationId: operation.id,
          status: "REGISTRADO",
          qrRaw: qr?.raw || undefined,
          qrOperationNum: qr?.operationNumber || undefined,
          qrReference: qr?.reference || undefined,
          qrTransactionId: qr?.transactionId || undefined,
          qrAmount: qr?.amount ? parseInt(String(qr.amount)) : undefined,
          qrDate: qr?.date || undefined,
          qrTime: qr?.time || undefined,
          qrType: qr?.type || undefined,
          qrStatus: qr?.status || undefined,
          qrEntity: qr?.entity || undefined,
          qrCommerce: qr?.commerce || undefined,
          qrAuthCode: qr?.authCode || undefined,
          qrScanned: !!qr,
          qrScannedAt: qr ? new Date() : undefined,
          ocrText: ocr?.text || undefined,
          ocrAmount: ocr?.amount ? parseInt(String(ocr.amount)) : undefined,
          ocrDate: ocr?.date || undefined,
          ocrTime: ocr?.time || undefined,
          ocrReference: ocr?.reference || undefined,
          ocrOperationNum: ocr?.operationNum || undefined,
          ocrStatus: ocr?.status || undefined,
          ocrEntity: ocr?.entity || undefined,
          ocrCompleted: !!ocr?.text,
          ocrCompletedAt: ocr?.text ? new Date() : undefined,
          // Save the captured image
          imageUrl: imageUrl || undefined,
          imageMimeType: imageMimeType || undefined,
          imageSize: imageSize || undefined,
          imageSavedAt: imageUrl ? new Date() : undefined,
          scannedAt: new Date(),
        },
      });
    } catch (e) {
      console.warn("Could not create attached voucher:", e);
    }
  }


  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "CREATE",
    entity: "Operation",
    entityId: operation.id,
    newValue: { type, amount: numAmount, receivedAmount: numReceived, changeAmount: numChange, netCashFlow },
  });

  return NextResponse.json({ operation }, { status: 201 });
}
