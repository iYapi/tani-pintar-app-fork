export const env = {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  otpSendUrl: process.env.OTP_SEND_URL || "http://localhost:3111/api/send-message",
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  otpMaxPerWindow: Number(process.env.OTP_MAX_PER_WINDOW || 3),
  otpWindowMinutes: Number(process.env.OTP_WINDOW_MINUTES || 10),
};
