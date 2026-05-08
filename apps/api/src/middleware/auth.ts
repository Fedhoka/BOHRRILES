import type { Request, RequestHandler } from "express";
import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { verifyAccessToken, type Role } from "../services/tokens.js";
import { unauthorized, forbidden } from "../lib/errors.js";

export interface AuthContext {
  userId: string;
  email: string;
  role: Role;
  /** clientId del header X-Client-Id; presente sólo en endpoints multi-tenant. */
  clientId?: string;
  /** rol específico del usuario sobre ese cliente (puede diferir del rol global). */
  clientRole?: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

const extractToken = (req: Request): string | null => {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice("Bearer ".length);
  return null;
};

/**
 * Valida JWT de acceso. Adjunta req.auth con userId/email/role.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw unauthorized("missing_token");
    const claims = await verifyAccessToken(token);
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, claims.sub)).limit(1);
    if (!user || !user.active) throw unauthorized("user_inactive");
    req.auth = { userId: user.id, email: user.email, role: user.role };
    next();
  } catch (e) {
    next(e instanceof Error ? e : unauthorized());
  }
};

/**
 * Restringe a roles permitidos.
 */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden("role_not_allowed"));
    next();
  };

/**
 * Aísla por cliente: lee X-Client-Id, valida que el usuario tenga acceso,
 * y carga req.auth.clientId / clientRole. CUALQUIER endpoint que toque datos
 * de cliente DEBE usar este middleware.
 */
export const requireClient: RequestHandler = async (req, _res, next) => {
  try {
    if (!req.auth) throw unauthorized();
    const clientId = String(req.headers["x-client-id"] ?? "");
    if (!clientId) throw unauthorized("missing_client_header");
    const [link] = await db
      .select()
      .from(schema.userClients)
      .where(
        and(
          eq(schema.userClients.userId, req.auth.userId),
          eq(schema.userClients.clientId, clientId),
        ),
      )
      .limit(1);
    if (!link) throw forbidden("no_access_to_client");
    req.auth.clientId = clientId;
    req.auth.clientRole = link.role;
    next();
  } catch (e) {
    next(e instanceof Error ? e : forbidden());
  }
};

/**
 * Asegura que el rol efectivo sobre el cliente actual permita escribir.
 * client_readonly NO puede escribir.
 */
export const requireWriteAccess: RequestHandler = (req, _res, next) => {
  if (!req.auth?.clientRole) return next(forbidden("client_role_missing"));
  if (req.auth.clientRole === "client_readonly") return next(forbidden("readonly"));
  next();
};
