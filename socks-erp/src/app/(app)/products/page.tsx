import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/permissions";
import ResourcePage, { Field } from "@/components/ResourcePage";

const CATEGORIES = ["Crew", "Ankle", "Low Cut", "Sports", "Terry", "Rough Terry", "Fancy", "Kids", "Men's", "Women's"];
const fields: Field[] = [
  { key: "code", label: "Product code", required: true }, { key: "name", label: "Product name", required: true },
  { key: "category", label: "Category", type: "select", options: CATEGORIES, required: true },
  { key: "type", label: "Type" }, { key: "size", label: "Size (e.g. 10-13, or custom)", required: true },
  { key: "color", label: "Color", required: true }, { key: "design", label: "Design" },
  { key: "composition", label: "Yarn composition" },
  { key: "pairWeightG", label: "Pair weight (g)", type: "number" }, { key: "dozenWeightKg", label: "Dozen weight (kg)", type: "number" },
  { key: "pairsPerCarton", label: "Pairs per carton", type: "number" },
  { key: "stdCost", label: "Standard cost (PKR)", type: "number" }, { key: "sellingPrice", label: "Selling price", type: "number" },
];
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await getSession(); if (!s || !(await can(s, "products", "view"))) redirect("/dashboard");
  return <ResourcePage title="Products" endpoint="/api/products" fields={fields}
    columns={["code", "name", "category", "size", "color", "design", "sellingPrice"]}
    canCreate={await can(s, "products", "create")} canEdit={await can(s, "products", "edit")}
    empty="No products yet. Add your first product." />;
}
