import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import { updateDemandListingSchema } from "@/lib/schemas/listing";
import {
  businessRuleViolation,
  forbiddenOwnership,
  forbiddenRole,
  internalError,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api-error";

async function getBuyerProfileByUserId(userId: string) {
  return prisma.buyerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
}

type DemandOwnershipResult =
  | { listing: NonNullable<Awaited<ReturnType<typeof prisma.demandListing.findUnique>>> }
  | { error: "NOT_FOUND" | "NO_PROFILE" | "FORBIDDEN" };

async function resolveOwnership(
  listingId: string,
  ctx: { userId: string; userRole: string }
): Promise<DemandOwnershipResult> {
  const listing = await prisma.demandListing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    return { error: "NOT_FOUND" };
  }

  if (ctx.userRole === "ADMIN") {
    return { listing };
  }

  if (ctx.userRole === "BUYER") {
    const buyerProfile = await getBuyerProfileByUserId(ctx.userId);
    if (!buyerProfile) {
      return { error: "NO_PROFILE" };
    }
    if (listing.buyerProfileId !== buyerProfile.id) {
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
    const listing = await prisma.demandListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return notFound("Demand listing tidak ditemukan.");
    }

    return Response.json(listing, { status: 200 });
  } catch (err) {
    console.error("[GET /api/listings/demand/:id]", err);
    return internalError();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "BUYER")) return forbiddenRole();

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const parsed = updateDemandListingSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const result = await resolveOwnership(id, ctx);
    if ("error" in result) {
      if (result.error === "NOT_FOUND")
        return notFound("Demand listing tidak ditemukan.");
      if (result.error === "FORBIDDEN") return forbiddenOwnership();
      return businessRuleViolation(
        "Profil buyer belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    const existing = result.listing;

    if (existing.status === "CLOSED" || existing.status === "FULFILLED") {
      const { status: _status, ...nonStatusFields } = parsed.data;
      if (Object.keys(nonStatusFields).length > 0) {
        return businessRuleViolation(
          "Listing dengan status CLOSED atau FULFILLED hanya dapat diubah statusnya.",
          { currentStatus: existing.status }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.commodity !== undefined) data.commodity = parsed.data.commodity;
    if (parsed.data.volume !== undefined) data.volume = parsed.data.volume;
    if (parsed.data.unit !== undefined) data.unit = parsed.data.unit;
    if (parsed.data.locationName !== undefined)
      data.locationName = parsed.data.locationName;
    if (parsed.data.latitude !== undefined) data.latitude = parsed.data.latitude;
    if (parsed.data.longitude !== undefined) data.longitude = parsed.data.longitude;
    if (parsed.data.maxPricePerUnit !== undefined)
      data.maxPricePerUnit = parsed.data.maxPricePerUnit;
    if (parsed.data.deadline !== undefined)
      data.deadline = new Date(parsed.data.deadline);
    if (parsed.data.description !== undefined)
      data.description = parsed.data.description;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;

    const updated = await prisma.demandListing.update({
      where: { id },
      data,
    });

    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/listings/demand/:id]", err);
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
    const listing = await prisma.demandListing.findUnique({
      where: { id },
    });

    if (!listing) {
      return notFound("Demand listing tidak ditemukan.");
    }

    if (ctx.userRole === "ADMIN") {
      const updated = await prisma.demandListing.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return Response.json(updated, { status: 200 });
    }

    if (ctx.userRole === "BUYER") {
      const buyerProfile = await getBuyerProfileByUserId(ctx.userId);
      if (!buyerProfile) {
        return businessRuleViolation(
          "Profil buyer belum dibuat. Mohon lengkapi profil terlebih dahulu."
        );
      }

      if (listing.buyerProfileId !== buyerProfile.id) {
        return forbiddenOwnership();
      }

      const updated = await prisma.demandListing.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return Response.json(updated, { status: 200 });
    }

    return forbiddenRole();
  } catch (err) {
    console.error("[DELETE /api/listings/demand/:id]", err);
    return internalError();
  }
}
