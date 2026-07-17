import jwt from "jsonwebtoken";
import { env } from "./env";

export interface SessionPayload {
  sub: string; // user id
  role: "farmer" | "buyer";
  phoneNumber: string;
}

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as SessionPayload;
  } catch {
    return null;
  }
}
