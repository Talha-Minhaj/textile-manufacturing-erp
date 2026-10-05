"use client";
import { useEffect, useState } from "react";

const TYPES = [
  ["OPENING", "Opening stock"], ["STOCK_IN", "Stock in"], ["STOCK_OUT", "Stock out"], ["ADJUST_IN", "Adjustment (add)"],
  ["ADJUST_OUT", "Adjustment (remove)"], ["RETURN_IN", "Return in"], ["RETURN_OUT", "Return out"], ["TRANSFER", "Transfer"],
];
const num = (v: any) => Number(v ?? 0).toLocaleString("en-US", { maximumFractionDigits: 3 });

export default function StockClient({ canCreate }: { canCreate: boolean }) {
  const [d, setD] = useState<any>(null); const [tab, setTab] = useState<"material" | "product">("material");
  const [f, setF] = useState<any>({ type: "STOCK_IN" }); const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const load = async () => { const r = await fetch("/api/stock"); if (r.ok) setD(await r.json()); };
  useEffect(() => { load(); }, []);
  if (!d) return <div className="empty">Loading…</div>;

  const items: any[] = tab === "material" ? d.materials : d.products;
  const whs = d.warehouses.filter((w: any) => w.type === (tab === "material" ? "RAW" : "FINISHED"));
  const bals = d.balances.filter((b: any) => (tab === "material" ? b.materialId : b.productId));
  const name = (b: any) => { const it = items.find((i) => i.id === (b.materialId ?? b.productId)); return it ? `${it.code} · ${it.name}` : "—"; };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg("");
    const r = await fetch("/api/stock", { method: "POST", body: JSON.stringify({ ...f, kind: tab }) });
    if (r.ok) { setMsg("Stock saved."); setF({ type: f.type }); load(); } else setErr((await r.json()).error);
  }
  return (
    <>
      <h1>Stock</h1>
      <div className="bar">
        <button className={`btn ${tab === "material" ? "" : "ghost"}`} onClick={() => { setTab("material"); setF({ type: "STOCK_IN" }); }}>Yarn (kg)</button>
        <button className={`btn ${tab === "product" ? "" : "ghost"}`} onClick={() => { setTab("product"); setF({ type: "STOCK_IN" }); }}>Finished socks (pairs)</button>
      </div>
      {canCreate && (
        <form className="panel" onSubmit={submit}>
          <h2>Record stock movement</h2>
          <div className="form">
            <div><label>Type</label><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label>{tab === "material" ? "Yarn" : "Product"}</label><select required value={f.itemId ?? ""} onChange={(e) => setF({ ...f, itemId: e.target.value })}>
              <option value="">Select…</option>{items.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}</select></div>
            <div><label>{f.type === "TRANSFER" ? "From warehouse" : "Warehouse"}</label><select required value={f.warehouseId ?? ""} onChange={(e) => setF({ ...f, warehouseId: e.target.value })}>
              <option value="">Select…</option>{whs.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
            {f.type === "TRANSFER" && <div><label>To warehouse</label><select required value={f.toWarehouseId ?? ""} onChange={(e) => setF({ ...f, toWarehouseId: e.target.value })}>
              <option value="">Select…</option>{whs.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>}
            <div><label>Quantity ({tab === "material" ? "kg" : "pairs"})</label><input type="number" step="any" min="0" required value={f.qty ?? ""} onChange={(e) => setF({ ...f, qty: e.target.value })} /></div>
            <div><label>Note</label><input value={f.note ?? ""} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
          </div>
          {err && <div className="err">{err}</div>}{msg && <div className="ok">{msg}</div>}
          <div className="bar"><button className="btn">Save movement</button></div>
        </form>
      )}
      <div className="panel tablewrap"><h2>Current stock</h2>
        {bals.length === 0 ? <div className="empty">No stock recorded yet. Use “Opening stock” above to enter what you have today.</div> :
          <table><thead><tr><th>Item</th><th>Warehouse</th><th>Qty</th>{tab === "product" && <th>Dozen</th>}</tr></thead><tbody>
            {bals.map((b: any) => <tr key={b.id}><td>{name(b)}</td><td>{b.warehouse.name}</td><td>{num(b.qty)}</td>{tab === "product" && <td>{num(Number(b.qty) / 12)}</td>}</tr>)}
          </tbody></table>}
      </div>
      <div className="panel tablewrap"><h2>Movement history</h2>
        <table><thead><tr><th>When</th><th>Item</th><th>Type</th><th>Qty</th><th>Warehouse</th><th>By</th><th>Note</th></tr></thead><tbody>
          {d.movements.filter((m: any) => (tab === "material" ? m.materialId : m.productId)).map((m: any) => (
            <tr key={m.id}><td>{new Date(m.createdAt).toLocaleString("en-GB")}</td><td>{m.material?.name ?? m.product?.name}</td><td>{m.type}</td>
              <td>{m.direction > 0 ? "+" : "−"}{num(m.qty)}</td><td>{m.warehouse.name}</td><td>{m.createdBy.name}</td><td>{m.note}</td></tr>))}
        </tbody></table>
      </div>
    </>
  );
}
