import { db } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const g = await guard("production", "edit");
  if (g instanceof Response) return g;

  const b = await req.json();
  const id = Number(b.id);
  if (!id) return Response.json({ error: "Machine ID is required." }, { status: 400 });

  const old = await db.machine.findUnique({ where: { id } });
  if (!old) return Response.json({ error: "Machine not found." }, { status: 404 });

  const updated = await db.machine.update({
    where: { id },
    data: {
      status: b.status ? String(b.status) : undefined,
      operator: b.operator !== undefined ? String(b.operator) : undefined,
      rpm: b.rpm ? Number(b.rpm) : undefined,
      targetPerHour: b.targetPerHour ? Number(b.targetPerHour) : undefined,
      notes: b.notes !== undefined ? String(b.notes) : undefined,
    },
  });

  await audit(db, {
    userId: g.uid,
    action: "machine.update",
    entity: "Machine",
    entityId: id,
    oldValue: old,
    newValue: updated,
  });

  return Response.json({ ok: true, machine: updated });
}
