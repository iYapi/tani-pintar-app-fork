import { NextRequest } from "next/server";
import { unauthorized, validationError, internalError } from "@/lib/api-error";

function checkInternalSecret(req: NextRequest): boolean {
  const secret = req.headers.get("X-Internal-Secret");
  return secret === (process.env.INTERNAL_API_SECRET || "dev-internal-secret-change-in-production");
}

function processQuickQuery(_phoneNumber: string, query: string): string {
  const q = query.toLowerCase();
  if (q.includes("harga") || q.includes("price")) {
    return "Harga Bawang Merah di Brebes: Rp 32.000/kg (+2%). Sumber: BAPANAS/PIHPS.";
  }
  if (q.includes("status") || q.includes("wilayah")) {
    return "Status wilayah Brebes saat ini AMAN (tidak oversupply).";
  }
  return "Gunakan dashboard TaniPintar untuk info lebih lengkap: https://tanipintar.id/dashboard";
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
    const reply = processQuickQuery(phoneNumber, query);

    const waUrl =
      process.env.WA_SEND_URL ||
      "https://botgh7.expiproject.com/api/send-message";
    try {
      fetch(waUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "",
          to: phoneNumber,
          text: reply,
        }),
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
