import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { unauthorized, notFound, validationError, internalError } from "@/lib/api-error";

function checkInternalSecret(req: NextRequest): boolean {
  const secret = req.headers.get("X-Internal-Secret");
  return secret === (process.env.INTERNAL_API_SECRET || "dev-internal-secret-change-in-production");
}

function isValidChannel(ch: unknown): ch is "WHATSAPP" | "SMS" | "EMAIL" {
  return ch === "WHATSAPP" || ch === "SMS" || ch === "EMAIL";
}

function isValidType(t: unknown): t is "OVERSUPPLY_ALERT" | "PRICE_DROP_ALERT" | "MATCH_PROPOSAL" | "SYSTEM" {
  return t === "OVERSUPPLY_ALERT" || t === "PRICE_DROP_ALERT" || t === "MATCH_PROPOSAL" || t === "SYSTEM";
}

export async function POST(req: NextRequest) {
  if (!checkInternalSecret(req)) return unauthorized();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return validationError("Body request bukan JSON valid.");
  }

  const userId = typeof body.userId === "string" ? body.userId : null;
  const channel = isValidChannel(body.channel) ? body.channel : "WHATSAPP";
  const type = isValidType(body.type) ? body.type : null;
  const messageContent = typeof body.messageContent === "string" ? body.messageContent : null;
  const toAddress = typeof body.toAddress === "string" ? body.toAddress : undefined;
  const metadata = typeof body.metadata === "object" && body.metadata !== null ? body.metadata : undefined;

  if (!userId) return validationError("userId wajib diisi.");
  if (!type) return validationError("type wajib diisi.");
  if (!messageContent) return validationError("messageContent wajib diisi.");

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phoneNumber: true },
    });
    if (!user) return notFound("User tidak ditemukan.");

    const recipient = toAddress || user.phoneNumber;

    const notificationRecord = await prisma.notificationLog.create({
      data: {
        userId,
        channel,
        type: type as "OVERSUPPLY_ALERT" | "PRICE_DROP_ALERT" | "MATCH_PROPOSAL" | "SYSTEM",
        toAddress: recipient,
        messageContent,
        status: "QUEUED",
      },
    });

    const waUrl =
      process.env.WA_SEND_URL ||
      "https://botgh7.expiproject.com/api/send-message";
    fetch(waUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: notificationRecord.id,
        to: recipient,
        text: messageContent,
      }),
    })
      .then(async (res) => {
        if (res.ok) {
          await prisma.notificationLog.update({
            where: { id: notificationRecord.id },
            data: { status: "DELIVERED", sentAt: new Date() },
          });
        } else {
          await prisma.notificationLog.update({
            where: { id: notificationRecord.id },
            data: { status: "FAILED", errorMessage: await res.text() },
          });
        }
      })
      .catch(async (err) => {
        await prisma.notificationLog.update({
          where: { id: notificationRecord.id },
          data: { status: "FAILED", errorMessage: String(err) },
        });
      });

    return Response.json(
      { notificationId: notificationRecord.id, status: "QUEUED" },
      { status: 202 }
    );
  } catch (err) {
    console.error("[POST /api/notifications/send]", err);
    return internalError();
  }
}
