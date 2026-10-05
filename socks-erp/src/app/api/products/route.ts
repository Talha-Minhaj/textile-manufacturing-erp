import { crud } from "@/lib/crud";
import { productSchema } from "@/lib/schemas";
export const dynamic = "force-dynamic";
const c = crud({ model: "product", module: "products", schema: productSchema, orderBy: { code: "asc" } });
export const GET = () => c.list();
export const POST = (req: Request) => c.create(req);
