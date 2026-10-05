import { crud } from "@/lib/crud";
import { materialSchema } from "@/lib/schemas";
export const dynamic = "force-dynamic";
const c = crud({ model: "material", module: "materials", schema: materialSchema, orderBy: { code: "asc" } });
export const GET = () => c.list();
export const POST = (req: Request) => c.create(req);
