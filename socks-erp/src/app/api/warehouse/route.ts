import { db } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { transfer } from "@/lib/stock";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("warehouse", "view");
  if (g instanceof Response) return g;

  const [warehouses, balances, materials, products, movements] = await Promise.all([
    db.warehouse.findMany({
      orderBy: { id: "asc" },
      include: {
        balances: true,
      },
    }),
    db.stockBalance.findMany({
      include: {
        warehouse: true,
      },
    }),
    db.material.findMany({ where: { isActive: true } }),
    db.product.findMany({ where: { isActive: true } }),
    db.stockMovement.findMany({
      orderBy: { id: "desc" },
      take: 30,
      include: {
        warehouse: true,
        material: true,
        product: true,
        createdBy: { select: { name: true } },
      },
    }),
  ]);

  // Enrich balances with material/product details
  const enrichedBalances = balances.map((b) => {
    let itemDetail: any = null;
    let kind: "material" | "product" = "material";
    if (b.materialId) {
      itemDetail = materials.find((m) => m.id === b.materialId);
      kind = "material";
    } else if (b.productId) {
      itemDetail = products.find((p) => p.id === b.productId);
      kind = "product";
    }
    return {
      ...b,
      item: itemDetail,
      kind,
      dozen: kind === "product" ? Number(b.qty) / 12 : null,
    };
  });

  // Calculate totals
  const totalYarnKg = balances
    .filter((b) => b.materialId)
    .reduce((acc, b) => acc + Number(b.qty || 0), 0);

  const totalSockPairs = balances
    .filter((b) => b.productId)
    .reduce((acc, b) => acc + Number(b.qty || 0), 0);

  const fgA = warehouses.find((w) => w.name.includes("Category A"));
  const fgB = warehouses.find((w) => w.name.includes("Category B"));

  const pairsA = fgA
    ? balances.filter((b) => b.warehouseId === fgA.id && b.productId).reduce((acc, b) => acc + Number(b.qty || 0), 0)
    : 0;
  const pairsB = fgB
    ? balances.filter((b) => b.warehouseId === fgB.id && b.productId).reduce((acc, b) => acc + Number(b.qty || 0), 0)
    : 0;

  return Response.json({
    warehouses,
    balances: enrichedBalances,
    materials,
    products,
    recentMovements: movements,
    stats: {
      totalYarnKg,
      totalSockPairs,
      totalSockDozen: totalSockPairs / 12,
      dozenA: pairsA / 12,
      dozenB: pairsB / 12,
      warehouseCount: warehouses.length,
    },
  });
}

export async function POST(req: Request) {
  const b = await req.json();

  // If action is TRANSFER
  if (b.action === "TRANSFER") {
    const g = await guard("warehouse", "edit");
    if (g instanceof Response) return g;

    const fromWarehouseId = Number(b.fromWarehouseId);
    const toWarehouseId = Number(b.toWarehouseId);
    const qty = Number(b.qty);
    const materialId = b.materialId ? Number(b.materialId) : undefined;
    const productId = b.productId ? Number(b.productId) : undefined;
    const note = b.note ? String(b.note).trim() : "Inter-warehouse transfer";

    if (!fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) {
      return Response.json({ error: "Select two different warehouses." }, { status: 400 });
    }
    if (!(qty > 0)) {
      return Response.json({ error: "Quantity must be greater than zero." }, { status: 400 });
    }
    if (!materialId && !productId) {
      return Response.json({ error: "Select an item to transfer." }, { status: 400 });
    }

    try {
      await transfer({
        userId: g.uid,
        qty,
        fromWarehouseId,
        toWarehouseId,
        materialId,
        productId,
        note,
      });
      return Response.json({ ok: true, message: "Transfer completed successfully." }, { status: 201 });
    } catch (e: any) {
      return Response.json({ error: e.message || "Transfer failed." }, { status: 400 });
    }
  }

  // Create new warehouse
  const g = await guard("warehouse", "create");
  if (g instanceof Response) return g;

  const name = String(b.name || "").trim();
  const type = String(b.type || "FINISHED").trim();
  const location = b.location ? String(b.location).trim() : null;
  const manager = b.manager ? String(b.manager).trim() : null;
  const capacity = b.capacity ? Number(b.capacity) : 10000;

  if (!name) return Response.json({ error: "Warehouse name is required." }, { status: 400 });

  const exists = await db.warehouse.findUnique({ where: { name } });
  if (exists) return Response.json({ error: "Warehouse name already exists." }, { status: 400 });

  const row = await db.warehouse.create({
    data: {
      name,
      type,
      location,
      manager,
      capacity,
    },
  });

  await audit(db, {
    userId: g.uid,
    action: "warehouse.create",
    entity: "Warehouse",
    entityId: row.id,
    newValue: row,
  });

  return Response.json({ ok: true, warehouse: row }, { status: 201 });
}
