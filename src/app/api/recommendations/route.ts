import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  forbiddenOwnership,
  forbiddenRole,
  internalError,
  unauthorized,
  validationError,
} from "@/lib/api-error";

const VALID_TYPES = [
  "HARVEST_TIMING",
  "SELL_DESTINATION",
  "PRESERVATION",
  "WASTE_RECOVERY",
] as const;

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  if (ctx.userRole !== "PETANI" && ctx.userRole !== "ADMIN") {
    return forbiddenRole();
  }

  const url = new URL(req.url);

  const harvestPlanId = url.searchParams.get("harvestPlanId");
  if (!harvestPlanId) {
    return validationError("Query parameter harvestPlanId wajib diisi.");
  }

  const typeParam = url.searchParams.get("type");
  if (
    typeParam &&
    !VALID_TYPES.includes(typeParam as (typeof VALID_TYPES)[number])
  ) {
    return validationError(
      "Query parameter type tidak valid. Gunakan: HARVEST_TIMING, SELL_DESTINATION, PRESERVATION, atau WASTE_RECOVERY."
    );
  }

  const isReadParam = url.searchParams.get("isRead");
  let isRead: boolean | undefined;
  if (isReadParam === "true") isRead = true;
  else if (isReadParam === "false") isRead = false;

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  try {
    const plan = await prisma.harvestPlan.findUnique({
      where: { id: harvestPlanId },
      select: { id: true, farmerProfileId: true },
    });

    if (!plan) {
      return validationError(
        "Rencana panen tidak ditemukan untuk harvestPlanId yang diberikan."
      );
    }

    if (ctx.userRole === "PETANI") {
      const farmer = await prisma.farmerProfile.findUnique({
        where: { userId: ctx.userId },
        select: { id: true },
      });

      if (!farmer) {
        return validationError(
          "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }

      if (plan.farmerProfileId !== farmer.id) {
        return forbiddenOwnership();
      }
    }

    const where: Prisma.RecommendationWhereInput = {
      harvestPlanId,
    };
    if (typeParam) {
      where.type = typeParam as (typeof VALID_TYPES)[number];
    }
    if (isRead !== undefined) {
      where.isRead = isRead;
    }

    const [total, recommendations] = await Promise.all([
      prisma.recommendation.count({ where }),
      prisma.recommendation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json(
      {
        data: recommendations,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize) || 0,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/recommendations]", err);
    return internalError();
  }
}
