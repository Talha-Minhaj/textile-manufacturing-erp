import { destroySession } from "@/lib/auth";
export async function POST() { destroySession(); return Response.json({ ok: true }); }
