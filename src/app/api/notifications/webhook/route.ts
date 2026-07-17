import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizePhoneNumber(raw: string): string | null {
  if (!raw) return null;
  let cleaned = raw.replace(/^whatsapp:\+/, "");
  cleaned = cleaned.replace(/\D/g, "");
  if (!cleaned) return null;
  if (!cleaned.startsWith("62") && cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }
  return cleaned;
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

function twimlReply(message: string): Response {
  return new Response(
    `<Response><Message>${message}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" }, status: 200 }
  );
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incomingText =
    (body.Body as string) || (body.text as string) || undefined;
  const rawFrom = (body.From as string) || (body.from as string) || undefined;

  if (!incomingText || !rawFrom) {
    return Response.json({ error: "Missing text or from field" }, { status: 400 });
  }

  const phoneNumber = normalizePhoneNumber(rawFrom);
  if (!phoneNumber) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      const unregisteredReply =
        "Akun belum terdaftar. Silakan mendaftar di https://tanipintar.id/register";
      try {
        const waUrl =
          process.env.WA_SEND_URL ||
          "https://botgh7.expiproject.com/api/send-message";
        fetch(waUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: "", to: phoneNumber, text: unregisteredReply }),
        }).catch(() => {});
      } catch {
        //
      }
      return twimlReply(unregisteredReply);
    }

    const reply = processQuickQuery(phoneNumber, incomingText);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        channel: "WHATSAPP",
        type: "QUICK_QUERY_RESPONSE",
        toAddress: phoneNumber,
        messageContent: reply,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    try {
      const waUrl =
        process.env.WA_SEND_URL ||
        "https://botgh7.expiproject.com/api/send-message";
      fetch(waUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "", to: phoneNumber, text: reply }),
      }).catch(() => {});
    } catch {
      //
    }

    return twimlReply(reply);
  } catch (err) {
    console.error("[POST /api/notifications/webhook]", err);
    return twimlReply(
      "Maaf, terjadi kesalahan. Silakan coba lagi nanti."
    );
  }
}
