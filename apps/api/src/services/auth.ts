import bcrypt from "bcrypt";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  newJti,
  hashToken,
} from "./tokens.js";
import { env } from "../config.js";
import { unauthorized } from "../lib/errors.js";

const REFRESH_TTL_MS = parseTtl(env.JWT_REFRESH_TTL);

function parseTtl(s: string): number {
  const m = s.match(/^(\d+)([smhd])$/);
  if (!m) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(m[1]);
  const u = m[2];
  const mul = u === "s" ? 1000 : u === "m" ? 60_000 : u === "h" ? 3_600_000 : 86_400_000;
  return n * mul;
}

export async function authenticate(email: string, password: string) {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase()))
    .limit(1);

  // Comparación timing-safe: si no existe el usuario, igual hashear para no filtrar.
  const hash = user?.passwordHash ?? "$2b$12$invalidplaceholderhashstringxxxxxxxxxxxxxxxxxxxxxxx";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !user.active || !ok) throw unauthorized("invalid_credentials");

  return user;
}

export async function issueTokens(userId: string, email: string, role: schema.User["role"]) {
  const access = await signAccessToken({ sub: userId, email, role });
  const jti = newJti();
  const refresh = await signRefreshToken(userId, jti);
  await db.insert(schema.refreshTokens).values({
    userId,
    tokenHash: hashToken(refresh),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return { access, refresh };
}

/**
 * Rotación: la token presentada se revoca y se emite una nueva.
 * Si la token ya fue revocada, todas las del usuario se revocan (reuso).
 */
export async function rotateRefresh(presented: string) {
  let claims;
  try {
    claims = await verifyRefreshToken(presented);
  } catch {
    throw unauthorized("invalid_refresh");
  }

  const tokenHash = hashToken(presented);
  const [stored] = await db
    .select()
    .from(schema.refreshTokens)
    .where(eq(schema.refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!stored) {
    // token desconocido = posible reuso → revocar todas las del usuario
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.userId, claims.sub),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );
    throw unauthorized("refresh_replay");
  }

  if (stored.revokedAt) {
    await db
      .update(schema.refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.refreshTokens.userId, stored.userId),
          isNull(schema.refreshTokens.revokedAt),
        ),
      );
    throw unauthorized("refresh_revoked");
  }

  if (stored.expiresAt.getTime() < Date.now()) throw unauthorized("refresh_expired");

  // Revocar la usada y emitir nueva
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(schema.refreshTokens.id, stored.id));

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, stored.userId))
    .limit(1);
  if (!user || !user.active) throw unauthorized("user_inactive");

  return issueTokens(user.id, user.email, user.role);
}

export async function revokeRefresh(token: string) {
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.refreshTokens.tokenHash, hashToken(token)),
        isNull(schema.refreshTokens.revokedAt),
      ),
    );
}

export async function revokeAllForUser(userId: string) {
  await db
    .update(schema.refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.refreshTokens.userId, userId),
        isNull(schema.refreshTokens.revokedAt),
        gt(schema.refreshTokens.expiresAt, new Date()),
      ),
    );
}

export const REFRESH_COOKIE = "bohr_rt";

export const refreshCookieOptions = () => ({
  httpOnly: true as const,
  sameSite: "strict" as const,
  secure: env.COOKIE_SECURE,
  domain: env.COOKIE_DOMAIN,
  path: "/auth",
  maxAge: REFRESH_TTL_MS,
});
