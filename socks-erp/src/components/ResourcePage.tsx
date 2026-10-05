"use client";
import { useEffect, useMemo, useState } from "react";

export type Field = { key: string; label: string; type?: "text" | "number" | "select"; options?: string[]; required?: boolean };
type Row = Record<string, any>;

export default function ResourcePage({ title, endpoint, fields, columns, canCreate, canEdit, empty }: {
  title: string; endpoint: string; fields: Field[]; columns: string[]; canCreate: boolean; canEdit: boolean; empty: string;
}) {
  const [rows, setRows] = useState<Row[]>([]); const [q, setQ] = useState("");
  const [form, setForm] = useState<Row | null>(null); const [err, setErr] = useState(""); const [loading, setLoading] = useState(true);
  const load = async () => { const r = await fetch(endpoint); if (r.ok) setRows(await r.json()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? rows.filter((r) => Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(s))) : rows;
  }, [rows, q]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const { id, ...data } = form!;
    const body: Row = {};
    fields.forEach((f) => { if (data[f.key] !== undefined && data[f.key] !== null) body[f.key] = data[f.key]; });
    const r = await fetch(id ? `${endpoint}/${id}` : endpoint, { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
    if (r.ok) { setForm(null); load(); } else setErr((await r.json()).error);
  }
  const label = (k: string) => fields.find((f) => f.key === k)?.label ?? k;

  return (
    <>
      <h1>{title}</h1>
      <div className="bar">
        <input style={{ maxWidth: 320 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {canCreate && <button className="btn" onClick={() => { setErr(""); setForm({}); }}>Add new</button>}
      </div>
      {form && (
        <form className="panel" onSubmit={save}>
          <h2>{form.id ? "Edit" : "Add"} {title.toLowerCase()}</h2>
          <div className="form">
            {fields.map((f) => (
              <div key={f.key}><label>{f.label}{f.required && " *"}</label>
                {f.type === "select" ? (
                  <select value={form[f.key] ?? ""} required={f.required} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={f.type === "number" ? "number" : "text"} step="any" min={f.type === "number" ? 0 : undefined}
                    required={f.required} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          {err && <div className="err">{err}</div>}
          <div className="bar"><button className="btn">Save</button><button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}
      <div className="panel tablewrap">
        {loading ? <div className="empty">Loading…</div> : shown.length === 0 ? <div className="empty">{q ? "Nothing matches your search." : empty}</div> : (
          <table><thead><tr>{columns.map((c) => <th key={c}>{label(c)}</th>)}{canEdit && <th />}</tr></thead><tbody>
            {shown.map((r) => (<tr key={r.id}>{columns.map((c) => <td key={c}>{r[c] ?? ""}</td>)}
              {canEdit && <td><button className="btn ghost sm" onClick={() => { setErr(""); setForm({ ...r }); }}>Edit</button></td>}</tr>))}
          </tbody></table>
        )}
      </div>
    </>
  );
}
