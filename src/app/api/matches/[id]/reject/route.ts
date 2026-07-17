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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const { id } = await params;

  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = body.reason;
  } catch {
    reason = undefined;
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

    const updated = await prisma.match.update({
      where: { id },
      data: {
        status: "REJECTED",
        ...(reason ? { recommendation: reason } : {}),
      },
    });

    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/matches/:id/reject]", err);
    return internalError();
  }
}
