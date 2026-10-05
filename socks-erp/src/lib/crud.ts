import { z } from "zod";
import { db } from "./db";
import { audit } from "./audit";
import { guard, Module } from "./permissions";

// Small helper so Products and Materials share one tested pattern.
type Cfg = { model: "product" | "material"; module: Module; schema: z.ZodTypeAny; orderBy: object };

const delegate = (m: Cfg["model"]) => db[m] as any;

export function crud(cfg: Cfg) {
  return {
    async list() {
      const s = await guard(cfg.module, "view");
      if (s instanceof Response) return s;
      return Response.json(await delegate(cfg.model).findMany({ orderBy: cfg.orderBy }));
    },
    async create(req: Request) {
      const s = await guard(cfg.module, "create");
      if (s instanceof Response) return s;
      const parsed = cfg.schema.safeParse(await req.json());
      if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
      try {
        const row = await delegate(cfg.model).create({ data: parsed.data });
        await audit(db, { userId: s.uid, action: `${cfg.model}.create`, entity: cfg.model, entityId: row.id, newValue: row });
        return Response.json(row, { status: 201 });
      } catch (e: any) {
        if (e.code === "P2002") return Response.json({ error: "That code already exists." }, { status: 409 });
        throw e;
      }
    },
    async update(req: Request, id: number) {
      const s = await guard(cfg.module, "edit");
      if (s instanceof Response) return s;
      const parsed = (cfg.schema as z.ZodObject<any>).partial().safeParse(await req.json());
      if (!parsed.success) return Response.json({ error: parsed.error.issues[0].message }, { status: 400 });
      const old = await delegate(cfg.model).findUnique({ where: { id } });
      if (!old) return Response.json({ error: "Not found." }, { status: 404 });
      try {
        const row = await delegate(cfg.model).update({ where: { id }, data: parsed.data });
        await audit(db, { userId: s.uid, action: `${cfg.model}.update`, entity: cfg.model, entityId: id, oldValue: old, newValue: row });
        return Response.json(row);
      } catch (e: any) {
        if (e.code === "P2002") return Response.json({ error: "That code already exists." }, { status: 409 });
        throw e;
      }
    },
  };
}
