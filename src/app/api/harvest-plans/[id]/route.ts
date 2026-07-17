import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import { updateHarvestPlanSchema } from "@/lib/schemas/harvest-plan";
import {
  businessRuleViolation,
  forbiddenOwnership,
  forbiddenRole,
  internalError,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api-error";

// Helper: dapatkan plan + cek kepemilikan.
// Return:
//   { plan }                 — sukses
//   { error: "NOT_FOUND" }   — plan tidak ada
//   { error: "NO_PROFILE" }  — farmer profile milik sesi tidak ada
//   { error: "FORBIDDEN" }   — bukan milik (untuk PETANI; admin lewati)
type OwnershipResult =
  | { plan: Prisma.HarvestPlanGetPayload<{}> }
  | { error: "NOT_FOUND" | "NO_PROFILE" | "FORBIDDEN" };

async function resolveOwnership(
  planId: string,
  ctx: { userId: string; userRole: string }
): Promise<OwnershipResult> {
  const plan = await prisma.harvestPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return { error: "NOT_FOUND" };
  }

  // ADMIN: bypass ownership
  if (ctx.userRole === "ADMIN") {
    return { plan };
  }

  // PETANI: harus milik sesi
  if (ctx.userRole === "PETANI") {
    const farmer = await prisma.farmerProfile.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!farmer) {
      return { error: "NO_PROFILE" };
    }

    if (plan.farmerProfileId !== farmer.id) {
      return { error: "FORBIDDEN" };
    }

    return { plan };
  }

  // role lain tidak punya akses
  return { error: "FORBIDDEN" };
}

function handleOwnershipError(error: "NOT_FOUND" | "NO_PROFILE" | "FORBIDDEN") {
  if (error === "NOT_FOUND") return notFound("Rencana panen tidak ditemukan.");
  if (error === "FORBIDDEN") return forbiddenOwnership();
  return validationError(
    "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
  );
}

// §6.3 GET — PETANI (own) atau ADMIN
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (ctx.userRole !== "PETANI" && ctx.userRole !== "ADMIN") {
    return forbiddenRole();
  }

  const { id } = await params;
  const wantLand = new URL(req.url).searchParams.get("include") === "land";

  try {
    const result = await resolveOwnership(id, ctx);
    if ("error" in result) {
      if (result.error === "FORBIDDEN") return forbiddenOwnership();
      if (result.error === "NOT_FOUND") return notFound("Rencana panen tidak ditemukan.");
      return validationError(
        "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    if (wantLand) {
      const withLand = await prisma.harvestPlan.findUnique({
        where: { id },
        include: { land: true },
      });
      return Response.json(withLand, { status: 200 });
    }

    return Response.json(result.plan, { status: 200 });
  } catch (err) {
    console.error("[GET /api/harvest-plans/:id]", err);
    return internalError();
  }
}

// §6.4 PATCH — PETANI (own). Aturan: READY → HARVESTED wajib actualVolume.
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

  const parsed = updateHarvestPlanSchema.safeParse(body);
  if (!parsed.success) {
    return validationError("Payload tidak valid.", parsed.error.flatten());
  }

  try {
    const result = await resolveOwnership(id, ctx);
    if ("error" in result) {
      return handleOwnershipError(result.error);
    }
    const existing = result.plan;

    // Defense-in-depth: READY → HARVESTED tanpa actualVolume → 422
    if (
      parsed.data.status === "HARVESTED" &&
      existing.status === "READY" &&
      parsed.data.actualVolume === undefined &&
      existing.actualVolume === null
    ) {
      return businessRuleViolation(
        "Transisi status READY → HARVESTED wajib mengisi actualVolume.",
        { field: "actualVolume" }
      );
    }

    // Validasi landId baru (bila diganti) tetap milik petani
    if (parsed.data.landId !== undefined && parsed.data.landId !== null) {
      const owned = await prisma.land.findFirst({
        where: {
          id: parsed.data.landId,
          farmerProfileId: existing.farmerProfileId,
        },
        select: { id: true },
      });
      if (!owned) {
        return notFound("Lahan tidak ditemukan atau bukan milik Anda.");
      }
    }

    const data: Prisma.HarvestPlanUpdateInput = {};
    if (parsed.data.landId !== undefined) {
      // null = lepas relasi; else connect. Validasi kepemilikan sudah
      // dilakukan di atas untuk landId non-null.
      data.land =
        parsed.data.landId === null
          ? { disconnect: true }
          : { connect: { id: parsed.data.landId } };
    }
    if (parsed.data.commodity !== undefined) data.commodity = parsed.data.commodity;
    if (parsed.data.estimatedVolume !== undefined)
      data.estimatedVolume = parsed.data.estimatedVolume;
    if (parsed.data.volumeUnit !== undefined) data.volumeUnit = parsed.data.volumeUnit;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.actualVolume !== undefined)
      data.actualVolume = parsed.data.actualVolume;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.readyToHarvestDate !== undefined) {
      data.readyToHarvestDate = new Date(
        `${parsed.data.readyToHarvestDate}T00:00:00Z`
      );
    }

    const updated = await prisma.harvestPlan.update({
      where: { id },
      data,
    });

    return Response.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/harvest-plans/:id]", err);
    return internalError();
  }
}

// §6.5 DELETE — PETANI (own). Hanya bila status = DRAFT atau PLANNED.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "PETANI")) return forbiddenRole();

  const { id } = await params;

  try {
    const result = await resolveOwnership(id, ctx);
    if ("error" in result) {
      return handleOwnershipError(result.error);
    }
    const existing = result.plan;

    if (existing.status !== "DRAFT" && existing.status !== "PLANNED") {
      return businessRuleViolation(
        `Rencana panen dengan status ${existing.status} tidak dapat dihapus. ` +
          "Hanya DRAFT atau PLANNED yang dapat dihapus.",
        { currentStatus: existing.status }
      );
    }

    await prisma.harvestPlan.delete({ where: { id } });

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/harvest-plans/:id]", err);
    return internalError();
  }
}