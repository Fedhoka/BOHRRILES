import pino from "pino";
import { env } from "../config.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  // Redactar PII / credenciales — nunca log de CUIT, CUIL, sueldos, tokens.
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.cuit",
      "*.cuil",
      "*.token",
      "*.refreshToken",
      "*.salary",
      "*.baseSalary",
      "*.netPay",
      "*.grossPay",
    ],
    censor: "[redacted]",
  },
});
