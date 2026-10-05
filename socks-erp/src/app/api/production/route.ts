import { db } from "@/lib/db";
import { guard } from "@/lib/permissions";
import { applyMovement } from "@/lib/stock";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await guard("production", "view");
  if (g instanceof Response) return g;

  const [machines, logs, products, materials, warehouses] = await Promise.all([
    db.machine.findMany({
      orderBy: { machineNo: "asc" },
      include: {
        productionLogs: {
          orderBy: { date: "desc" },
          take: 1,
          include: { product: true },
        },
      },
    }),
    db.productionLog.findMany({
      orderBy: { id: "desc" },
      take: 50,
      include: {
        machine: true,
        product: true,
        material: true,
        createdBy: { select: { id: true, name: true, username: true } },
      },
    }),
    db.product.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    db.material.findMany({ where: { isActive: true }, orderBy: { code: "asc" } }),
    db.warehouse.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Calculate summary metrics
  const totalDozen = logs.reduce((acc, l) => acc + Number(l.totalDozen || 0), 0);
  const totalA = logs.reduce((acc, l) => acc + Number(l.dozenA || 0), 0);
  const totalB = logs.reduce((acc, l) => acc + Number(l.dozenB || 0), 0);
  const avgEfficiency = logs.length
    ? Math.round(logs.reduce((acc, l) => acc + Number(l.efficiency || 0), 0) / logs.length)
    : 0;
  const avgDefect = totalDozen > 0 ? Number(((totalB / totalDozen) * 100).toFixed(1)) : 0;
  const totalYarnUsed = logs.reduce((acc, l) => acc + Number(l.yarnUsedKg || 0), 0);

  return Response.json({
    machines,
    logs,
    products,
    materials,
    warehouses,
    stats: {
      totalDozen,
      totalA,
      totalB,
      avgEfficiency,
      avgDefect,
      totalYarnUsed,
      runningCount: machines.filter((m) => m.status === "RUNNING").length,
      idleCount: machines.filter((m) => m.status === "IDLE").length,
      maintCount: machines.filter((m) => m.status === "MAINTENANCE").length,
    },
  });
}

export async function POST(req: Request) {
  const g = await guard("production", "create");
  if (g instanceof Response) return g;

  const b = await req.json();
  const machineId = Number(b.machineId);
  const productId = Number(b.productId);
  const materialId = b.materialId ? Number(b.materialId) : null;
  const shiftHours = Number(b.shiftHours || 12);
  const shiftType = String(b.shiftType || "DAY_12H");
  const operator = String(b.operator || "Operator").trim();
  const dozenA = Number(b.dozenA || 0);
  const dozenB = Number(b.dozenB || 0);
  const yarnUsedKg = Number(b.yarnUsedKg || 0);
  const notes = b.notes ? String(b.notes).trim() : null;
  const syncToStock = b.syncToStock !== false;

  if (!machineId || !productId) {
    return Response.json({ error: "Machine and Product are required." }, { status: 400 });
  }
  if (dozenA < 0 || dozenB < 0 || dozenA + dozenB <= 0) {
    return Response.json({ error: "Please enter valid dozen counts (Category A or B must be greater than 0)." }, { status: 400 });
  }

  const machine = await db.machine.findUnique({ where: { id: machineId } });
  if (!machine) return Response.json({ error: "Machine not found." }, { status: 404 });

  const totalDozen = dozenA + dozenB;
  const totalPairs = totalDozen * 12;
  const target = Number(machine.targetPerHour) * shiftHours;
  const efficiency = Math.min(100, Math.round((totalDozen / (target || 1)) * 100));
  const defectRate = Number(((dozenB / totalDozen) * 100).toFixed(1));

  const result = await db.$transaction(async (tx) => {
    // 1. Create Production Log
    const plog = await tx.productionLog.create({
      data: {
        machineId,
        productId,
        materialId,
        shiftType,
        shiftHours,
        operator,
        dozenA,
        dozenB,
        totalDozen,
        totalPairs,
        yarnUsedKg,
        efficiency,
        defectRate,
        status: "COMPLETED",
        notes,
        createdById: g.uid,
      },
    });

    // 2. Update Machine Operator & Status
    await tx.machine.update({
      where: { id: machineId },
      data: {
        operator,
        status: "RUNNING",
      },
    });

    // 3. Stock Auto-Sync
    if (syncToStock) {
      // Find Category A & B warehouses
      const fgA = (await tx.warehouse.findFirst({ where: { name: { contains: "Category A" } } })) ||
        (await tx.warehouse.findFirst({ where: { type: "FINISHED" } }));
      const fgB = (await tx.warehouse.findFirst({ where: { name: { contains: "Category B" } } })) || fgA;
      const yarnWh = (await tx.warehouse.findFirst({ where: { name: { contains: "Knitting" } } })) ||
        (await tx.warehouse.findFirst({ where: { type: "RAW" } }));

      // Add Category A socks to warehouse
      if (dozenA > 0 && fgA) {
        await applyMovement(tx, {
          type: "PRODUCTION",
          qty: dozenA * 12,
          productId,
          warehouseId: fgA.id,
          userId: g.uid,
          referenceType: "PRODUCTION_LOG",
          referenceId: plog.id,
          note: `Machine #${machine.machineNo} (${shiftType}) - Category A: ${dozenA} dozen`,
        });
      }

      // Add Category B socks to warehouse
      if (dozenB > 0 && fgB) {
        await applyMovement(tx, {
          type: "PRODUCTION",
          qty: dozenB * 12,
          productId,
          warehouseId: fgB.id,
          userId: g.uid,
          referenceType: "PRODUCTION_LOG",
          referenceId: plog.id,
          note: `Machine #${machine.machineNo} (${shiftType}) - Category B: ${dozenB} dozen`,
        });
      }

      // Deduct consumed raw yarn if material selected
      if (materialId && yarnUsedKg > 0 && yarnWh) {
        await applyMovement(tx, {
          type: "PRODUCTION",
          qty: yarnUsedKg,
          materialId,
          warehouseId: yarnWh.id,
          userId: g.uid,
          referenceType: "PRODUCTION_LOG",
          referenceId: plog.id,
          note: `Yarn consumed for Machine #${machine.machineNo} run (${totalDozen} dz)`,
        });
      }
    }

    await audit(tx, {
      userId: g.uid,
      action: "production.create",
      entity: "ProductionLog",
      entityId: plog.id,
      newValue: plog,
    });

    return plog;
  });

  return Response.json({ ok: true, log: result }, { status: 201 });
}
