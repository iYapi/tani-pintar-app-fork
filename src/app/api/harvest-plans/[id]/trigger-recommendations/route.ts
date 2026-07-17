import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole } from "@/lib/session";
import {
  forbiddenOwnership,
  forbiddenRole,
  internalError,
  notFound,
  unauthorized,
  validationError,
} from "@/lib/api-error";

// §6.6 POST /api/harvest-plans/{id}/trigger-recommendations
// Memicu backend menjalankan kalkulasi:
//   - Harvest Timing Optimizer (FR-04)
//   - Sell Destination Matcher (FR-05)
//   - Preservation Recommender (FR-06)
//   - Waste Value Recovery (FR-07)
//
// STATUS: stub. Engine rekomendasi (modul §7) belum diimplementasi.
// Saat ini endpoint hanya validasi kepemilikan & kembalikan jobId dummy
// dengan status 202. Saat engine siap, ganti blok "TODO" di bawah
// dengan enqueue job ke Redis queue / worker pool.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "PETANI")) return forbiddenRole();

  const { id } = await params;

  // Parse optional { force: false }
  let force = false;
  try {
    const body = await req.json();
    if (body && typeof body === "object" && "force" in body) {
      force = Boolean((body as { force: unknown }).force);
    }
  } catch {
    // body boleh kosong; abaikan error parse
  }

  try {
    const farmer = await prisma.farmerProfile.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!farmer) {
      return validationError(
        "Profil petani belum dibuat. Mohon lengkapi profil terlebih dahulu."
      );
    }

    const plan = await prisma.harvestPlan.findUnique({
      where: { id },
      select: { id: true, farmerProfileId: true, status: true },
    });

    if (!plan) {
      return notFound("Rencana panen tidak ditemukan.");
    }

    if (plan.farmerProfileId !== farmer.id) {
      return forbiddenOwnership();
    }

    // TODO(recommendations): enqueue job worker.
    // Untuk sekarang, kembalikan stub jobId + ETA konsisten dengan kontrak §6.6.
    const jobId = `rec-job-${plan.id}-${Date.now()}`;
    const eta = new Date(Date.now() + 30_000); // 30 detik estimasi dummy

    console.warn(
      `[trigger-recommendations] STUB aktif — engine §7 belum diimplementasi. ` +
        `planId=${plan.id} force=${force} jobId=${jobId}`
    );

    return Response.json(
      {
        jobId,
        status: "QUEUED",
        estimatedCompletionAt: eta.toISOString(),
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("[POST /api/harvest-plans/:id/trigger-recommendations]", err);
    return internalError();
  }
}