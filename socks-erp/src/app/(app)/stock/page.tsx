import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import StockClient from "./StockClient";
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await getSession(); if (!s || !(await can(s, "stock", "view"))) redirect("/dashboard");
  return <StockClient canCreate={await can(s, "stock", "create")} />;
}
