import { z } from "zod";

const fallbackSecret = "dev-only-secret-change-in-production-please-make-it-64-bytes";

const Schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default(""),
  JWT_ACCESS_SECRET: z.string().min(32).default(fallbackSecret),
  JWT_REFRESH_SECRET: z.string().min(32).default(fallbackSecret + "-refresh"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  COOKIE_SECURE: z.string().default("false").transform((v) => v === "true" || v === "1"),
  COOKIE_DOMAIN: z.string().default("localhost"),
  LOG_LEVEL: z.string().default("info"),
});

const result = Schema.safeParse(process.env);

if (!result.success) {
  throw new Error(`Invalid environment configuration: ${JSON.stringify(result.error.flatten().fieldErrors)}`);
}

export const env = result.data;
export const isProd = env.NODE_ENV === "production";
