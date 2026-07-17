import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  businessRuleViolation,
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const { id } = await params;

  try {
    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return notFound("Match tidak ditemukan.");
    }

    if (ctx.userRole === "ADMIN") {
      return Response.json(match, { status: 200 });
    }

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
      return Response.json(match, { status: 200 });
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
      return Response.json(match, { status: 200 });
    }

    return forbiddenOwnership();
  } catch (err) {
    console.error("[GET /api/matches/:id]", err);
    return internalError();
  }
}
