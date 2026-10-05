import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import ProductionClient from "./ProductionClient";

export const dynamic = "force-dynamic";

export default async function ProductionPage() {
  const s = await getSession();
  if (!s || !(await can(s, "production", "view"))) redirect("/dashboard");
  return (
    <ProductionClient
      canCreate={await can(s, "production", "create")}
      canEdit={await can(s, "production", "edit")}
    />
  );
}
