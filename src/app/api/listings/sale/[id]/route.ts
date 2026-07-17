import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import { updateSaleListingSchema } from "@/lib/schemas/listing";
import {
  businessRuleViolation,
  forbiddenOwnership,
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

type SaleOwnershipResult =
  | { listing: NonNullable<Awaited<ReturnType<typeof prisma.saleListing.findUnique>>> }
  | { error: "NOT_FOUND" | "NO_PROFILE" | "FORBIDDEN" };

async function resolveOwnership(
  listingId: string,
  ctx: { userId: string; userRole: string }
): Promise<SaleOwnershipResult> {
  const listing = await prisma.saleListing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    return { error: "NOT_FOUND" };
  }

  if (ctx.userRole === "ADMIN") {
    return { listing };
  }

  if (ctx.userRole === "PETANI") {
    const farmerProfile = await getFarmerProfileByUserId(ctx.userId);
    if (!farmerProfile) {
      return { error: "NO_PROFILE" };
    }
    if (listing.farmerProfileId !== farmerProfile.id) {
      return { error: "FORBIDDEN" };
    }
    return { listing };
  }

  return { error: "FORBIDDEN" };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const { id } = await params;

  try {
    const listing = await prisma.saleListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return notFound("Sale listing tidak ditemukan.");
    }

    return Response.json(listing, { status: 200 });
  } catch (err) {
    console.error("[GET /api/listings/sale/:id]", err);
    return internalError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "PETANI")) return forbiddenRole();

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const parsed = updateSaleListingSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const result = await resolveOwnership(id, ctx);
    if ("error" in result) {
      if (result.error === "NOT_FOUND")
        return notFound("Sale listing tidak ditemukan.");
      if (result.error === "FORBIDDEN") return forbiddenOwnership();
      return businessRuleViolation(
        "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    if (parsed.data.harvestPlanId) {
      const existing = result.listing;
      const harvestPlan = await prisma.harvestPlan.findFirst({
        where: {
          id: parsed.data.harvestPlanId,
          farmerProfileId: existing.farmerProfileId,
        },
        select: { id: true },
      });

      if (!harvestPlan) {
        return notFound(
          "Rencana panen tidak ditemukan atau bukan milik Anda."
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.harvestPlanId !== undefined)
      data.harvestPlanId = parsed.data.harvestPlanId;
    if (parsed.data.commodity !== undefined) data.commodity = parsed.data.commodity;
    if (parsed.data.volume !== undefined) data.volume = parsed.data.volume;
    if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
    if (parsed.data.pricePerUnit !== undefined)
      data.pricePerUnit = parsed.data.pricePerUnit;
    if (parsed.data.locationName !== undefined)
      data.locationName = parsed.data.locationName;
    if (parsed.data.latitude !== undefined) data.latitude = parsed.data.latitude;
    if (parsed.data.longitude !== undefined) data.longitude = parsed.data.longitude;
    if (parsed.data.isOversupply !== undefined)
      data.isOversupply = parsed.data.isOversupply;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    const updated = await prisma.saleListing.update({
      where: { id },
      data,
    });

    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/listings/sale/:id]", err);
    return internalError();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();

  const { id } = await params;

  try {
    const listing = await prisma.saleListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return notFound("Sale listing tidak ditemukan.");
    }

    if (ctx.userRole === "ADMIN") {
      const updated = await prisma.saleListing.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return Response.json(updated, { status: 200 });
    }

    if (ctx.userRole === "PETANI") {
      const farmerProfile = await getFarmerProfileByUserId(ctx.userId);
      if (!farmerProfile) {
        return businessRuleViolation(
          "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }

      if (listing.farmerProfileId !== farmerProfile.id) {
        return forbiddenOwnership();
      }

      const updated = await prisma.saleListing.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return Response.json(updated, { status: 200 });
    }

    return forbiddenRole();
  } catch (err) {
    console.error("[DELETE /api/listings/sale/:id]", err);
    return internalError();
  }
}
