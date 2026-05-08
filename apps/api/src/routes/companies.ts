import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound } from "../lib/errors.js";

const r = Router();

const Body = z.object({
  name: z.string().min(2).max(200),
  cct: z.string().max(20).optional(),
  activityCode: z.string().max(20).optional(),
});

r.use(requireAuth, requireClient);

r.get("/", async (req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.clientId, req.auth!.clientId!));
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

r.post("/", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const [created] = await db
      .insert(schema.companies)
      .values({ ...(req.body as object), clientId: req.auth!.clientId! })
      .returning();
    await audit(req, { action: "create", entity: "company", entityId: created!.id });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", requireWriteAccess, validate(Body), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [updated] = await db
      .update(schema.companies)
      .set(req.body as object)
      .where(and(eq(schema.companies.id, id), eq(schema.companies.clientId, req.auth!.clientId!)))
      .returning();
    if (!updated) throw notFound();
    await audit(req, { action: "update", entity: "company", entityId: id });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

r.delete("/:id", requireWriteAccess, async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const result = await db
      .delete(schema.companies)
      .where(and(eq(schema.companies.id, id), eq(schema.companies.clientId, req.auth!.clientId!)));
    await audit(req, { action: "delete", entity: "company", entityId: id });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default r;
