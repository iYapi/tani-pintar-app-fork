import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import {
  createBuyerProfileSchema,
  updateBuyerProfileSchema,
} from "@/lib/schemas/buyer";
import {
  conflict,
  forbiddenRole,
  internalError,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api-error";

export async function GET() {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "BUYER")) return forbiddenRole();

  try {
    const profile = await prisma.buyerProfile.findUnique({
      where: { userId: ctx.userId },
    });

    if (!profile) {
      return notFound("Profil buyer belum dibuat.");
    }

    return Response.json(profile, { status: 200 });
  } catch (err) {
    console.error("[GET /api/buyers/profile]", err);
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

  const parsed = createBuyerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const profile = await prisma.buyerProfile.create({
      data: {
        userId: ctx.userId,
        businessName: parsed.data.businessName,
        businessType: parsed.data.businessType,
        locationName: parsed.data.locationName,
        latitude: parsed.data.latitude,
        longitude: parsed.data.longitude,
        capacityAbsorption: parsed.data.capacityAbsorption,
        capacityUnit: parsed.data.capacityUnit,
        contactPhone: parsed.data.contactPhone,
      },
    });

    return Response.json(profile, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return conflict(
          "Profil buyer untuk akun ini sudah ada. Gunakan PATCH untuk memperbarui."
        );
      }
    }
    console.error("[POST /api/buyers/profile]", err);
    return internalError();
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "BUYER")) return forbiddenRole();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const parsed = updateBuyerProfileSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const existing = await prisma.buyerProfile.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!existing) {
      return notFound("Profil buyer belum dibuat.");
    }

    const updated = await prisma.buyerProfile.update({
      where: { userId: ctx.userId },
      data: parsed.data,
    });

    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/buyers/profile]", err);
    return internalError();
  }
}