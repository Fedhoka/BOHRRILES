import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "./config.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error.js";
import authRouter from "./routes/auth.js";
import meRouter from "./routes/me.js";
import clientsRouter from "./routes/clients.js";
import companiesRouter from "./routes/companies.js";
import checklistsRouter from "./routes/checklists.js";
import salesInvoicesRouter from "./routes/salesInvoices.js";
import purchaseInvoicesRouter from "./routes/purchaseInvoices.js";
import withholdingsRouter from "./routes/withholdings.js";
import perceptionsRouter from "./routes/perceptions.js";
import vatReturnsRouter from "./routes/vatReturns.js";
import citiRouter from "./routes/citi.js";
import employeesRouter from "./routes/employees.js";
import payrollRunsRouter from "./routes/payrollRuns.js";
import cctScalesRouter from "./routes/cctScales.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/clients", clientsRouter);
app.use("/companies", companiesRouter);
app.use("/checklists", checklistsRouter);
app.use("/invoices/sales", salesInvoicesRouter);
app.use("/invoices/purchases", purchaseInvoicesRouter);
app.use("/withholdings", withholdingsRouter);
app.use("/perceptions", perceptionsRouter);
app.use("/vat-returns", vatReturnsRouter);
app.use("/citi", citiRouter);
app.use("/employees", employeesRouter);
app.use("/payroll-runs", payrollRunsRouter);
app.use("/cct-scales", cctScalesRouter);

app.use(errorHandler);

app.listen(env.PORT, () => logger.info({ port: env.PORT }, "API listening"));
