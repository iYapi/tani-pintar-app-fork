import { NextRequest } from "next/server";
import { requireSession, requireRole } from "@/lib/session";
import { forbiddenRole, internalError, unauthorized } from "@/lib/api-error";

export async function POST(_req: NextRequest) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "ADMIN")) return forbiddenRole();

  try {
    console.warn("[POST /api/matching/run] STUB — matching engine belum diimplementasikan.");

    const jobId = crypto.randomUUID();
    const now = new Date();

    return Response.json(
      {
        jobId,
        status: "RUNNING",
        estimatedMatches: 0,
        estimatedCompletionAt: new Date(now.getTime() + 30000).toISOString(),
      },
      { status: 202 }
    );
  } catch (err) {
    console.error("[POST /api/matching/run]", err);
    return internalError();
  }
}
