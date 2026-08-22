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
        { reference: { contains: search } },
        { voucherNumber: { contains: search } },
        { operationNumber: { contains: search } },
        { description: { contains: search } },
      ],
    },
    include: {
      category: true,
      user: { select: { id: true, name: true } },
    },
    take: 10,
    orderBy: { operatedAt: "desc" },
  });

  // Search vouchers
  const vouchers = await prisma.voucher.findMany({
    where: {
      OR: [
        { qrReference: { contains: search } },
        { qrOperationNum: { contains: search } },
        { qrTransactionId: { contains: search } },
        { qrAuthCode: { contains: search } },
      ],
    },
    include: {
      operation: {
        include: { category: true },
      },
    },
    take: 10,
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
