import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { validate } from "../middleware/validate.js";
import {
  authenticate,
  issueTokens,
  rotateRefresh,
  revokeRefresh,
  REFRESH_COOKIE,
  refreshCookieOptions,
} from "../services/auth.js";
import { unauthorized } from "../lib/errors.js";

const r = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "rate_limited" },
});

const LoginBody = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(200),
});

r.post("/login", loginLimiter, validate(LoginBody), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof LoginBody>;
    const user = await authenticate(email, password);
    const { access, refresh } = await issueTokens(user.id, user.email, user.role);

    // Lista de clientes accesibles
    const links = await db
      .select({
        clientId: schema.userClients.clientId,
        role: schema.userClients.role,
        legalName: schema.clients.legalName,
        cuit: schema.clients.cuit,
      })
      .from(schema.userClients)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.userClients.clientId))
      .where(eq(schema.userClients.userId, user.id));

    res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions());
    res.json({
      accessToken: access,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      clients: links,
    });
  } catch (e) {
    next(e);
  }
});

r.post("/refresh", async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (!presented) throw unauthorized("missing_refresh");
    const { access, refresh } = await rotateRefresh(presented);
    res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions());
    res.json({ accessToken: access });
  } catch (e) {
    next(e);
  }
});

r.post("/logout", async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (presented) await revokeRefresh(presented);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: 0 });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default r;
