import { prisma } from "./prisma";
import { env } from "./env";

export class RateLimitError extends Error {}

/**
 * Throws RateLimitError if too many OTP codes have already been requested
 * for this phone number + purpose within the configured time window.
 */
export async function assertOtpNotRateLimited(
  phoneNumber: string,
  purpose: "REGISTER" | "LOGIN"
): Promise<void> {
  const windowStart = new Date(Date.now() - env.otpWindowMinutes * 60 * 1000);
  const count = await prisma.otpCode.count({
    where: { phoneNumber, purpose, createdAt: { gte: windowStart } },
  });
  if (count >= env.otpMaxPerWindow) {
    throw new RateLimitError(
      `Terlalu banyak permintaan OTP. Coba lagi dalam ${env.otpWindowMinutes} menit.`
    );
  }
}
