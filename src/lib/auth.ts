import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { verifySessionToken } from "./jwt";

export const SESSION_COOKIE = "session_token";

/** Reads the session cookie, verifies the JWT, and loads the current user (or null). */
export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return user;
}
