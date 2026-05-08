import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireClient, requireWriteAccess } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound, badRequest } from "../lib/errors.js";

const r = Router();

interface TemplateItem { key: string; label: string }
interface RunItem extends TemplateItem { done: boolean; doneAt?: number; doneBy?: string; note?: string }

const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

r.use(requireAuth, requireClient);

/** GET /checklists/templates — listar plantillas disponibles */
r.get("/templates", async (_req, res, next) => {
  try {
    const rows = await db.select().from(schema.checklistTemplates);
    res.json(rows);
  } catch (e) { next(e); }
});

/** GET /checklists?period=YYYY-MM — checklists del cliente para un período */
r.get("/", async (req, res, next) => {
  try {
    const period = String(req.query.period ?? "");
    if (!periodRe.test(period)) throw badRequest("invalid_period");
    const rows = await db
      .select()
      .from(schema.checklistRuns)
      .where(and(eq(schema.checklistRuns.clientId, req.auth!.clientId!), eq(schema.checklistRuns.period, period)));
    res.json(rows);
  } catch (e) { next(e); }
});

/** POST /checklists — abrir un checklist a partir de una plantilla */
r.post(
  "/",
  requireWriteAccess,
  validate(z.object({ templateId: z.string().uuid(), period: z.string().regex(periodRe) })),
  async (req, res, next) => {
    try {
      const body = req.body as { templateId: string; period: string };
      const [tpl] = await db
        .select()
        .from(schema.checklistTemplates)
        .where(eq(schema.checklistTemplates.id, body.templateId))
        .limit(1);
      if (!tpl) throw notFound("template_not_found");

      const items: RunItem[] = (tpl.items as TemplateItem[]).map((i) => ({
        ...i,
        done: false,
      }));

      const [created] = await db
        .insert(schema.checklistRuns)
        .values({
          clientId: req.auth!.clientId!,
          templateId: tpl.id,
          period: body.period,
          status: "pending",
          items,
        })
        .returning();
      await audit(req, { action: "create", entity: "checklist_run", entityId: created!.id });
      res.status(201).json(created);
    } catch (e) { next(e); }
  },
);

/** PATCH /checklists/:id/items/:key — marcar/desmarcar item */
r.patch(
  "/:id/items/:key",
  requireWriteAccess,
  validate(z.object({ done: z.boolean(), note: z.string().max(500).optional() })),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const key = String(req.params.key);
      const body = req.body as { done: boolean; note?: string };

      const [run] = await db
        .select()
        .from(schema.checklistRuns)
        .where(and(eq(schema.checklistRuns.id, id), eq(schema.checklistRuns.clientId, req.auth!.clientId!)))
        .limit(1);
      if (!run) throw notFound();

      const items = (run.items as RunItem[]).map((it) =>
        it.key === key
          ? {
              ...it,
              done: body.done,
              doneAt: body.done ? Date.now() : undefined,
              doneBy: body.done ? req.auth!.userId : undefined,
              note: body.note,
            }
          : it,
      );
      const allDone = items.every((it) => it.done);
      const someDone = items.some((it) => it.done);
      const status = allDone ? "done" : someDone ? "in_progress" : "pending";

      const [updated] = await db
        .update(schema.checklistRuns)
        .set({ items, status, updatedAt: new Date() })
        .where(eq(schema.checklistRuns.id, id))
        .returning();
      await audit(req, { action: "toggle_item", entity: "checklist_run", entityId: id, meta: { key, done: body.done } });
      res.json(updated);
    } catch (e) { next(e); }
  },
);

export default r;
