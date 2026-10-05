import { db } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { movementSchema } from "@/lib/schemas";
import { move, transfer } from "@/lib/stock";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = await guard("stock", "view");
  if (s instanceof Response) return s;
  const [materials, products, warehouses, balances, movements] = await Promise.all([
    db.material.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    db.warehouse.findMany({ orderBy: { name: "asc" } }),
    db.stockBalance.findMany({ include: { warehouse: true } }),
    db.stockMovement.findMany({
      orderBy: { id: "desc" }, take: 100,
      include: { material: true, product: true, warehouse: true, createdBy: { select: { name: true } } },
    }),
  ]);
  return Response.json({ materials, products, warehouses, balances, movements });
}

export async function POST(req: Request) {
  const s = await guard("stock", "create");
  if (s instanceof Response) return s;
  const p = movementSchema.safeParse(await req.json());
  if (!p.success) return Response.json({ error: p.error.issues[0].message }, { status: 400 });
  const d = p.data;
  const item = d.kind === "material" ? { materialId: d.itemId } : { productId: d.itemId };
  try {
    if (d.type === "TRANSFER") {
      if (!d.toWarehouseId) return Response.json({ error: "Pick the destination warehouse." }, { status: 400 });
      await transfer({ userId: s.uid, qty: d.qty, fromWarehouseId: d.warehouseId, toWarehouseId: d.toWarehouseId, note: d.note, ...item });
    } else {
      await move({ userId: s.uid, type: d.type, qty: d.qty, warehouseId: d.warehouseId, note: d.note, ...item });
    }
    return Response.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message ?? "Could not save." }, { status: 400 });
  }
}
