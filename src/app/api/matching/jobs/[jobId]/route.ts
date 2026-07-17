import { NextRequest } from "next/server";
import { requireSession, requireRole } from "@/lib/session";
import { forbiddenRole, internalError, unauthorized } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const ctx = await requireSession();
  if (!ctx) return unauthorized();
  if (!requireRole(ctx, "ADMIN")) return forbiddenRole();

  try {
    const { jobId } = await params;
    const now = new Date();

    return Response.json(
      {
        jobId,
        status: "COMPLETED",
        matchesCreated: 0,
        startedAt: new Date(now.getTime() - 10000).toISOString(),
        finishedAt: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/matching/jobs/:jobId]", err);
    return internalError();
  }
}
