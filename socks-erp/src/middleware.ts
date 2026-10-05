import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") || pathname === "/login") return NextResponse.next();
  const t = req.cookies.get("session")?.value;
  try {
    if (!t) throw new Error("none");
    await jwtVerify(t, new TextEncoder().encode(process.env.AUTH_SECRET ?? ""));
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
export const config = { matcher: ["/((?!_next|favicon.ico|manifest.json|icons).*)"] };
