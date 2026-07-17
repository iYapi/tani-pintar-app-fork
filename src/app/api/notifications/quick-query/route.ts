import { NextRequest } from "next/server";
import { unauthorized, validationError, internalError } from "@/lib/api-error";
import { processQuickQuery } from "@/lib/quick-query";

const WA_SEND_URL = process.env.WA_SEND_URL!;

function checkInternalSecret(req: NextRequest): boolean {
  const secret = req.headers.get("X-Internal-Secret");
  return secret === (process.env.INTERNAL_API_SECRET || "dev-internal-secret-change-in-production");
}

export async function POST(req: NextRequest) {
  if (!checkInternalSecret(req)) return unauthorized();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber : null;
  const query = typeof body.query === "string" ? body.query : null;

  if (!phoneNumber) return validationError("phoneNumber wajib diisi.");
  if (!query) return validationError("query wajib diisi.");

  try {
    const reply = await processQuickQuery(phoneNumber, query);

    try {
      fetch(WA_SEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "", to: phoneNumber, text: reply }),
      }).catch(() => {});
    } catch {
      //
    }

    return Response.json({ reply }, { status: 200 });
  } catch (err) {
    console.error("[POST /api/notifications/quick-query]", err);
    return internalError();
  }
}