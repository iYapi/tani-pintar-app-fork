import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  forbiddenOwnership,
  forbiddenRole,
  internalError,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api-error";

type OwnershipResult =
  | {
      recommendation: {
        id: string;
        isRead: boolean;
        harvestPlan: { farmerProfile: { userId: string } };
      };
    }
  | { error: "NOT_FOUND" | "FORBIDDEN" | "NO_PROFILE" };

async function resolveRecommendationOwnership(
  recommendationId: string,
  ctx: { userId: string; userRole: string }
): Promise<OwnershipResult> {
  const recommendation = await prisma.recommendation.findUnique({
    where: { id: recommendationId },
    select: {
      id: true,
      isRead: true,
      harvestPlan: {
        select: { farmerProfile: { select: { userId: true } } },
      },
    },
  });

  if (!recommendation) {
    return { error: "NOT_FOUND" };
  }

  if (ctx.userRole === "ADMIN") {
    return { recommendation };
  }

  if (ctx.userRole === "PETANI") {
    if (recommendation.harvestPlan.farmerProfile.userId !== ctx.userId) {
      return { error: "FORBIDDEN" };
    }
    return { recommendation };
  }

  return { error: "FORBIDDEN" };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  if (ctx.userRole !== "PETANI" && ctx.userRole !== "ADMIN") {
    return forbiddenRole();
  }

  const { id } = await params;

  try {
    const result = await resolveRecommendationOwnership(id, ctx);

    if ("error" in result) {
      if (result.error === "NOT_FOUND")
        return notFound("Rekomendasi tidak ditemukan.");
      if (result.error === "FORBIDDEN") return forbiddenOwnership();
      return validationError(
        "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    if (result.recommendation.isRead) {
      return Response.json({ id, isRead: true }, { status: 200 });
    }

    await prisma.recommendation.update({
      where: { id },
      data: { isRead: true },
    });

    return Response.json({ id, isRead: true }, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/recommendations/:id/read]", err);
    return internalError();
  }
}
