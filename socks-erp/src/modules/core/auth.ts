import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Enterprise User Session payload structure.
 */
export type Session = {
  uid: number;
  name: string;
  role: string;
  roleId: number;
};

const COOKIE_NAME = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 Hours

/**
 * Generates HMAC-SHA256 signing key from AUTH_SECRET.
 */
const getSecretKey = (): Uint8Array => {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET environment variable must be set with at least 16 characters.");
  }
  return new TextEncoder().encode(secret);
};

/**
 * Signs a cryptographic JWT session token and sets it as an HTTP-Only secure cookie.
 * @param session - The authenticated user credentials and role.
 */
export async function createSession(session: Session): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecretKey());

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production" && process.env.COOKIE_INSECURE !== "1",
  });
}

/**
 * Revokes the current user's session cookie.
 */
export function destroySession(): void {
  cookies().delete(COOKIE_NAME);
}

/**
 * Verifies and decodes the current request session from cookies.
 * @returns The verified user session or null if missing / expired.
 */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, getSecretKey());
    return verified.payload as unknown as Session;
  } catch {
    return null;
  }
}
