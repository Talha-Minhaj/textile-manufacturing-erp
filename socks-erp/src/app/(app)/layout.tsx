import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { allowedModules } from "@/lib/permissions";
import { Sidebar, BottomNav } from "@/components/Nav";
import { t } from "@/i18n";

export const dynamic = "force-dynamic";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const mods = await allowedModules(s);
  const order = ["production", "warehouse", "products", "materials", "stock"];
  const items = [
    { href: "/dashboard", label: t("dashboard") },
    ...order.filter((m) => mods.includes(m)).map((m) => ({ href: `/${m}`, label: t(m) })),
  ];
  return (
    <div className="shell">
      <Sidebar items={items} name={s.name} role={s.role} />
      <main className="main">{children}</main>
      <BottomNav items={items} />
    </div>
  );
}
