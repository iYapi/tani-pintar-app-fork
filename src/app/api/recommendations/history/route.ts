import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  forbiddenRole,
  internalError,
  unauthorized,
  validationError,
} from "@/lib/api-error";

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  if (ctx.userRole !== "PETANI" && ctx.userRole !== "ADMIN") {
    return forbiddenRole();
  }

  const url = new URL(req.url);

  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");

  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(
    1,
    Math.min(100, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20)
  );

  try {
    let farmerProfileId: string | null = null;

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

      farmerProfileId = farmer.id;
    } else {
      farmerProfileId = url.searchParams.get("farmerProfileId");
      if (!farmerProfileId) {
        return validationError(
          "Query parameter farmerProfileId wajib diisi untuk ADMIN."
        );
      }
    }

    const where: Prisma.RecommendationWhereInput = {
      harvestPlan: {
        farmerProfileId: farmerProfileId!,
      },
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59Z`);
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
    console.error("[GET /api/recommendations/history]", err);
    return internalError();
  }
}
