import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// GET /api/vouchers - List vouchers with filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sessionId = searchParams.get("sessionId");
  const date = searchParams.get("date");
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "50");
  const page = parseInt(searchParams.get("page") || "1");

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  if (search) {
    where.OR = [
      { qrReference: { contains: search } },
      { qrOperationNum: { contains: search } },
      { qrTransactionId: { contains: search } },
    ];
  }

  if (sessionId || date) {
    const opWhere: Record<string, unknown> = {};
    if (sessionId) opWhere.sessionId = sessionId;
    if (date && !sessionId) {
      const daySession = await prisma.cashSession.findUnique({ where: { date } });
      if (daySession) opWhere.sessionId = daySession.id;
    }
    where.operation = { ...opWhere };
  }

  const [vouchers, total] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        operation: {
          include: {
            category: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.voucher.count({ where }),
  ]);

  return NextResponse.json({ vouchers, total, page, limit });
}

// POST /api/vouchers - Create or update voucher for an operation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const { operationId, qrData, ocrData, status: voucherStatus } = body;

  if (!operationId) {
    return NextResponse.json({ error: "operationId es requerido" }, { status: 400 });
  }

  // Check for duplicate voucher (same QR reference already registered)
  if (qrData?.reference || qrData?.operationNumber) {
    const duplicateCheck = await prisma.voucher.findFirst({
      where: {
        OR: [
          qrData?.reference ? { qrReference: qrData.reference } : {},
          qrData?.operationNumber ? { qrOperationNum: qrData.operationNumber } : {},
          qrData?.transactionId ? { qrTransactionId: qrData.transactionId } : {},
        ].filter((w) => Object.keys(w).length > 0),
      },
      include: {
        operation: { select: { id: true, amount: true, operatedAt: true } },
      },
    });

    if (duplicateCheck && duplicateCheck.operationId !== operationId) {
      return NextResponse.json(
        {
          error: "VOUCHER_DUPLICADO",
          message: "Este voucher ya está registrado",
          existingVoucher: duplicateCheck,
        },
        { status: 409 }
      );
    }
  }

  const voucher = await prisma.voucher.upsert({
    where: { operationId },
    create: {
      operationId,
      status: voucherStatus || "REGISTRADO",
      // QR data
      qrRaw: qrData?.raw,
      qrOperationNum: qrData?.operationNumber,
      qrReference: qrData?.reference,
      qrTransactionId: qrData?.transactionId,
      qrAmount: qrData?.amount,
      qrDate: qrData?.date,
      qrTime: qrData?.time,
      qrType: qrData?.type,
      qrStatus: qrData?.status,
      qrEntity: qrData?.entity,
      qrCommerce: qrData?.commerce,
      qrAuthCode: qrData?.authCode,
      qrExtra: qrData?.extra ? JSON.stringify(qrData.extra) : undefined,
      qrScanned: !!qrData,
      qrScannedAt: qrData ? new Date() : undefined,
      // OCR data
      ocrText: ocrData?.text,
      ocrAmount: ocrData?.amount,
      ocrDate: ocrData?.date,
      ocrTime: ocrData?.time,
      ocrReference: ocrData?.reference,
      ocrOperationNum: ocrData?.operationNum,
      ocrStatus: ocrData?.status,
      ocrEntity: ocrData?.entity,
      ocrType: ocrData?.type,
      ocrCompleted: !!ocrData,
      ocrCompletedAt: ocrData ? new Date() : undefined,
      scannedAt: new Date(),
    },
    update: {
      status: voucherStatus || "REGISTRADO",
      qrRaw: qrData?.raw,
      qrOperationNum: qrData?.operationNumber,
      qrReference: qrData?.reference,
      qrTransactionId: qrData?.transactionId,
      qrAmount: qrData?.amount,
      qrDate: qrData?.date,
      qrTime: qrData?.time,
      qrType: qrData?.type,
      qrStatus: qrData?.status,
      qrEntity: qrData?.entity,
      qrCommerce: qrData?.commerce,
      qrAuthCode: qrData?.authCode,
      qrExtra: qrData?.extra ? JSON.stringify(qrData.extra) : undefined,
      qrScanned: !!qrData,
      qrScannedAt: qrData ? new Date() : undefined,
      ocrText: ocrData?.text,
      ocrAmount: ocrData?.amount,
      ocrDate: ocrData?.date,
      ocrTime: ocrData?.time,
      ocrReference: ocrData?.reference,
      ocrOperationNum: ocrData?.operationNum,
      ocrStatus: ocrData?.status,
      ocrEntity: ocrData?.entity,
      ocrType: ocrData?.type,
      ocrCompleted: !!ocrData,
      ocrCompletedAt: ocrData ? new Date() : undefined,
    },
    include: {
      operation: {
        include: { category: true, user: { select: { id: true, name: true } } },
      },
    },
  });

  await createAuditLog({
    userId: session.user.id,
    userName: session.user.name || "",
    action: "CREATE",
    entity: "Voucher",
    entityId: voucher.id,
    newValue: { operationId, hasQR: !!qrData, hasOCR: !!ocrData },
  });

  return NextResponse.json({ voucher }, { status: 201 });
}
