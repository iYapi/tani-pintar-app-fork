import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { searchBuyersQuerySchema, type SearchBuyersQuery } from "@/lib/schemas/buyer";
import {
  forbiddenRole,
  internalError,
  unauthorized,
  validationError,
} from "@/lib/api-error";

// §5.4 — Pencarian buyer publik (untuk referensi matching oleh petani/admin)
// Role: terproteksi (PETANI / BUYER / ADMIN boleh cari)
export async function GET(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!["PETANI", "BUYER", "ADMIN"].includes(ctx.userRole)) {
    return forbiddenRole();
  }

  const url = new URL(req.url);
  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const parsed = searchBuyersQuerySchema.safeParse(params);
  if (!parsed.success) {
    return validationError("Query parameter tidak valid.", parsed.error.flatten());
  }

  const { businessType, commodity, q, page, pageSize } =
    parsed.data as SearchBuyersQuery;

  try {
    const where: Record<string, unknown> = {};
    if (businessType) where.businessType = businessType;
    // filter by commodity aktif di demand listing
    if (commodity) {
      where.demandListings = {
        some: { commodity, status: "OPEN" },
      };
    }
    if (q) {
      where.OR = [
        { businessName: { contains: q, mode: "insensitive" } },
        { locationName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.buyerProfile.count({ where }),
      prisma.buyerProfile.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          businessType: true,
          locationName: true,
          latitude: true,
          longitude: true,
          isVerified: true,
        },
        orderBy: { businessName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return Response.json(
      {
        data: rows,
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
    console.error("[GET /api/buyers/search]", err);
    return internalError();
  }
}