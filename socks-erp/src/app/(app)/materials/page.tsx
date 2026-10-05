import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import ResourcePage, { Field } from "@/components/ResourcePage";

const fields: Field[] = [
  { key: "code", label: "Material ID", required: true }, { key: "name", label: "Yarn name", required: true },
  { key: "yarnType", label: "Yarn type" }, { key: "yarnCount", label: "Yarn count" },
  { key: "composition", label: "Composition" }, { key: "color", label: "Color" },
  { key: "unit", label: "Unit (default kg)" }, { key: "reorderLevel", label: "Low-stock level", type: "number" },
];
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await getSession(); if (!s || !(await can(s, "materials", "view"))) redirect("/dashboard");
  return <ResourcePage title="Yarn & Materials" endpoint="/api/materials" fields={fields}
    columns={["code", "name", "yarnType", "yarnCount", "composition", "color", "unit", "reorderLevel"]}
    canCreate={await can(s, "materials", "create")} canEdit={await can(s, "materials", "edit")}
    empty="No yarn yet. Add your first material." />;
}
