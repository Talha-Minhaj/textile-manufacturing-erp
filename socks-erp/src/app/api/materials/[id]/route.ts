import { crud } from "@/lib/crud";
import { materialSchema } from "@/lib/schemas";
const c = crud({ model: "material", module: "materials", schema: materialSchema, orderBy: { code: "asc" } });
export const PUT = (req: Request, { params }: { params: { id: string } }) => c.update(req, Number(params.id));
