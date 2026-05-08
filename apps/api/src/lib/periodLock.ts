import { eq, and } from "drizzle-orm";
import { db, schema } from "../db/client.js";
import { conflict } from "./errors.js";

/**
 * Bloquea modificaciones a un período ya cerrado (VAT return existente).
 * Garantiza la inmutabilidad: ninguna factura/retención del período cerrado
 * puede crearse, modificarse ni borrarse.
 */
export async function ensureVatPeriodOpen(clientId: string, period: string): Promise<void> {
  const [closed] = await db
    .select({ id: schema.vatReturns.id })
    .from(schema.vatReturns)
    .where(and(eq(schema.vatReturns.clientId, clientId), eq(schema.vatReturns.period, period)))
    .limit(1);
  if (closed) throw conflict("period_closed", "vat_period_closed");
}
