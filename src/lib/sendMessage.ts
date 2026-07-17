import { randomUUID } from "crypto";
import { env } from "./env";
import { toE164 } from "./phone";

/**
 * Sends the OTP code to the user's WhatsApp/phone number via the local
 * messaging API: POST http://localhost:3111/api/send-message
 * Body shape: { id, phoneNumber, text }
 */
export async function sendOtpMessage(phoneCore: string, otp: string): Promise<void> {
  const text = `Kode verifikasi Tani Pintar Anda: ${otp}. Jangan bagikan kode ini kepada siapa pun. Berlaku ${env.otpExpiryMinutes} menit.`;

  const res = await fetch(env.otpSendUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: randomUUID(),
      phoneNumber: toE164(phoneCore),
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gagal mengirim OTP (status ${res.status}): ${body}`);
  }
}
