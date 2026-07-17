import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import {
  createHarvestPlanSchema,
  listHarvestPlansQuerySchema,
  type ListHarvestPlansQuery,
} from "@/lib/schemas/harvest-plan";
import {
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

// §6.2 GET list — PETANI (milik sendiri) atau ADMIN (semua)
export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  // role check: PETANI atau ADMIN saja
  if (ctx.userRole !== "PETANI" && ctx.userRole !== "ADMIN") {
    return forbiddenRole();
  }

  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const parsed = listHarvestPlansQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationError("Query parameter tidak valid.", parsed.error.flatten());
  }

  const { status, commodity, dateFrom, dateTo, page, pageSize } =
    parsed.data as ListHarvestPlansQuery;

  try {
    // Bangun where clause
    const where: Prisma.HarvestPlanWhereInput = {};
    if (status) where.status = status;
    if (commodity) where.commodity = commodity;
    if (dateFrom || dateTo) {
      where.readyToHarvestDate = {};
      if (dateFrom) where.readyToHarvestDate.gte = new Date(dateFrom);
      if (dateTo) where.readyToHarvestDate.lte = new Date(`${dateTo}T23:59:59Z`);
    }

    // Scope by role: PETANI hanya profilnya sendiri, ADMIN lihat semua
    if (ctx.userRole === "PETANI") {
      const farmer = await getFarmerProfileByUserId(ctx.userId);
      if (!farmer) {
        // Sama seperti pola /api/farmers/lands: 422 prerequisite
        return validationError(
          "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }
      where.farmerProfileId = farmer.id;
    }

    const [total, plans] = await Promise.all([
      prisma.harvestPlan.count({ where }),
      prisma.harvestPlan.findMany({
        where,
        orderBy: { readyToHarvestDate: "asc" }, // hardcode per kontrak §6.2
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json(
      {
        data: plans,
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
    console.error("[GET /api/harvest-plans]", err);
    return internalError();
  }
}

// §6.1 POST create — PETANI
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

  const parsed = createHarvestPlanSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const farmer = await getFarmerProfileByUserId(ctx.userId);
    if (!farmer) {
      return validationError(
        "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    // Validasi landId milik petani (kontrak: 404 bila tidak ditemukan/bukan milik)
    if (parsed.data.landId) {
      const owned = await prisma.land.findFirst({
        where: {
          id: parsed.data.landId,
          farmerProfileId: farmer.id,
        },
        select: { id: true },
      });
      if (!owned) {
        return notFound("Lahan tidak ditemukan atau bukan milik Anda.");
      }
    }

    const plan = await prisma.harvestPlan.create({
      data: {
        farmerProfileId: farmer.id,
        landId: parsed.data.landId ?? null,
        commodity: parsed.data.commodity,
        estimatedVolume: parsed.data.estimatedVolume,
        volumeUnit: parsed.data.volumeUnit,
        readyToHarvestDate: new Date(`${parsed.data.readyToHarvestDate}T00:00:00Z`),
        notes: parsed.data.notes,
        // status default per skema Prisma: DRAFT
      },
    });

    // Setelah dibuat, set status yang lebih tepat: kontrak response contoh status=PLANNED
    const created = await prisma.harvestPlan.update({
      where: { id: plan.id },
      data: { status: "PLANNED" },
    });

    return Response.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2003") {
        return notFound("Lahan tidak ditemukan atau bukan milik Anda.");
      }
    }
    console.error("[POST /api/harvest-plans]", err);
    return internalError();
  }
}