import { Router } from "express";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { notFound, conflict, forbidden } from "../lib/errors.js";
import { validateCUIT } from "@bohr/core";

const r = Router();

const ClientBody = z.object({
  cuit: z.string().refine(validateCUIT, "invalid_cuit"),
  legalName: z.string().min(2).max(200),
  tradeName: z.string().max(200).optional(),
  taxCategory: z.enum(["responsable_inscripto", "monotributista", "exento", "consumidor_final"]),
  ivaCondition: z.string().max(50).optional(),
  fiscalAddress: z.string().max(300).optional(),
});

r.use(requireAuth);

/** GET /clients — sólo los clientes a los que el usuario tiene acceso. */
r.get("/", async (req, res, next) => {
  try {
    const links = await db
      .select({ clientId: schema.userClients.clientId, role: schema.userClients.role })
      .from(schema.userClients)
      .where(eq(schema.userClients.userId, req.auth!.userId));
    if (!links.length) return res.json([]);
    const ids = links.map((l) => l.clientId);
    const rows = await db
      .select()
      .from(schema.clients)
      .where(inArray(schema.clients.id, ids));
    const map = new Map(links.map((l) => [l.clientId, l.role]));
    res.json(rows.map((c) => ({ ...c, role: map.get(c.id) })));
  } catch (e) {
    next(e);
  }
});

/** GET /clients/:id */
r.get("/:id", async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [link] = await db
      .select()
      .from(schema.userClients)
      .where(
        and(eq(schema.userClients.userId, req.auth!.userId), eq(schema.userClients.clientId, id)),
      )
      .limit(1);
    if (!link) throw forbidden("no_access_to_client");
    const [row] = await db.select().from(schema.clients).where(eq(schema.clients.id, id)).limit(1);
    if (!row) throw notFound();
    res.json({ ...row, role: link.role });
  } catch (e) {
    next(e);
  }
});

/** POST /clients — sólo admin_studio. Crea cliente y vincula al usuario que lo creó. */
r.post("/", requireRole("admin_studio"), validate(ClientBody), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof ClientBody>;
    const exists = await db
      .select({ id: schema.clients.id })
      .from(schema.clients)
      .where(eq(schema.clients.cuit, body.cuit))
      .limit(1);
    if (exists.length) throw conflict("cuit_exists");

    const [created] = await db.insert(schema.clients).values(body).returning();
    await db.insert(schema.userClients).values({
      userId: req.auth!.userId,
      clientId: created!.id,
      role: "admin_studio",
    });
    await audit(req, { action: "create", entity: "client", entityId: created!.id });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

/** PUT /clients/:id */
r.put("/:id", requireRole("admin_studio", "accountant"), validate(ClientBody), async (req, res, next) => {
  try {
    const id = String(req.params.id);
    const [link] = await db
      .select()
      .from(schema.userClients)
      .where(
        and(eq(schema.userClients.userId, req.auth!.userId), eq(schema.userClients.clientId, id)),
      )
      .limit(1);
    if (!link || link.role === "client_readonly") throw forbidden("readonly");

    const [updated] = await db
      .update(schema.clients)
      .set({ ...(req.body as object), updatedAt: new Date() })
      .where(eq(schema.clients.id, id))
      .returning();
    if (!updated) throw notFound();
    await audit(req, { action: "update", entity: "client", entityId: id });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

/** POST /clients/:id/users — vincular usuario a un cliente (solo admin_studio del cliente) */
r.post(
  "/:id/users",
  requireRole("admin_studio"),
  validate(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(["admin_studio", "accountant", "client_readonly"]),
    }),
  ),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const [mine] = await db
        .select()
        .from(schema.userClients)
        .where(
          and(
            eq(schema.userClients.userId, req.auth!.userId),
            eq(schema.userClients.clientId, id),
            eq(schema.userClients.role, "admin_studio"),
          ),
        )
        .limit(1);
      if (!mine) throw forbidden("not_admin_for_client");

      const body = req.body as { userId: string; role: "admin_studio" | "accountant" | "client_readonly" };
      await db
        .insert(schema.userClients)
        .values({ clientId: id, userId: body.userId, role: body.role })
        .onConflictDoNothing();
      await audit(req, { action: "link_user", entity: "client", entityId: id, meta: { userId: body.userId } });
      res.status(204).end();
    } catch (e) {
      next(e);
    }
  },
);

export default r;
