import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import {
  createDemandListingSchema,
  listDemandQuerySchema,
  type ListDemandQuery,
} from "@/lib/schemas/listing";
import {
  businessRuleViolation,
  forbiddenRole,
  internalError,
  unauthorized,
  validationError,
} from "@/lib/api-error";

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
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const parsed = listDemandQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationError(
      "Query parameter tidak valid.",
      parsed.error.flatten()
    );
  }

  const {
    commodity,
    status,
    buyerProfileId,
    minVolume,
    maxVolume,
    page,
    pageSize,
  } = parsed.data as ListDemandQuery;

  try {
    const where: Prisma.DemandListingWhereInput = {};

    if (buyerProfileId) {
      where.buyerProfileId = buyerProfileId;
      if (status) where.status = status;
    } else {
      where.status = status ?? "OPEN";
    }

    if (commodity) where.commodity = commodity;

    if (minVolume !== undefined || maxVolume !== undefined) {
      where.volume = {};
      if (minVolume !== undefined) where.volume.gte = minVolume;
      if (maxVolume !== undefined) where.volume.lte = maxVolume;
    }

    const [total, data] = await Promise.all([
      prisma.demandListing.count({ where }),
      prisma.demandListing.findMany({
        where,
        orderBy: { deadline: "asc" },
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
    console.error("[GET /api/listings/demand]", err);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "BUYER")) return forbiddenRole();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const parsed = createDemandListingSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const buyerProfile = await getBuyerProfileByUserId(ctx.userId);
    if (!buyerProfile) {
      return businessRuleViolation(
        "Profil buyer belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    const listing = await prisma.demandListing.create({
      data: {
        buyerProfileId: buyerProfile.id,
        commodity: parsed.data.commodity,
        volume: parsed.data.volume,
        unit: parsed.data.unit,
        locationName: parsed.data.locationName,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        maxPricePerUnit: parsed.data.maxPricePerUnit,
        deadline: new Date(parsed.data.deadline),
        description: parsed.data.description,
        status: "OPEN",
      },
    });

    return Response.json(listing, { status: 201 });
  } catch (err) {
    console.error("[POST /api/listings/demand]", err);
    return internalError();
  }
}
