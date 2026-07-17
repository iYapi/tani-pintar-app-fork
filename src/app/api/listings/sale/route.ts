import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import {
  createSaleListingSchema,
  listSaleQuerySchema,
  type ListSaleQuery,
} from "@/lib/schemas/listing";
import {
  businessRuleViolation,
  forbiddenRole,
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

export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const parsed = listSaleQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationError(
      "Query parameter tidak valid.",
      parsed.error.flatten()
    );
  }

  const {
    commodity,
    status,
    farmerProfileId,
    isOversupply,
    minPricePerUnit,
    maxPricePerUnit,
    minVolume,
    maxVolume,
    page,
    pageSize,
  } = parsed.data as ListSaleQuery;

  try {
    const where: Prisma.SaleListingWhereInput = {};

    if (commodity) where.commodity = commodity;
    if (status) where.status = status;
    if (farmerProfileId) where.farmerProfileId = farmerProfileId;
    if (isOversupply !== undefined) where.isOversupply = isOversupply;

    if (minPricePerUnit !== undefined || maxPricePerUnit !== undefined) {
      where.pricePerUnit = {};
      if (minPricePerUnit !== undefined) where.pricePerUnit.gte = minPricePerUnit;
      if (maxPricePerUnit !== undefined) where.pricePerUnit.lte = maxPricePerUnit;
    }

    if (minVolume !== undefined || maxVolume !== undefined) {
      where.volume = {};
      if (minVolume !== undefined) where.volume.gte = minVolume;
      if (maxVolume !== undefined) where.volume.lte = maxVolume;
    }

    const [total, data] = await Promise.all([
      prisma.saleListing.count({ where }),
      prisma.saleListing.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
    console.error("[GET /api/listings/sale]", err);
    return internalError();
  }
}

export async function POST(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "PETANI")) return forbiddenRole();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const parsed = createSaleListingSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const farmerProfile = await getFarmerProfileByUserId(ctx.userId);
    if (!farmerProfile) {
      return businessRuleViolation(
        "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    if (parsed.data.harvestPlanId) {
      const harvestPlan = await prisma.harvestPlan.findFirst({
        where: {
          id: parsed.data.harvestPlanId,
          farmerProfileId: farmerProfile.id,
        },
        select: { id: true },
      });

      if (!harvestPlan) {
        return notFound(
          "Rencana panen tidak ditemukan atau bukan milik Anda."
        );
      }
    }

    const listing = await prisma.saleListing.create({
      data: {
        farmerProfileId: farmerProfile.id,
        harvestPlanId: parsed.data.harvestPlanId ?? null,
        commodity: parsed.data.commodity,
        volume: parsed.data.volume,
        unit: parsed.data.unit,
        pricePerUnit: parsed.data.pricePerUnit,
        locationName: parsed.data.locationName,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        isOversupply: parsed.data.isOversupply,
        status: "OPEN",
      },
    });

    return Response.json(listing, { status: 201 });
  } catch (err) {
    console.error("[POST /api/listings/sale]", err);
    return internalError();
  }
}
