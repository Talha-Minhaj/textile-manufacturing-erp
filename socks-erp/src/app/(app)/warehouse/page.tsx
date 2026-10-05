import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import WarehouseClient from "./WarehouseClient";

export const dynamic = "force-dynamic";

export default async function WarehousePage() {
  const s = await getSession();
  if (!s || !(await can(s, "warehouse", "view"))) redirect("/dashboard");
  return (
    <WarehouseClient
      canCreate={await can(s, "warehouse", "create")}
      canEdit={await can(s, "warehouse", "edit")}
    />
  );
}
