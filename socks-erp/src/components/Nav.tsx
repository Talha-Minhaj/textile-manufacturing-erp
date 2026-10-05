"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };
export function Sidebar({ items, name, role }: { items: NavItem[]; name: string; role: string }) {
  const p = usePathname();
  async function out() { await fetch("/api/auth/logout", { method: "POST" }); location.href = "/login"; }
  return (
    <aside className="side">
      <div className="brand">ThreadCraft<span>ERP</span></div>
      <nav className="nav">{items.map((i) => <Link key={i.href} href={i.href} className={p.startsWith(i.href) ? "on" : ""}>{i.label}</Link>)}</nav>
      <div className="who">{name} · {role}<br /><button onClick={out}>Sign out</button></div>
    </aside>
  );
}
export function BottomNav({ items }: { items: NavItem[] }) {
  const p = usePathname();
  return <nav className="bottom">{items.map((i) => <Link key={i.href} href={i.href} className={p.startsWith(i.href) ? "on" : ""}>{i.label}</Link>)}</nav>;
}
