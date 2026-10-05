import { z } from "zod";

/**
 * Validated Environment Configuration Schema for ThreadCraft ERP.
 * Enforces security invariants, valid ports, and database connection strings.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters for HMAC-SHA256"),
  SEED_ADMIN_PASSWORD: z.string().default("AdminSecurePassword123!"),
  ALLOW_NEGATIVE_STOCK: z.preprocess((v) => v === "true" || v === true, z.boolean().default(false)),
  COOKIE_INSECURE: z.preprocess((v) => v === "1" || v === "true", z.boolean().default(false)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.preprocess((v) => (v ? Number(v) : 3000), z.number().int().positive().default(3000)),
  AI_PROVIDER: z.enum(["heuristic", "openai", "gemini"]).default("heuristic"),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AI_SERVICE_URL: z.string().default("http://localhost:8000"),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Parsed and sanitized configuration instance.
 */
export const config: EnvConfig = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL || "file:./dev.db",
  AUTH_SECRET: process.env.AUTH_SECRET || "threadcraft_dev_jwt_secret_key_minimum_32_characters_for_local_demo",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || "AdminSecurePassword123!",
  ALLOW_NEGATIVE_STOCK: process.env.ALLOW_NEGATIVE_STOCK || "false",
  COOKIE_INSECURE: process.env.COOKIE_INSECURE || "1",
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT,
  AI_PROVIDER: process.env.AI_PROVIDER || "heuristic",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || "http://localhost:8000",
});
