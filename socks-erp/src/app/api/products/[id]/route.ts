import { crud } from "@/lib/crud";
import { productSchema } from "@/lib/schemas";
const c = crud({ model: "product", module: "products", schema: productSchema, orderBy: { code: "asc" } });
export const PUT = (req: Request, { params }: { params: { id: string } }) => c.update(req, Number(params.id));
