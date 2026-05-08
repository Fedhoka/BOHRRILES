import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";

const r = Router();

r.get("/", requireAuth, async (req, res, next) => {
  try {
    const links = await db
      .select({
        clientId: schema.userClients.clientId,
        role: schema.userClients.role,
        legalName: schema.clients.legalName,
        cuit: schema.clients.cuit,
      })
      .from(schema.userClients)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.userClients.clientId))
      .where(eq(schema.userClients.userId, req.auth!.userId));

    res.json({
      user: { id: req.auth!.userId, email: req.auth!.email, role: req.auth!.role },
      clients: links,
    });
  } catch (e) {
    next(e);
  }
});

export default r;
