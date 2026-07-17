import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { processQuickQuery } from "@/lib/quick-query";

const WA_SEND_URL = process.env.WA_SEND_URL!;
const APP_URL = process.env.APP_URL || "https://gh7.expiproject.com";

function normalizePhoneE164(raw: string): string | null {
  if (!raw) return null;
  let cleaned = raw.replace(/^whatsapp:\+/, "");
  cleaned = cleaned.replace(/\D/g, "");
  if (!cleaned) return null;
  if (cleaned.startsWith("62")) return `+${cleaned}`;
  if (cleaned.startsWith("0")) return `+62${cleaned.slice(1)}`;
  if (cleaned.length >= 9) return `+62${cleaned}`;
  return null;
}

function twimlReply(message: string): Response {
  return new Response(`<Response><Message>${message}</Message></Response>`, {
    headers: { "Content-Type": "text/xml" },
    status: 200,
  });
}

async function sendReply(to: string, text: string) {
  try {
    await fetch(WA_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "", to, text }),
    });
  } catch {
    //
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const incomingText = (body.Body as string) || (body.text as string) || undefined;
  const rawFrom = (body.From as string) || (body.from as string) || undefined;

  if (!incomingText || !rawFrom) {
    return Response.json({ error: "Missing text or from field" }, { status: 400 });
  }

  const phoneE164 = normalizePhoneE164(rawFrom);
  if (!phoneE164) {
    return Response.json({ error: "Invalid phone number" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        phoneNumber: {
          in: [phoneE164, phoneE164.replace("+", ""), "0" + phoneE164.slice(3)],
        },
      },
    });

    if (!user) {
      const unregisteredReply =
        `Akun belum terdaftar. Silakan mendaftar di ${APP_URL}/register`;
      sendReply(phoneE164, unregisteredReply);
      return twimlReply(unregisteredReply);
    }

    const reply = await processQuickQuery(phoneE164, incomingText);

    await prisma.notificationLog.create({
      data: {
        userId: user.id,
        channel: "WHATSAPP",
        type: "QUICK_QUERY_RESPONSE",
        toAddress: phoneE164,
        messageContent: reply,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    sendReply(phoneE164, reply);

    return twimlReply(reply);
  } catch (err) {
    console.error("[POST /api/notifications/webhook]", err);
    return twimlReply("Maaf, terjadi kesalahan. Silakan coba lagi nanti.");
  }
}