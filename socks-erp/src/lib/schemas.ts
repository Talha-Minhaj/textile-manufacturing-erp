import { z } from "zod";

const num = z.preprocess(
  (v) => (v === "" || v == null ? undefined : Number(v)),
  z.number().nonnegative().optional()
);
const opt = z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().optional());
const req = (label: string) => z.string().trim().min(1, `${label} is required.`);

/**
 * Product Master Validation Schema.
 * Represents finished apparel goods (e.g. Athletic Crew Socks 10-13 Black).
 */
export const productSchema = z.object({
  code: req("Product code"),
  name: req("Product name"),
  category: req("Category"),
  size: req("Size"),
  color: req("Color"),
  type: opt,
  design: opt,
  composition: opt,
  pairWeightG: num,
  dozenWeightKg: num,
  stdCost: num,
  sellingPrice: num,
  pairsPerCarton: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().positive().optional()
  ),
  isActive: z.boolean().optional(),
});

/**
 * Material Master Validation Schema.
 * Represents raw textile fibers & yarns (e.g. Cotton 30/1, Spandex 70D).
 */
export const materialSchema = z.object({
  code: req("Material code"),
  name: req("Yarn name"),
  yarnType: opt,
  yarnCount: opt,
  composition: opt,
  color: opt,
  unit: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
  reorderLevel: num,
  isActive: z.boolean().optional(),
});

/**
 * Stock Movement Validation Schema.
 * Validates double-entry movement payloads for raw materials and finished goods.
 */
export const movementSchema = z.object({
  kind: z.enum(["material", "product"]),
  itemId: z.coerce.number().int().positive(),
  warehouseId: z.coerce.number().int().positive(),
  toWarehouseId: z.coerce.number().int().positive().optional(),
  type: z.enum([
    "OPENING",
    "STOCK_IN",
    "STOCK_OUT",
    "ADJUST_IN",
    "ADJUST_OUT",
    "RETURN_IN",
    "RETURN_OUT",
    "TRANSFER",
  ]),
  qty: z.coerce.number().positive("Quantity must be greater than zero."),
  note: z.string().trim().optional(),
});

/**
 * AI Query Assistant Request Schema.
 */
export const aiQuerySchema = z.object({
  query: z.string().trim().min(2, "Query must be at least 2 characters long."),
});
