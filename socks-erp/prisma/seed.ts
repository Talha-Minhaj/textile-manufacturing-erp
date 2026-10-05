import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();

const ALL = { v: true, c: true, e: true, d: true }, VIEW = { v: true, c: false, e: false, d: false };
const RW = { v: true, c: true, e: true, d: false };

// role -> module -> rights
const MATRIX: Record<string, Record<string, typeof ALL>> = {
  Admin: { production: ALL, warehouse: ALL, products: ALL, materials: ALL, stock: ALL },
  "Production Manager": { production: ALL, warehouse: RW, products: VIEW, materials: VIEW, stock: RW },
  "Store Manager": { production: VIEW, warehouse: ALL, products: VIEW, materials: RW, stock: RW },
  "Sales/User": { production: VIEW, warehouse: VIEW, products: VIEW },
  Accountant: { production: VIEW, warehouse: VIEW, products: VIEW, materials: VIEW, stock: VIEW },
};

async function main() {
  for (const [role, mods] of Object.entries(MATRIX)) {
    const r = await db.role.upsert({ where: { name: role }, update: {}, create: { name: role } });
    for (const [module, p] of Object.entries(mods))
      await db.permission.upsert({
        where: { roleId_module: { roleId: r.id, module } },
        update: { canView: p.v, canCreate: p.c, canEdit: p.e, canDelete: p.d },
        create: { roleId: r.id, module, canView: p.v, canCreate: p.c, canEdit: p.e, canDelete: p.d },
      });
  }

  const pw = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD ?? "AdminSecurePassword123!", 12);
  const admin = await db.role.findUniqueOrThrow({ where: { name: "Admin" } });
  const adminUser = await db.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { name: "Administrator", username: "admin", passwordHash: pw, roleId: admin.id },
  });

  // Warehouses
  const yarnStore = await db.warehouse.upsert({
    where: { name: "Yarn Store" },
    update: { type: "RAW", location: "Building A - Hall 1", manager: "Kamran Akram", capacity: 50000 },
    create: { name: "Yarn Store", type: "RAW", location: "Building A - Hall 1", manager: "Kamran Akram", capacity: 50000 },
  });

  const knittingBuffer = await db.warehouse.upsert({
    where: { name: "Knitting Floor Buffer" },
    update: { type: "RAW", location: "Building B - Knitting Floor", manager: "Tariq Mehmood", capacity: 15000 },
    create: { name: "Knitting Floor Buffer", type: "RAW", location: "Building B - Knitting Floor", manager: "Tariq Mehmood", capacity: 15000 },
  });

  const fgA = await db.warehouse.upsert({
    where: { name: "Finished Goods - Category A" },
    update: { type: "FINISHED", location: "Building C - Export Bay", manager: "Farhan Saeed", capacity: 100000 },
    create: { name: "Finished Goods - Category A", type: "FINISHED", location: "Building C - Export Bay", manager: "Farhan Saeed", capacity: 100000 },
  });

  const fgB = await db.warehouse.upsert({
    where: { name: "Finished Goods - Category B" },
    update: { type: "FINISHED", location: "Building C - Local Seconds Bay", manager: "Bilal Ahmed", capacity: 30000 },
    create: { name: "Finished Goods - Category B", type: "FINISHED", location: "Building C - Local Seconds Bay", manager: "Bilal Ahmed", capacity: 30000 },
  });

  const pkgStore = await db.warehouse.upsert({
    where: { name: "Packaging & Accessories" },
    update: { type: "RAW", location: "Building D - Packing Hall", manager: "Noman Shah", capacity: 25000 },
    create: { name: "Packaging & Accessories", type: "RAW", location: "Building D - Packing Hall", manager: "Noman Shah", capacity: 25000 },
  });

  // Knitting Machines 1 to 5
  const machines = [
    { machineNo: 1, name: "Machine #1 (Crew & Ankle)", model: "Lonati Donna 400", cylinderSize: "3.75 inch", needleCount: 144, rpm: 280, status: "RUNNING", operator: "Tariq Mehmood", targetPerHour: 3.5 },
    { machineNo: 2, name: "Machine #2 (High Needle Fine)", model: "Lonati Donna 400", cylinderSize: "3.75 inch", needleCount: 168, rpm: 290, status: "RUNNING", operator: "Rashid Ali", targetPerHour: 3.8 },
    { machineNo: 3, name: "Machine #3 (Sports & Terry)", model: "Sangiacomo HT Terry", cylinderSize: "4.00 inch", needleCount: 144, rpm: 260, status: "RUNNING", operator: "Muhammad Asif", targetPerHour: 3.2 },
    { machineNo: 4, name: "Machine #4 (Dress & Rib)", model: "Lonati Goal 200N", cylinderSize: "3.50 inch", needleCount: 200, rpm: 310, status: "RUNNING", operator: "Imran Qureshi", targetPerHour: 4.0 },
    { machineNo: 5, name: "Machine #5 (Heavy Cushion)", model: "Busi Giovanni Terry", cylinderSize: "4.00 inch", needleCount: 132, rpm: 240, status: "IDLE", operator: "Zahid Hussain", targetPerHour: 3.0 },
  ];

  for (const m of machines) {
    await db.machine.upsert({
      where: { machineNo: m.machineNo },
      update: { ...m },
      create: { ...m },
    });
  }

  // Sizes & Colors
  for (const n of ["10-13", "9-11", "6-8", "4-6"]) await db.productSize.upsert({ where: { name: n }, update: {}, create: { name: n } });
  for (const n of ["Black", "White", "Navy", "Grey"]) await db.productColor.upsert({ where: { name: n }, update: {}, create: { name: n } });

  // Products
  const cats = ["Crew", "Ankle", "Low Cut", "Sports", "Terry", "Rough Terry"];
  for (const c of cats) for (const size of ["10-13", "9-11", "6-8", "4-6"]) {
    const code = `${c.replace(/\s/g, "").slice(0, 4).toUpperCase()}-${size}-BLK`;
    await db.product.upsert({
      where: { code },
      update: { dozenWeightKg: 0.52, pairWeightG: 43.3 },
      create: { code, name: `${c} Socks`, category: c, size, color: "Black", pairsPerCarton: 144, dozenWeightKg: 0.52, pairWeightG: 43.3 },
    });
  }

  // Materials
  const mats = [
    ["YRN-C30-BLK", "Cotton 30/1 Black", "Cotton", "30/1", "100% Cotton", "Black"],
    ["YRN-C30-WHT", "Cotton 30/1 White", "Cotton", "30/1", "100% Cotton", "White"],
    ["YRN-PC20-NVY", "Poly-Cotton 20/1 Navy", "Poly-Cotton", "20/1", "65/35 PC", "Navy"],
    ["YRN-LYC-BLK", "Lycra Covered Yarn", "Spandex", "70D", "Nylon/Lycra", "Black"],
  ];
  for (const [code, name, yarnType, yarnCount, composition, color] of mats)
    await db.material.upsert({ where: { code }, update: {}, create: { code, name, yarnType, yarnCount, composition, color, reorderLevel: 100 } });

  // Opening yarn stock if empty
  if ((await db.stockMovement.count()) === 0) {
    for (const m of await db.material.findMany()) {
      await db.$transaction([
        db.stockBalance.create({ data: { itemKey: `M:${m.id}`, materialId: m.id, warehouseId: yarnStore.id, qty: 500 } }),
        db.stockMovement.create({ data: { type: "OPENING", direction: 1, qty: 500, materialId: m.id, warehouseId: yarnStore.id, note: "Initial yarn inventory", createdById: adminUser.id } }),
      ]);
    }
  }

  // Seed sample production runs for Machines 1 to 5 (10-12 hours shifts, Category A & B)
  if ((await db.productionLog.count()) === 0) {
    const sampleProducts = await db.product.findMany({ take: 5 });
    const sampleYarn = await db.material.findFirst({ where: { code: "YRN-C30-BLK" } });
    const machineList = await db.machine.findMany({ orderBy: { machineNo: "asc" } });

    const seedRuns = [
      { mIdx: 0, pIdx: 0, shift: "DAY_12H", hours: 12, op: "Tariq Mehmood", a: 39, b: 3, yarn: 21.8, note: "Smooth 12-hour day run, high stitch density." },
      { mIdx: 1, pIdx: 1, shift: "NIGHT_12H", hours: 12, op: "Rashid Ali", a: 42, b: 2, yarn: 22.9, note: "Night shift 12h run on fine 168N." },
      { mIdx: 2, pIdx: 2, shift: "DAY_10H", hours: 10, op: "Muhammad Asif", a: 30, b: 2, yarn: 16.6, note: "Sports terry cushion run (10 hours)." },
      { mIdx: 3, pIdx: 3, shift: "DAY_12H", hours: 12, op: "Imran Qureshi", a: 45, b: 1, yarn: 23.5, note: "Exceptional 98% efficiency on 200N dress socks." },
      { mIdx: 4, pIdx: 4, shift: "NIGHT_10H", hours: 10, op: "Zahid Hussain", a: 26, b: 4, yarn: 15.6, note: "Heavy cushion run, needle replaced mid-shift." },
    ];

    for (const r of seedRuns) {
      const mach = machineList[r.mIdx] ?? machineList[0];
      const prod = sampleProducts[r.pIdx] ?? sampleProducts[0];
      const totalDozen = r.a + r.b;
      const totalPairs = totalDozen * 12;
      const target = Number(mach.targetPerHour) * r.hours;
      const eff = Math.min(100, Math.round((totalDozen / target) * 100));
      const defect = Number(((r.b / totalDozen) * 100).toFixed(1));

      const plog = await db.productionLog.create({
        data: {
          machineId: mach.id,
          productId: prod.id,
          materialId: sampleYarn?.id,
          shiftType: r.shift,
          shiftHours: r.hours,
          operator: r.op,
          dozenA: r.a,
          dozenB: r.b,
          totalDozen,
          totalPairs,
          yarnUsedKg: r.yarn,
          efficiency: eff,
          defectRate: defect,
          status: "COMPLETED",
          notes: r.note,
          createdById: adminUser.id,
        },
      });

      // Also record corresponding finished goods stock balances in FG Category A & FG Category B
      const pairsA = r.a * 12;
      const pairsB = r.b * 12;

      // Add Category A to FG A
      await db.stockBalance.upsert({
        where: { itemKey_warehouseId: { itemKey: `P:${prod.id}`, warehouseId: fgA.id } },
        update: { qty: { increment: pairsA } },
        create: { itemKey: `P:${prod.id}`, productId: prod.id, warehouseId: fgA.id, qty: pairsA },
      });
      await db.stockMovement.create({
        data: {
          type: "PRODUCTION",
          direction: 1,
          qty: pairsA,
          productId: prod.id,
          warehouseId: fgA.id,
          referenceType: "PRODUCTION_LOG",
          referenceId: plog.id,
          note: `Machine #${mach.machineNo} (${r.shift}) - Grade A: ${r.a} dozen`,
          createdById: adminUser.id,
        },
      });

      // Add Category B to FG B
      if (pairsB > 0) {
        await db.stockBalance.upsert({
          where: { itemKey_warehouseId: { itemKey: `P:${prod.id}`, warehouseId: fgB.id } },
          update: { qty: { increment: pairsB } },
          create: { itemKey: `P:${prod.id}`, productId: prod.id, warehouseId: fgB.id, qty: pairsB },
        });
        await db.stockMovement.create({
          data: {
            type: "PRODUCTION",
            direction: 1,
            qty: pairsB,
            productId: prod.id,
            warehouseId: fgB.id,
            referenceType: "PRODUCTION_LOG",
            referenceId: plog.id,
            note: `Machine #${mach.machineNo} (${r.shift}) - Grade B: ${r.b} dozen`,
            createdById: adminUser.id,
          },
        });
      }
    }
  }

  console.log("ThreadCraft ERP Seed complete. Default Login: admin /", process.env.SEED_ADMIN_PASSWORD ?? "AdminSecurePassword123!");
}

main().finally(() => db.$disconnect());
