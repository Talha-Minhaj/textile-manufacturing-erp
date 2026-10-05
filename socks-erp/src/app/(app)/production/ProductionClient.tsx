"use client";

import { useEffect, useState } from "react";

type Machine = {
  id: number;
  machineNo: number;
  name: string;
  model: string;
  cylinderSize: string;
  needleCount: number;
  rpm: number;
  status: string;
  operator: string | null;
  targetPerHour: number | string;
  notes: string | null;
  productionLogs?: any[];
};

type ProductionLog = {
  id: number;
  machineId: number;
  productId: number;
  materialId?: number | null;
  shiftType: string;
  shiftHours: number | string;
  operator: string;
  date: string;
  dozenA: number | string;
  dozenB: number | string;
  totalDozen: number | string;
  totalPairs: number | string;
  yarnUsedKg: number | string;
  efficiency: number | string;
  defectRate: number | string;
  status: string;
  notes?: string | null;
  machine: Machine;
  product: { id: number; code: string; name: string };
  material?: { id: number; code: string; name: string } | null;
};

const num = (v: any, dec = 1) =>
  Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: dec });

export default function ProductionClient({
  canCreate,
  canEdit,
}: {
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterMachine, setFilterMachine] = useState<string>("ALL");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // New production log form state
  const [form, setForm] = useState({
    machineId: "",
    productId: "",
    materialId: "",
    shiftType: "DAY_12H",
    shiftHours: 12,
    operator: "",
    dozenA: "",
    dozenB: "",
    yarnUsedKg: "",
    notes: "",
    syncToStock: true,
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/production");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        // Pre-fill first machine & product if available
        if (json.machines?.length > 0 && !form.machineId) {
          const m1 = json.machines[0];
          setForm((prev) => ({
            ...prev,
            machineId: String(m1.id),
            operator: m1.operator || "Operator 1",
          }));
        }
        if (json.products?.length > 0 && !form.productId) {
          setForm((prev) => ({ ...prev, productId: String(json.products[0].id) }));
        }
        if (json.materials?.length > 0 && !form.materialId) {
          setForm((prev) => ({ ...prev, materialId: String(json.materials[0].id) }));
        }
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMachineChange = (mId: string) => {
    const sel = data?.machines?.find((m: Machine) => String(m.id) === mId);
    setForm((prev) => ({
      ...prev,
      machineId: mId,
      operator: sel?.operator || prev.operator,
    }));
  };

  const handleShiftChange = (shiftType: string) => {
    const hours = shiftType.includes("10H") ? 10 : 12;
    setForm((prev) => ({
      ...prev,
      shiftType,
      shiftHours: hours,
    }));
  };

  const handleStatusUpdate = async (machineId: number, newStatus: string) => {
    if (!canEdit) return;
    try {
      const res = await fetch("/api/production/machine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: machineId, status: newStatus }),
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      // ignore
    }
  };

  const submitProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErr(resJson.error || "Failed to record production.");
      } else {
        setMsg("Production shift log saved and stock synchronized!");
        setShowModal(false);
        // Reset output numbers
        setForm((prev) => ({ ...prev, dozenA: "", dozenB: "", yarnUsedKg: "", notes: "" }));
        loadData();
      }
    } catch (e: any) {
      setErr(e.message || "Network error");
    }
  };

  if (loading || !data) return <div className="empty">Loading Production Floor data…</div>;

  const { machines, logs, products, materials, stats } = data;

  // Selected machine object for preview calculation
  const curMachine = machines.find((m: Machine) => String(m.id) === String(form.machineId));
  const targetDozen = (Number(curMachine?.targetPerHour || 3.5) * Number(form.shiftHours || 12)).toFixed(1);
  const curA = Number(form.dozenA || 0);
  const curB = Number(form.dozenB || 0);
  const curTotal = curA + curB;
  const curEff = curTotal > 0 ? Math.min(100, Math.round((curTotal / Number(targetDozen || 1)) * 100)) : 0;
  const curDefect = curTotal > 0 ? ((curB / curTotal) * 100).toFixed(1) : "0.0";

  // Filtered logs
  const filteredLogs = logs.filter((l: ProductionLog) => {
    if (filterMachine === "ALL") return true;
    return String(l.machine?.machineNo) === filterMachine;
  });

  return (
    <>
      <div className="subhead">
        <div>
          <h1>Production Floor</h1>
          <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Real-time tracking of Machines 1–5 · 10–12 Hour Shifts · Category A & B Sorting
          </p>
        </div>
        {canCreate && (
          <button className="btn" onClick={() => setShowModal(true)}>
            + Log Production Shift
          </button>
        )}
      </div>

      {msg && <div className="panel ok" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>{msg}</div>}
      {err && <div className="panel err" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>{err}</div>}

      {/* Production KPIs */}
      <div className="grid">
        <div className="stat">
          <small>Total Finished</small>
          <b>{num(stats.totalDozen)} dz</b>
          <small>{num(Number(stats.totalDozen) * 12, 0)} pairs</small>
        </div>
        <div className="stat">
          <small>Category A (Fresh Grade)</small>
          <b style={{ color: "#15803d" }}>{num(stats.totalA)} dz</b>
          <small>First-rate export quality</small>
        </div>
        <div className="stat warn">
          <small>Category B (Seconds / Minor)</small>
          <b style={{ color: "#b45309" }}>{num(stats.totalB)} dz</b>
          <small>Defect rate: {stats.avgDefect}%</small>
        </div>
        <div className="stat">
          <small>Knitting Efficiency</small>
          <b>{stats.avgEfficiency}%</b>
          <small>{stats.runningCount} of 5 machines running</small>
        </div>
      </div>

      {/* Machines 1 to 5 Status Overview */}
      <div className="panel">
        <div className="flex-between" style={{ marginBottom: "0.5rem" }}>
          <h2>Knitting Machines (1 to 5)</h2>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            5 Active Cylindrical Machines
          </span>
        </div>
        <div className="machine-grid">
          {machines.map((m: Machine) => {
            const isRunning = m.status === "RUNNING";
            const isIdle = m.status === "IDLE";
            return (
              <div key={m.id} className="machine-card">
                <div className="machine-head">
                  <div className="machine-num">
                    <span
                      className={`dot ${
                        isRunning ? "running" : isIdle ? "idle" : "maint"
                      }`}
                    />
                    Machine #{m.machineNo}
                  </div>
                  {canEdit ? (
                    <select
                      value={m.status}
                      onChange={(e) => handleStatusUpdate(m.id, e.target.value)}
                      style={{
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.75rem",
                        width: "auto",
                        minHeight: "28px",
                      }}
                    >
                      <option value="RUNNING">RUNNING</option>
                      <option value="IDLE">IDLE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                      <option value="STOPPED">STOPPED</option>
                    </select>
                  ) : (
                    <span className={`tag ${m.status.toLowerCase()}`}>{m.status}</span>
                  )}
                </div>

                <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--ink)" }}>
                  {m.name}
                </div>
                <div className="machine-meta">
                  <span>Model: {m.model}</span>
                  <span>Cylinder: {m.cylinderSize}</span>
                  <span>Needles: {m.needleCount}N</span>
                  <span>Speed: {m.rpm} RPM</span>
                </div>

                <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--muted)" }}>
                  Operator: <b>{m.operator || "Not Assigned"}</b>
                </div>

                <div style={{ marginTop: "0.6rem" }}>
                  <div className="flex-between" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    <span>Target Output</span>
                    <span>{num(m.targetPerHour)} dz / hr</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${isRunning ? "fill-teal" : isIdle ? "fill-gold" : "fill-red"}`}
                      style={{ width: isRunning ? "88%" : isIdle ? "30%" : "10%" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Runs History */}
      <div className="panel tablewrap">
        <div className="flex-between" style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2>10–12h Shift Production Logs</h2>
          <div className="bar" style={{ margin: 0 }}>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Filter Machine:</span>
            {["ALL", "1", "2", "3", "4", "5"].map((no) => (
              <button
                key={no}
                className={`btn sm ${filterMachine === no ? "" : "ghost"}`}
                onClick={() => setFilterMachine(no)}
              >
                {no === "ALL" ? "All Machines" : `M#${no}`}
              </button>
            ))}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="empty">No production records found for this filter.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Machine</th>
                <th>Shift (Hours)</th>
                <th>Operator</th>
                <th>Product</th>
                <th>Category A (Dozen)</th>
                <th>Category B (Dozen)</th>
                <th>Total (Dozen / Pairs)</th>
                <th>Yarn Used</th>
                <th>Efficiency</th>
                <th>Quality / Defect</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log: ProductionLog) => (
                <tr key={log.id}>
                  <td>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                  <td>
                    <b>Machine #{log.machine?.machineNo}</b>
                  </td>
                  <td>
                    <span className="tag shift">
                      {log.shiftType.replace("_", " ")} ({num(log.shiftHours, 0)}h)
                    </span>
                  </td>
                  <td>{log.operator}</td>
                  <td>{log.product?.code} · {log.product?.name}</td>
                  <td>
                    <span className="tag grade-a">{num(log.dozenA)} dz</span>
                  </td>
                  <td>
                    <span className="tag grade-b">{num(log.dozenB)} dz</span>
                  </td>
                  <td>
                    <b>{num(log.totalDozen)} dz</b>{" "}
                    <small style={{ color: "var(--muted)" }}>({num(log.totalPairs, 0)} pairs)</small>
                  </td>
                  <td>{num(log.yarnUsedKg)} kg</td>
                  <td>
                    <b>{num(log.efficiency, 0)}%</b>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: "600",
                        color: Number(log.defectRate) > 5 ? "var(--red)" : "var(--teal-d)",
                      }}
                    >
                      {num(log.defectRate)}% defect
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Production Shift Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <h2>Record Production Run (10–12 Hours)</h2>
              <button
                className="btn ghost sm"
                onClick={() => setShowModal(false)}
                style={{ cursor: "pointer", border: "none", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submitProduction}>
              <div className="form">
                <div>
                  <label>Machine (1 to 5)</label>
                  <select
                    required
                    value={form.machineId}
                    onChange={(e) => handleMachineChange(e.target.value)}
                  >
                    {machines.map((m: Machine) => (
                      <option key={m.id} value={m.id}>
                        Machine #{m.machineNo} ({m.needleCount}N · {m.model})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Sock Product</label>
                  <select
                    required
                    value={form.productId}
                    onChange={(e) => setForm({ ...form, productId: e.target.value })}
                  >
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.code} · {p.name} ({p.size})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Shift Duration (10–12 Hours)</label>
                  <select
                    value={form.shiftType}
                    onChange={(e) => handleShiftChange(e.target.value)}
                  >
                    <option value="DAY_12H">Day Shift (12 Hours)</option>
                    <option value="NIGHT_12H">Night Shift (12 Hours)</option>
                    <option value="DAY_10H">Day Shift (10 Hours)</option>
                    <option value="NIGHT_10H">Night Shift (10 Hours)</option>
                  </select>
                </div>

                <div>
                  <label>Machine Operator Name</label>
                  <input
                    required
                    placeholder="Operator name"
                    value={form.operator}
                    onChange={(e) => setForm({ ...form, operator: e.target.value })}
                  />
                </div>

                <div>
                  <label>Category A Output (Dozens)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="e.g. 38"
                    value={form.dozenA}
                    onChange={(e) => setForm({ ...form, dozenA: e.target.value })}
                  />
                  <small style={{ color: "#15803d" }}>Fresh, defect-free first quality socks</small>
                </div>

                <div>
                  <label>Category B Output (Dozens)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={form.dozenB}
                    onChange={(e) => setForm({ ...form, dozenB: e.target.value })}
                  />
                  <small style={{ color: "#b45309" }}>Seconds / minor defects / needle mark</small>
                </div>

                <div>
                  <label>Yarn Consumed (Raw Material)</label>
                  <select
                    value={form.materialId}
                    onChange={(e) => setForm({ ...form, materialId: e.target.value })}
                  >
                    <option value="">None / Handled separately</option>
                    {materials.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.code} · {m.name} ({m.yarnType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Yarn Consumed (kg)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 21.5"
                    value={form.yarnUsedKg}
                    onChange={(e) => setForm({ ...form, yarnUsedKg: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Shift Notes / Needle changes</label>
                  <input
                    placeholder="e.g. Broken needle replaced at 4th hour, tension adjusted"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto", minHeight: "auto" }}
                      checked={form.syncToStock}
                      onChange={(e) => setForm({ ...form, syncToStock: e.target.checked })}
                    />
                    <b>Auto-sync to Warehouse Stock:</b> Automatically add Category A dozens to Export Warehouse, Category B to Seconds Bay, and deduct yarn from store.
                  </label>
                </div>
              </div>

              {/* Real-time calculated summary */}
              {curTotal > 0 && (
                <div
                  style={{
                    background: "var(--paper)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r)",
                    padding: "0.75rem 1rem",
                    margin: "1rem 0",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                    gap: "0.5rem",
                    fontSize: "0.85rem",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--muted)" }}>Total Dozen:</span>
                    <b style={{ display: "block" }}>{curTotal} dz ({curTotal * 12} pairs)</b>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Expected Target:</span>
                    <b style={{ display: "block" }}>{targetDozen} dz</b>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Efficiency:</span>
                    <b style={{ display: "block", color: curEff >= 85 ? "#15803d" : "var(--gold)" }}>
                      {curEff}%
                    </b>
                  </div>
                  <div>
                    <span style={{ color: "var(--muted)" }}>Defect Rate:</span>
                    <b style={{ display: "block", color: Number(curDefect) > 5 ? "var(--red)" : "var(--ink)" }}>
                      {curDefect}%
                    </b>
                  </div>
                </div>
              )}

              <div className="bar" style={{ justifyContent: "flex-end", marginTop: "1.25rem" }}>
                <button type="button" className="btn ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Shift Production
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
