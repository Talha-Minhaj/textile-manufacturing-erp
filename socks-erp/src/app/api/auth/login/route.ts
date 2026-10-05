import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";

const attempts = new Map<string, { n: number; t: number }>();
const body = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Enter your username and password." }, { status: 400 });
  const { username, password } = parsed.data;

  const a = attempts.get(username.toLowerCase());
  if (a && a.n >= 5 && Date.now() - a.t < 15 * 60_000)
    return Response.json({ error: "Too many tries. Wait 15 minutes and try again." }, { status: 429 });

  const user = await db.user.findUnique({ where: { username }, include: { role: true } });
  const ok = user?.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) {
    const k = username.toLowerCase();
    attempts.set(k, { n: (a && Date.now() - a.t < 15 * 60_000 ? a.n : 0) + 1, t: Date.now() });
    return Response.json({ error: "Wrong username or password." }, { status: 401 });
  }
  attempts.delete(username.toLowerCase());
  await createSession({ uid: user.id, name: user.name, role: user.role.name, roleId: user.roleId });
  return Response.json({ ok: true });
}
