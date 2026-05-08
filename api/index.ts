import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { env } from "../apps/api/src/config.js";
import { errorHandler } from "../apps/api/src/middleware/error.js";
import authRouter from "../apps/api/src/routes/auth.js";
import meRouter from "../apps/api/src/routes/me.js";
import clientsRouter from "../apps/api/src/routes/clients.js";
import companiesRouter from "../apps/api/src/routes/companies.js";
import checklistsRouter from "../apps/api/src/routes/checklists.js";
import salesInvoicesRouter from "../apps/api/src/routes/salesInvoices.js";
import purchaseInvoicesRouter from "../apps/api/src/routes/purchaseInvoices.js";
import withholdingsRouter from "../apps/api/src/routes/withholdings.js";
import perceptionsRouter from "../apps/api/src/routes/perceptions.js";
import vatReturnsRouter from "../apps/api/src/routes/vatReturns.js";
import citiRouter from "../apps/api/src/routes/citi.js";
import employeesRouter from "../apps/api/src/routes/employees.js";
import payrollRunsRouter from "../apps/api/src/routes/payrollRuns.js";
import cctScalesRouter from "../apps/api/src/routes/cctScales.js";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((req, _res, next) => { req.url = req.url.replace(/^\/api/, "") || "/"; next(); });
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
}));

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

export default app;
