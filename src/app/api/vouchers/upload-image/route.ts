import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

// POST /api/vouchers/upload-image - Upload voucher photo
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("image") as File;
    const voucherId = formData.get("voucherId") as string;

    if (!file || !voucherId) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Verify voucher exists
    const voucher = await prisma.voucher.findUnique({ where: { id: voucherId } });
    if (!voucher) return NextResponse.json({ error: "Voucher no encontrado" }, { status: 404 });

    // Save image to uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads", "vouchers");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const timestamp = Date.now();
    const fileName = `voucher_${voucherId}_${timestamp}.jpg`;
    const filePath = join(uploadsDir, fileName);
    const imageUrl = `/uploads/vouchers/${fileName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Update voucher with image info
    const updatedVoucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        imagePath: filePath,
        imageUrl,
        imageSize: buffer.length,
        imageMimeType: file.type,
        imageSavedAt: new Date(),
        status: "REGISTRADO",
      },
    });

    return NextResponse.json({ voucher: updatedVoucher, imageUrl });
  } catch (error) {
    console.error("Error uploading voucher image:", error);
    return NextResponse.json({ error: "Error al guardar imagen" }, { status: 500 });
  }
}
