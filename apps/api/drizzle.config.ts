import "dotenv/config";
import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/bohr.db";
const isPg = url.startsWith("postgres");

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: isPg ? "postgresql" : "sqlite",
  dbCredentials: isPg ? { url } : { url: url.replace(/^file:/, "") },
} satisfies Config;
