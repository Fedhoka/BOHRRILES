import type { RequestHandler } from "express";
import { ZodSchema } from "zod";

export const validate =
  <T>(schema: ZodSchema<T>, source: "body" | "query" | "params" = "body"): RequestHandler =>
  (req, _res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) return next(parsed.error);
    (req as unknown as Record<string, unknown>)[source] = parsed.data;
    next();
  };
