import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  businessRuleViolation,
  conflict,
  forbiddenOwnership,
  internalError,
  notFound,
  unauthorized,
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

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const { id } = await params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
      include: { saleListing: true, demandListing: true },
    });

    if (!match) {
      return notFound("Match tidak ditemukan.");
    }

    if (match.status !== "PROPOSED") {
      return conflict(
        `Match tidak dapat diterima karena status saat ini adalah ${match.status}.`
      );
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

    const saleListing = match.saleListing;

    const [updatedMatch, transaction] = await prisma.$transaction([
      prisma.match.update({
        where: { id },
        data: { status: "ACCEPTED" },
      }),
      prisma.transaction.create({
        data: {
          matchId: match.id,
          farmerProfileId: match.farmerProfileId,
          buyerProfileId: match.buyerProfileId,
          commodity: saleListing.commodity,
          volume: saleListing.volume,
          unit: saleListing.unit,
          pricePerUnit: saleListing.pricePerUnit ?? 0,
          totalAmount: saleListing.volume * (saleListing.pricePerUnit ?? 0),
          currency: "IDR",
          status: "PENDING",
        },
      }),
    ]);

    return Response.json(
      { match: updatedMatch, transactionId: transaction.id },
      { status: 200 }
    );
  } catch (err) {
    console.error("[PATCH /api/matches/:id/accept]", err);
    return internalError();
  }
}
