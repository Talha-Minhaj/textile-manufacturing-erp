"use client";
import { useState } from "react";

export default function Login() {
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr("");
    const f = new FormData(e.currentTarget);
    const r = await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ username: f.get("username"), password: f.get("password") }) });
    if (r.ok) location.href = "/dashboard"; else { setErr((await r.json()).error); setBusy(false); }
  }
  return (
    <form className="login panel" onSubmit={submit}>
      <h1 style={{ letterSpacing: "-0.03em" }}>ThreadCraft <span style={{ color: "var(--teal)" }}>ERP</span></h1>
      <p className="empty" style={{ margin: "0.25rem 0 1rem" }}>Enterprise Apparel Manufacturing &amp; Operations</p>
      <label>Username</label><input name="username" autoComplete="username" autoFocus required />
      <div style={{ height: 12 }} />
      <label>Password</label><input name="password" type="password" autoComplete="current-password" required />
      {err && <div className="err">{err}</div>}
      <div style={{ height: 12 }} />
      <button className="btn" disabled={busy} style={{ width: "100%" }}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
