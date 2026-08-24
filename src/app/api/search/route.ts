import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/search - Global search
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  const search = q.trim();

  // Search operations
  const operations = await prisma.operation.findMany({
    where: {
      OR: [
        { reference: { contains: search, mode: "insensitive" } },
        { voucherNumber: { contains: search, mode: "insensitive" } },
        { operationNumber: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
    },
    include: {
      category: true,
      user: { select: { id: true, name: true } },
      voucher: true,
    },
    take: 20,
    orderBy: { operatedAt: "desc" },
  });

  // Search vouchers
  const vouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { qrReference: { contains: search, mode: "insensitive" } },
        { qrOperationNum: { contains: search, mode: "insensitive" } },
        { qrTransactionId: { contains: search, mode: "insensitive" } },
        { qrAuthCode: { contains: search, mode: "insensitive" } },
        { ocrReference: { contains: search, mode: "insensitive" } },
        { ocrOperationNum: { contains: search, mode: "insensitive" } },
        { ocrEntity: { contains: search, mode: "insensitive" } },
        { ocrText: { contains: search, mode: "insensitive" } },
        {
          operation: {
            OR: [
              { reference: { contains: search, mode: "insensitive" } },
              { operationNumber: { contains: search, mode: "insensitive" } },
              { voucherNumber: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    },
    include: {
      operation: {
        include: {
          category: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    results: {
      operations,
      vouchers,
      total: operations.length + vouchers.length,
    },
  });
}
