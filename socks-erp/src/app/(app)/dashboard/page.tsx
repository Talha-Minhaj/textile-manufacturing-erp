import Link from "next/link";
import { db } from "@/lib/db";
import { AIOperationsAssistant } from "@/components/AIOperationsAssistant";
export const dynamic = "force-dynamic";

const n = (v: unknown) => Number(v ?? 0);
const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 1 });

export default async function Dashboard() {
  const [materials, balances, recent, productCount, machines, recentLogs, warehouses] = await Promise.all([
    db.material.findMany({ where: { isActive: true } }),
    db.stockBalance.findMany({ include: { warehouse: true } }),
    db.stockMovement.findMany({
      orderBy: { id: "desc" },
      take: 6,
      include: { material: true, product: true, warehouse: true },
    }),
    db.product.count({ where: { isActive: true } }),
    db.machine.findMany({ orderBy: { machineNo: "asc" } }),
    db.productionLog.findMany({
      orderBy: { id: "desc" },
      take: 5,
      include: { machine: true, product: true },
    }),
    db.warehouse.findMany(),
  ]);

  const yarnKg = balances.filter((b) => b.materialId).reduce((a, b) => a + n(b.qty), 0);
  const pairs = balances.filter((b) => b.productId).reduce((a, b) => a + n(b.qty), 0);

  const fgA = warehouses.find((w) => w.name.includes("Category A"));
  const fgB = warehouses.find((w) => w.name.includes("Category B"));

  const pairsA = fgA
    ? balances.filter((b) => b.warehouseId === fgA.id && b.productId).reduce((a, b) => a + n(b.qty), 0)
    : 0;
  const pairsB = fgB
    ? balances.filter((b) => b.warehouseId === fgB.id && b.productId).reduce((a, b) => a + n(b.qty), 0)
    : 0;

  const totalDozen = recentLogs.reduce((acc, l) => acc + n(l.totalDozen), 0);
  const runningMachines = machines.filter((m) => m.status === "RUNNING").length;

  const low = materials.filter((m) => {
    const have = balances.filter((b) => b.materialId === m.id).reduce((a, b) => a + n(b.qty), 0);
    return n(m.reorderLevel) > 0 && have <= n(m.reorderLevel);
  });

  return (
    <>
      <div className="flex-between">
        <div>
          <h1 style={{ letterSpacing: "-0.03em" }}>Operations Command Hub</h1>
          <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Real-time telemetry for knitting lines 1–5, output grading, yarn inventory, and warehouse storage
          </p>
        </div>
        <div className="bar" style={{ margin: 0 }}>
          <Link href="/production" className="btn sm">
            🏭 Production Floor
          </Link>
          <Link href="/warehouse" className="btn ghost sm">
            📦 Warehouses
          </Link>
        </div>
      </div>

      {/* Forward Deployed AI Assistant Interactive Card */}
      <AIOperationsAssistant />

      <div className="grid">
        <div className="stat">
          <small>Active Knitting Machines</small>
          <b>{runningMachines} / {machines.length}</b>
          <small>Machines 1–5 operational</small>
        </div>
        <div className="stat">
          <small>Category A (Fresh Grade)</small>
          <b style={{ color: "#15803d" }}>{fmt(pairsA / 12)} dz</b>
          <small>{fmt(pairsA)} pairs in Export Bay</small>
        </div>
        <div className="stat warn">
          <small>Category B (Seconds)</small>
          <b style={{ color: "#b45309" }}>{fmt(pairsB / 12)} dz</b>
          <small>{fmt(pairsB)} pairs in Seconds Bay</small>
        </div>
        <div className="stat">
          <small>Raw Yarn in Storage</small>
          <b>{fmt(yarnKg)} kg</b>
          <small>{low.length > 0 ? `${low.length} yarn items low` : "Sufficient inventory"}</small>
        </div>
      </div>

      {low.length > 0 && (
        <div className="panel" style={{ borderLeft: "4px solid var(--red)" }}>
          <h2>Low Stock Warnings</h2>
          {low.map((m) => (
            <div key={m.id} style={{ margin: "0.3rem 0" }}>
              <span className="tag out">Low</span> {m.code} · {m.name} (reorder at {fmt(n(m.reorderLevel))} {m.unit})
            </div>
          ))}
        </div>
      )}

      {/* Machine Status Live Row */}
      <div className="panel">
        <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
          <h2>Knitting Machine Status (1 to 5)</h2>
          <Link href="/production" style={{ fontSize: "0.85rem", color: "var(--teal)", fontWeight: "600" }}>
            View Full Production Floor →
          </Link>
        </div>
        <div className="machine-grid">
          {machines.map((m) => {
            const isRunning = m.status === "RUNNING";
            const isIdle = m.status === "IDLE";
            return (
              <div key={m.id} className="machine-card" style={{ padding: "0.85rem" }}>
                <div className="machine-head">
                  <div className="machine-num" style={{ fontSize: "1rem" }}>
                    <span className={`dot ${isRunning ? "running" : isIdle ? "idle" : "maint"}`} />
                    Machine #{m.machineNo}
                  </div>
                  <span className={`tag ${isRunning ? "running" : isIdle ? "idle" : "maintenance"}`}>
                    {m.status}
                  </span>
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                  Needles: {m.needleCount}N · {m.cylinderSize}
                </div>
                <div style={{ fontSize: "0.82rem", marginTop: "0.25rem" }}>
                  Operator: <b>{m.operator || "—"}</b>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Production Runs */}
      <div className="panel tablewrap">
        <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
          <h2>Recent Shift Production Output (10–12h Shifts)</h2>
          <Link href="/production" style={{ fontSize: "0.85rem", color: "var(--teal)", fontWeight: "600" }}>
            + Log New Shift
          </Link>
        </div>
        {recentLogs.length === 0 ? (
          <div className="empty">No production runs recorded yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Machine</th>
                <th>Shift</th>
                <th>Product</th>
                <th>Category A (Dozen)</th>
                <th>Category B (Dozen)</th>
                <th>Total (Dozen)</th>
                <th>Efficiency</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                  <td><b>Machine #{log.machine.machineNo}</b></td>
                  <td><span className="tag shift">{log.shiftType.replace("_", " ")} ({n(log.shiftHours)}h)</span></td>
                  <td>{log.product.code} · {log.product.name}</td>
                  <td><span className="tag grade-a">{fmt(n(log.dozenA))} dz</span></td>
                  <td><span className="tag grade-b">{fmt(n(log.dozenB))} dz</span></td>
                  <td><b>{fmt(n(log.totalDozen))} dz</b></td>
                  <td><b>{n(log.efficiency)}%</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Stock Movements */}
      <div className="panel tablewrap">
        <h2>Recent Inventory Movements</h2>
        {recent.length === 0 ? (
          <div className="empty">No stock movements yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Item</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Warehouse</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((m) => (
                <tr key={m.id}>
                  <td>{m.createdAt.toLocaleString("en-GB")}</td>
                  <td>{m.material?.name ?? m.product?.name}</td>
                  <td><span className="tag">{m.type}</span></td>
                  <td>
                    <b>{m.direction > 0 ? "+" : "−"}{fmt(n(m.qty))}</b>
                    {m.productId && <small style={{ color: "var(--muted)", marginLeft: "4px" }}>({fmt(n(m.qty) / 12)} dz)</small>}
                  </td>
                  <td>{m.warehouse.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
