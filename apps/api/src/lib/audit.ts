import type { Request } from "express";
import { db, schema } from "../db/client.js";

export async function audit(req: Request, params: {
  action: string;
  entity: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  await db.insert(schema.auditLog).values({
    userId: req.auth?.userId,
    clientId: req.auth?.clientId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    meta: params.meta ?? null,
    ip: req.ip,
    userAgent: req.headers["user-agent"]?.slice(0, 200),
  });
}
