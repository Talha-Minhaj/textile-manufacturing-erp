"use client";

import { useEffect, useState } from "react";

type Warehouse = {
  id: number;
  name: string;
  type: string;
  location: string | null;
  manager: string | null;
  capacity: number | string | null;
  balances?: any[];
};

type Balance = {
  id: number;
  itemKey: string;
  materialId?: number | null;
  productId?: number | null;
  warehouseId: number;
  qty: number | string;
  kind: "material" | "product";
  dozen?: number | null;
  item?: {
    id: number;
    code: string;
    name: string;
    category?: string;
    color?: string;
    size?: string;
    unit?: string;
    reorderLevel?: number | string;
  };
  warehouse: Warehouse;
};

const num = (v: any, dec = 1) =>
  Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: dec });

export default function WarehouseClient({
  canCreate,
  canEdit,
}: {
  canCreate: boolean;
  canEdit: boolean;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tabWarehouse, setTabWarehouse] = useState<string>("ALL");
  const [tabType, setTabType] = useState<"ALL" | "material" | "product">("ALL");
  const [search, setSearch] = useState("");
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showNewWhModal, setShowNewWhModal] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  // Transfer form
  const [transferForm, setTransferForm] = useState({
    fromWarehouseId: "",
    toWarehouseId: "",
    kind: "material" as "material" | "product",
    itemId: "",
    qty: "",
    note: "",
  });

  // New warehouse form
  const [whForm, setWhForm] = useState({
    name: "",
    type: "FINISHED",
    location: "",
    manager: "",
    capacity: "50000",
  });

  const loadData = async () => {
    try {
      const res = await fetch("/api/warehouse");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.warehouses?.length >= 2 && !transferForm.fromWarehouseId) {
          setTransferForm((prev) => ({
            ...prev,
            fromWarehouseId: String(json.warehouses[0].id),
            toWarehouseId: String(json.warehouses[1].id),
          }));
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    try {
      const payload: any = {
        action: "TRANSFER",
        fromWarehouseId: transferForm.fromWarehouseId,
        toWarehouseId: transferForm.toWarehouseId,
        qty: transferForm.qty,
        note: transferForm.note,
      };

      if (transferForm.kind === "material") {
        payload.materialId = transferForm.itemId;
      } else {
        payload.productId = transferForm.itemId;
      }

      const res = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErr(resJson.error || "Transfer failed.");
      } else {
        setMsg("Transfer completed successfully.");
        setShowTransferModal(false);
        setTransferForm((prev) => ({ ...prev, qty: "", note: "" }));
        loadData();
      }
    } catch (e: any) {
      setErr(e.message || "Network error");
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(whForm),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setErr(resJson.error || "Failed to create warehouse.");
      } else {
        setMsg("New warehouse location added.");
        setShowNewWhModal(false);
        setWhForm({ name: "", type: "FINISHED", location: "", manager: "", capacity: "50000" });
        loadData();
      }
    } catch (e: any) {
      setErr(e.message || "Network error");
    }
  };

  if (loading || !data) return <div className="empty">Loading Warehouse & Inventory data…</div>;

  const { warehouses, balances, materials, products, recentMovements, stats } = data;

  // Filtered inventory balances
  const filteredBalances = balances.filter((b: Balance) => {
    if (tabWarehouse !== "ALL" && String(b.warehouseId) !== tabWarehouse) return false;
    if (tabType !== "ALL" && b.kind !== tabType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const code = b.item?.code?.toLowerCase() || "";
      const name = b.item?.name?.toLowerCase() || "";
      const whName = b.warehouse?.name?.toLowerCase() || "";
      if (!code.includes(q) && !name.includes(q) && !whName.includes(q)) return false;
    }
    return true;
  });

  const transferItems = transferForm.kind === "material" ? materials : products;

  return (
    <>
      <div className="subhead">
        <div>
          <h1>Warehouse Management</h1>
          <p style={{ margin: "0.2rem 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
            Storage Bays · Category A & B Warehouses · Raw Yarn Inventory · Inter-Warehouse Transfers
          </p>
        </div>
        <div className="bar" style={{ margin: 0 }}>
          {canEdit && (
            <button className="btn ghost" onClick={() => setShowTransferModal(true)}>
              ⇄ Transfer Stock
            </button>
          )}
          {canCreate && (
            <button className="btn" onClick={() => setShowNewWhModal(true)}>
              + New Warehouse Zone
            </button>
          )}
        </div>
      </div>

      {msg && <div className="panel ok" style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>{msg}</div>}
      {err && <div className="panel err" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>{err}</div>}

      {/* Warehouse Metrics Overview */}
      <div className="grid">
        <div className="stat">
          <small>Raw Yarn in Storage</small>
          <b>{num(stats.totalYarnKg)} kg</b>
          <small>Across raw material stores</small>
        </div>
        <div className="stat">
          <small>Finished Goods - Category A</small>
          <b style={{ color: "#15803d" }}>{num(stats.dozenA)} dz</b>
          <small>{num(stats.dozenA * 12, 0)} pairs (Export ready)</small>
        </div>
        <div className="stat warn">
          <small>Finished Goods - Category B</small>
          <b style={{ color: "#b45309" }}>{num(stats.dozenB)} dz</b>
          <small>{num(stats.dozenB * 12, 0)} pairs (Seconds bay)</small>
        </div>
        <div className="stat">
          <small>Total Storage Facilities</small>
          <b>{stats.warehouseCount} Zones</b>
          <small>Yarn, Buffer, Category A & B</small>
        </div>
      </div>

      {/* Warehouse Location Cards */}
      <div className="panel">
        <div className="flex-between" style={{ marginBottom: "0.75rem" }}>
          <h2>Warehouse Facilities & Storage Zones</h2>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
            Current stock distribution
          </span>
        </div>

        <div className="machine-grid">
          {warehouses.map((w: Warehouse) => {
            const whBals = balances.filter((b: Balance) => b.warehouseId === w.id);
            const isRaw = w.type === "RAW";
            const totalQty = whBals.reduce((acc: number, b: Balance) => acc + Number(b.qty || 0), 0);
            const cap = Number(w.capacity || 10000);
            const util = Math.min(100, Math.round((totalQty / cap) * 100));

            return (
              <div
                key={w.id}
                className="machine-card"
                style={{
                  borderTop: `4px solid ${
                    w.name.includes("Category A")
                      ? "#15803d"
                      : w.name.includes("Category B")
                      ? "#b45309"
                      : "var(--teal)"
                  }`,
                }}
              >
                <div className="machine-head">
                  <span style={{ fontWeight: "700", fontSize: "1.05rem" }}>{w.name}</span>
                  <span className={`tag ${isRaw ? "shift" : "grade-a"}`}>{w.type}</span>
                </div>

                <div style={{ fontSize: "0.82rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
                  📍 {w.location || "Main Factory Building"} · Manager: <b>{w.manager || "Unassigned"}</b>
                </div>

                <div style={{ marginTop: "0.5rem", fontSize: "0.88rem" }}>
                  {isRaw ? (
                    <div>
                      Stock: <b>{num(totalQty)} kg</b>
                    </div>
                  ) : (
                    <div>
                      Stock: <b>{num(totalQty / 12)} dozen</b>{" "}
                      <small style={{ color: "var(--muted)" }}>({num(totalQty, 0)} pairs)</small>
                    </div>
                  )}
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                    Unique SKUs: <b>{whBals.length}</b>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem" }}>
                  <div className="flex-between" style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                    <span>Capacity Utilization</span>
                    <span>{util}%</span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${util > 80 ? "fill-gold" : "fill-teal"}`}
                      style={{ width: `${util}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Warehouse Inventory Ledger */}
      <div className="panel tablewrap">
        <div className="flex-between" style={{ marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2>Detailed Warehouse Stock Ledger</h2>
          <div className="bar" style={{ margin: 0 }}>
            <input
              placeholder="Search code, product, color, warehouse…"
              style={{ width: "240px", minHeight: "34px", padding: "0.3rem 0.6rem" }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={{ width: "auto", minHeight: "34px", padding: "0.3rem 0.6rem" }}
              value={tabWarehouse}
              onChange={(e) => setTabWarehouse(e.target.value)}
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w: Warehouse) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <select
              style={{ width: "auto", minHeight: "34px", padding: "0.3rem 0.6rem" }}
              value={tabType}
              onChange={(e) => setTabType(e.target.value as any)}
            >
              <option value="ALL">All Item Types</option>
              <option value="material">Yarn (kg)</option>
              <option value="product">Finished Socks</option>
            </select>
          </div>
        </div>

        {filteredBalances.length === 0 ? (
          <div className="empty">No inventory items matching this filter.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Warehouse Zone</th>
                <th>Type</th>
                <th>Item Code</th>
                <th>Item Description</th>
                <th>Details (Size / Yarn Count)</th>
                <th>Stock Quantity</th>
                <th>In Dozens</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBalances.map((b: Balance) => {
                const isProd = b.kind === "product";
                const isCatA = b.warehouse.name.includes("Category A");
                const isCatB = b.warehouse.name.includes("Category B");
                return (
                  <tr key={b.id}>
                    <td>
                      <b>{b.warehouse.name}</b>
                    </td>
                    <td>
                      <span className={`tag ${isProd ? "grade-a" : "shift"}`}>
                        {isProd ? "Socks" : "Yarn"}
                      </span>
                    </td>
                    <td>
                      <code>{b.item?.code || "—"}</code>
                    </td>
                    <td>{b.item?.name || "—"}</td>
                    <td style={{ color: "var(--muted)" }}>
                      {isProd
                        ? `Size: ${b.item?.size || "—"} · Color: ${b.item?.color || "—"}`
                        : `Count: ${(b.item as any)?.yarnCount || "—"} · ${(b.item as any)?.composition || "—"}`}
                    </td>
                    <td>
                      <b>
                        {num(b.qty)} {isProd ? "pairs" : "kg"}
                      </b>
                    </td>
                    <td>
                      {isProd ? (
                        <span
                          className={`tag ${
                            isCatA ? "grade-a" : isCatB ? "grade-b" : ""
                          }`}
                        >
                          {num(b.dozen)} dz
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span className="tag" style={{ background: "#ecfdf5", color: "#065f46" }}>
                        In Stock
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Inter-Warehouse & Stock Movements */}
      <div className="panel tablewrap">
        <h2>Recent Warehouse Activity & Dispatches</h2>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Warehouse</th>
              <th>Item</th>
              <th>Movement Type</th>
              <th>Qty</th>
              <th>Reference / Note</th>
              <th>Recorded By</th>
            </tr>
          </thead>
          <tbody>
            {recentMovements.slice(0, 10).map((m: any) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString("en-GB")}</td>
                <td>
                  <b>{m.warehouse?.name}</b>
                </td>
                <td>{m.material?.name ?? m.product?.name ?? "—"}</td>
                <td>
                  <span className="tag">{m.type}</span>
                </td>
                <td>
                  <b>
                    {m.direction > 0 ? "+" : "−"}
                    {num(m.qty)} {m.materialId ? "kg" : "pairs"}
                  </b>
                  {m.productId && (
                    <small style={{ color: "var(--muted)", marginLeft: "4px" }}>
                      ({num(Number(m.qty) / 12)} dz)
                    </small>
                  )}
                </td>
                <td style={{ color: "var(--muted)" }}>{m.note || m.referenceType || "—"}</td>
                <td>{m.createdBy?.name || "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inter-Warehouse Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <h2>Inter-Warehouse Stock Transfer</h2>
              <button
                className="btn ghost sm"
                onClick={() => setShowTransferModal(false)}
                style={{ cursor: "pointer", border: "none", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferSubmit}>
              <div className="form">
                <div>
                  <label>From Warehouse (Source)</label>
                  <select
                    required
                    value={transferForm.fromWarehouseId}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, fromWarehouseId: e.target.value })
                    }
                  >
                    <option value="">Select source warehouse…</option>
                    {warehouses.map((w: Warehouse) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>To Warehouse (Destination)</label>
                  <select
                    required
                    value={transferForm.toWarehouseId}
                    onChange={(e) =>
                      setTransferForm({ ...transferForm, toWarehouseId: e.target.value })
                    }
                  >
                    <option value="">Select destination warehouse…</option>
                    {warehouses.map((w: Warehouse) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Item Type</label>
                  <select
                    value={transferForm.kind}
                    onChange={(e) =>
                      setTransferForm({
                        ...transferForm,
                        kind: e.target.value as any,
                        itemId: "",
                      })
                    }
                  >
                    <option value="material">Yarn / Raw Material (kg)</option>
                    <option value="product">Finished Socks (pairs)</option>
                  </select>
                </div>

                <div>
                  <label>Select Item</label>
                  <select
                    required
                    value={transferForm.itemId}
                    onChange={(e) => setTransferForm({ ...transferForm, itemId: e.target.value })}
                  >
                    <option value="">Select item…</option>
                    {transferItems.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.code} · {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>
                    Transfer Quantity ({transferForm.kind === "material" ? "kg" : "pairs"})
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder={transferForm.kind === "material" ? "e.g. 50 kg" : "e.g. 144 pairs (12 dz)"}
                    value={transferForm.qty}
                    onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })}
                  />
                  {transferForm.kind === "product" && Number(transferForm.qty) > 0 && (
                    <small style={{ color: "var(--teal)" }}>
                      Equivalent to {num(Number(transferForm.qty) / 12)} dozen
                    </small>
                  )}
                </div>

                <div>
                  <label>Transfer Note / Reason</label>
                  <input
                    placeholder="e.g. Moved from Central Yarn Store to Knitting Floor creels"
                    value={transferForm.note}
                    onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="bar" style={{ justifyContent: "flex-end", marginTop: "1.25rem" }}>
                <button type="button" className="btn ghost" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Warehouse Zone Modal */}
      {showNewWhModal && (
        <div className="modal-overlay" onClick={() => setShowNewWhModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="flex-between" style={{ marginBottom: "1rem" }}>
              <h2>Add New Warehouse Location</h2>
              <button
                className="btn ghost sm"
                onClick={() => setShowNewWhModal(false)}
                style={{ cursor: "pointer", border: "none", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse}>
              <div className="form">
                <div>
                  <label>Warehouse Name</label>
                  <input
                    required
                    placeholder="e.g. Warehouse 4 - Boarding & Pairing"
                    value={whForm.name}
                    onChange={(e) => setWhForm({ ...whForm, name: e.target.value })}
                  />
                </div>

                <div>
                  <label>Category / Storage Type</label>
                  <select
                    value={whForm.type}
                    onChange={(e) => setWhForm({ ...whForm, type: e.target.value })}
                  >
                    <option value="FINISHED">FINISHED (Finished Goods A or B)</option>
                    <option value="RAW">RAW (Yarn & Raw Materials)</option>
                    <option value="PACKAGING">PACKAGING (Cartons & Polybags)</option>
                    <option value="SECONDS">SECONDS (B-Grade / Defects)</option>
                  </select>
                </div>

                <div>
                  <label>Physical Location / Bay</label>
                  <input
                    placeholder="e.g. Building B - Level 2"
                    value={whForm.location}
                    onChange={(e) => setWhForm({ ...whForm, location: e.target.value })}
                  />
                </div>

                <div>
                  <label>Supervisor / Manager Name</label>
                  <input
                    placeholder="e.g. Tariq Mehmood"
                    value={whForm.manager}
                    onChange={(e) => setWhForm({ ...whForm, manager: e.target.value })}
                  />
                </div>

                <div>
                  <label>Capacity Estimate</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={whForm.capacity}
                    onChange={(e) => setWhForm({ ...whForm, capacity: e.target.value })}
                  />
                </div>
              </div>

              <div className="bar" style={{ justifyContent: "flex-end", marginTop: "1.25rem" }}>
                <button type="button" className="btn ghost" onClick={() => setShowNewWhModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Create Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
