import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  businessRuleViolation,
  forbiddenOwnership,
  internalError,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api-error";

async function getFarmerProfileByUserId(userId: string) {
  return prisma.farmerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

async function getBuyerProfileByUserId(userId: string) {
  return prisma.buyerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const { id } = await params;

  let body: { actualVolume?: number; pricePerUnit?: number; notes?: string };
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  if (body.actualVolume === undefined || body.actualVolume === null) {
    return validationError("actualVolume wajib diisi.");
  }
  if (typeof body.actualVolume !== "number" || body.actualVolume <= 0) {
    return validationError("actualVolume harus berupa angka positif.");
  }
  if (body.pricePerUnit === undefined || body.pricePerUnit === null) {
    return validationError("pricePerUnit wajib diisi.");
  }
  if (typeof body.pricePerUnit !== "number" || body.pricePerUnit < 0) {
    return validationError("pricePerUnit harus berupa angka non-negatif.");
  }

  try {
    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return notFound("Match tidak ditemukan.");
    }

    if (ctx.userRole === "ADMIN") {
      return forbiddenOwnership();
    }

    let isOwner = false;

    if (ctx.userRole === "PETANI") {
      const farmerProfile = await getFarmerProfileByUserId(ctx.userId);
      if (!farmerProfile) {
        return businessRuleViolation(
          "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }
      if (match.farmerProfileId !== farmerProfile.id) {
        return forbiddenOwnership();
      }
      isOwner = true;
    }

    if (ctx.userRole === "BUYER") {
      const buyerProfile = await getBuyerProfileByUserId(ctx.userId);
      if (!buyerProfile) {
        return businessRuleViolation(
          "Profil buyer belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }
      if (match.buyerProfileId !== buyerProfile.id) {
        return forbiddenOwnership();
      }
      isOwner = true;
    }

    if (!isOwner) {
      return forbiddenOwnership();
    }

    const transaction = await prisma.transaction.findUnique({
      where: { matchId: id },
    });

    if (!transaction) {
      return notFound("Transaksi tidak ditemukan untuk match ini.");
    }

    const totalAmount = body.actualVolume * body.pricePerUnit;

    const updated = await prisma.transaction.update({
      where: { matchId: id },
      data: {
        volume: body.actualVolume,
        pricePerUnit: body.pricePerUnit,
        totalAmount,
        status: "IN_PROGRESS",
        ...(body.notes !== undefined ? { notes: body.notes } : {}),
      },
    });

    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("[POST /api/matches/:id/transaction]", err);
    return internalError();
  }
}
