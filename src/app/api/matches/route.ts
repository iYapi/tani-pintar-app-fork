import { NextRequest } from "next/server";
import { Prisma, MatchStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import {
  businessRuleViolation,
  forbiddenRole,
  internalError,
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

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get("status") as MatchStatus | null;
  const saleListingId = url.searchParams.get("saleListingId");
  const demandListingId = url.searchParams.get("demandListingId");
  const farmerProfileId = url.searchParams.get("farmerProfileId");
  const buyerProfileId = url.searchParams.get("buyerProfileId");
  const minScoreRaw = url.searchParams.get("minScore");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(100, parseInt(url.searchParams.get("pageSize") ?? "20", 10) || 20));
  const minScore = minScoreRaw ? parseFloat(minScoreRaw) : undefined;

  try {
    const where: Prisma.MatchWhereInput = {};

    if (status) where.status = status;
    if (saleListingId) where.saleListingId = saleListingId;
    if (demandListingId) where.demandListingId = demandListingId;
    if (minScore !== undefined && !Number.isNaN(minScore)) where.score = { gte: minScore };

    if (ctx.userRole === "PETANI") {
      const farmerProfile = await getFarmerProfileByUserId(ctx.userId);
      if (!farmerProfile) {
        return businessRuleViolation(
          "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }
      where.farmerProfileId = farmerProfile.id;
    } else if (ctx.userRole === "BUYER") {
      const buyerProfile = await getBuyerProfileByUserId(ctx.userId);
      if (!buyerProfile) {
        return businessRuleViolation(
          "Profil buyer belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }
      where.buyerProfileId = buyerProfile.id;
    }

    if (farmerProfileId) where.farmerProfileId = farmerProfileId;
    if (buyerProfileId) where.buyerProfileId = buyerProfileId;

    const [total, data] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({
        where,
        orderBy: { score: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json(
      {
        data,
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
    console.error("[GET /api/matches]", err);
    return internalError();
  }
}
