import { Router } from "express";
import { z } from "zod";
import { eq, and, lte, desc } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { requireAuth } from "../middleware/auth.js";
import { lookupCctScale, CCT_SCALES } from "@bohr/core";

const r = Router();
const periodRe = /^\d{4}-(0[1-9]|1[0-2])$/;

r.use(requireAuth);

/** GET /cct-scales/static — escalas hardcoded del paquete core (referencia/demo) */
r.get("/static", (_req, res) => {
  res.json(CCT_SCALES);
});

/** GET /cct-scales?cct=&category=&period= — busca escala vigente al período. */
r.get("/", async (req, res, next) => {
  try {
    const Q = z.object({
      cct: z.string(),
      category: z.string(),
      period: z.string().regex(periodRe),
    }).parse(req.query);

    // Primero buscar en BD (escalas custom subidas por el estudio)
    const [db1] = await db
      .select()
      .from(schema.cctScales)
      .where(and(
        eq(schema.cctScales.cct, Q.cct),
        eq(schema.cctScales.category, Q.category),
        lte(schema.cctScales.period, Q.period),
      ))
      .orderBy(desc(schema.cctScales.period))
      .limit(1);
    if (db1) return res.json({ source: "db", ...db1 });

    // Fallback: tablas del paquete core
    const fromCore = lookupCctScale(Q.cct as never, Q.category, Q.period);
    if (fromCore) return res.json({ source: "core", ...fromCore });

    res.status(404).json({ error: "scale_not_found" });
  } catch (e) { next(e); }
});

export default r;
