// All visible labels go through t(), so Urdu/Roman Urdu can be added later as ur.ts.
const en: Record<string, string> = {
  dashboard: "Dashboard",
  production: "Production",
  warehouse: "Warehouse",
  products: "Products",
  materials: "Yarn & Materials",
  stock: "Stock",
  signOut: "Sign out",
};
export const t = (k: string) => en[k] ?? k;
