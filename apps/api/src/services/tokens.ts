import { SignJWT, jwtVerify } from "jose";
import crypto from "node:crypto";
import { env } from "../config.js";

const access = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refresh = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export type Role = "admin_studio" | "accountant" | "client_readonly";

export interface AccessClaims {
  sub: string;          // userId
  email: string;
  role: Role;
}

export async function signAccessToken(claims: AccessClaims): Promise<string> {
  return new SignJWT({ email: claims.email, role: claims.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(access);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, access);
  return {
    sub: String(payload.sub),
    email: String(payload.email),
    role: payload.role as Role,
  };
}

export async function signRefreshToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refresh);
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string; jti: string; exp: number }> {
  const { payload } = await jwtVerify(token, refresh);
  return {
    sub: String(payload.sub),
    jti: String(payload.jti),
    exp: Number(payload.exp),
  };
}

export const newJti = (): string => crypto.randomUUID();

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");
