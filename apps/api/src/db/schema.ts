import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

const ts = (name: string) =>
  integer(name, { mode: "timestamp_ms" }).$defaultFn(() => new Date());

// ============ AUTH / TENANCY ============

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin_studio", "accountant", "client_readonly"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const refreshTokens = sqliteTable("refresh_tokens", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byUser: index("rt_user_idx").on(t.userId),
  byToken: uniqueIndex("rt_token_idx").on(t.tokenHash),
}));

// Tenant root: each accounting client (taxpayer)
export const clients = sqliteTable("clients", {
  id: id(),
  cuit: text("cuit").notNull().unique(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  taxCategory: text("tax_category", {
    enum: ["responsable_inscripto", "monotributista", "exento", "consumidor_final"],
  }).notNull(),
  ivaCondition: text("iva_condition"),
  fiscalAddress: text("fiscal_address"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

// Many-to-many: which users may access which clients
export const userClients = sqliteTable("user_clients", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["admin_studio", "accountant", "client_readonly"] }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.clientId] }),
}));

// A "company" is a billing/payroll branch under a client (most clients have one)
export const companies = sqliteTable("companies", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  cct: text("cct"), // collective bargaining agreement code (e.g. "130/75" retail)
  activityCode: text("activity_code"),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClient: index("companies_client_idx").on(t.clientId),
}));

// ============ VAT ============

export const salesInvoices = sqliteTable("sales_invoices", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(), // YYYY-MM
  issueDate: integer("issue_date", { mode: "timestamp_ms" }).notNull(),
  invoiceType: text("invoice_type", { enum: ["A", "B", "C", "M", "E"] }).notNull(),
  pointOfSale: integer("point_of_sale").notNull(),
  number: integer("number").notNull(),
  buyerCuit: text("buyer_cuit"),
  buyerName: text("buyer_name"),
  netAmount: real("net_amount").notNull(),       // base imponible
  vat21: real("vat_21").notNull().default(0),
  vat105: real("vat_10_5").notNull().default(0),
  vat27: real("vat_27").notNull().default(0),
  vatPerceptions: real("vat_perceptions").notNull().default(0),
  iibbPerceptions: real("iibb_perceptions").notNull().default(0),
  exempt: real("exempt").notNull().default(0),
  total: real("total").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClientPeriod: index("si_client_period_idx").on(t.clientId, t.period),
  uniq: uniqueIndex("si_uniq_idx").on(t.clientId, t.invoiceType, t.pointOfSale, t.number),
}));

export const purchaseInvoices = sqliteTable("purchase_invoices", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  issueDate: integer("issue_date", { mode: "timestamp_ms" }).notNull(),
  invoiceType: text("invoice_type", { enum: ["A", "B", "C", "M", "E"] }).notNull(),
  pointOfSale: integer("point_of_sale").notNull(),
  number: integer("number").notNull(),
  supplierCuit: text("supplier_cuit").notNull(),
  supplierName: text("supplier_name").notNull(),
  netAmount: real("net_amount").notNull(),
  vat21: real("vat_21").notNull().default(0),
  vat105: real("vat_10_5").notNull().default(0),
  vat27: real("vat_27").notNull().default(0),
  vatPerceptions: real("vat_perceptions").notNull().default(0),
  iibbPerceptions: real("iibb_perceptions").notNull().default(0),
  exempt: real("exempt").notNull().default(0),
  total: real("total").notNull(),
  // crédito fiscal só corresponde a A/M
  grantsCredit: integer("grants_credit", { mode: "boolean" }).notNull().default(false),
  isPayroll: integer("is_payroll", { mode: "boolean" }).notNull().default(false),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClientPeriod: index("pi_client_period_idx").on(t.clientId, t.period),
  uniq: uniqueIndex("pi_uniq_idx").on(t.clientId, t.supplierCuit, t.invoiceType, t.pointOfSale, t.number),
}));

export const withholdings = sqliteTable("withholdings", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  taxType: text("tax_type", { enum: ["iva", "ganancias", "iibb", "suss"] }).notNull(),
  certNumber: text("cert_number").notNull(),
  date: integer("date", { mode: "timestamp_ms" }).notNull(),
  amount: real("amount").notNull(),
  agentCuit: text("agent_cuit").notNull(),
  agentName: text("agent_name").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClientPeriod: index("wh_client_period_idx").on(t.clientId, t.period),
}));

export const perceptions = sqliteTable("perceptions", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  taxType: text("tax_type", { enum: ["iva", "iibb", "ganancias"] }).notNull(),
  jurisdiction: text("jurisdiction"), // for IIBB
  date: integer("date", { mode: "timestamp_ms" }).notNull(),
  amount: real("amount").notNull(),
  agentCuit: text("agent_cuit").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClientPeriod: index("pc_client_period_idx").on(t.clientId, t.period),
}));

// Immutable monthly VAT return snapshot
export const vatReturns = sqliteTable("vat_returns", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }).notNull(),
  closedBy: text("closed_by").notNull().references(() => users.id),
  // Determinación
  debitVat: real("debit_vat").notNull(),
  creditVat: real("credit_vat").notNull(),
  proportionalityFactor: real("proportionality_factor").notNull().default(1),
  withholdingsApplied: real("withholdings_applied").notNull().default(0),
  perceptionsApplied: real("perceptions_applied").notNull().default(0),
  technicalBalancePrevious: real("technical_balance_previous").notNull().default(0),
  freeBalancePrevious: real("free_balance_previous").notNull().default(0),
  technicalBalanceNext: real("technical_balance_next").notNull().default(0),
  freeBalanceNext: real("free_balance_next").notNull().default(0),
  payable: real("payable").notNull().default(0),
  snapshot: text("snapshot", { mode: "json" }).notNull(), // full immutable detail
}, (t) => ({
  uniq: uniqueIndex("vr_uniq_idx").on(t.clientId, t.period),
}));

// ============ PAYROLL ============

export const employees = sqliteTable("employees", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  cuil: text("cuil").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  hireDate: integer("hire_date", { mode: "timestamp_ms" }).notNull(),
  terminationDate: integer("termination_date", { mode: "timestamp_ms" }),
  cct: text("cct").notNull(),
  category: text("category").notNull(),
  baseSalary: real("base_salary").notNull(),
  workSchedule: text("work_schedule", { enum: ["full_time", "part_time"] }).notNull().default("full_time"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClient: index("emp_client_idx").on(t.clientId),
  byCuil: index("emp_cuil_idx").on(t.clientId, t.cuil),
}));

// CCT salary scale per period
export const cctScales = sqliteTable("cct_scales", {
  id: id(),
  cct: text("cct").notNull(),
  category: text("category").notNull(),
  period: text("period").notNull(), // YYYY-MM (effective from)
  baseSalary: real("base_salary").notNull(),
  hourlyRate: real("hourly_rate"),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  uniq: uniqueIndex("cct_uniq_idx").on(t.cct, t.category, t.period),
}));

export const payrollRuns = sqliteTable("payroll_runs", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  type: text("type", { enum: ["monthly", "bonus_h1", "bonus_h2", "vacation", "settlement"] }).notNull(),
  status: text("status", { enum: ["draft", "closed"] }).notNull().default("draft"),
  closedAt: integer("closed_at", { mode: "timestamp_ms" }),
  closedBy: text("closed_by").references(() => users.id),
  snapshot: text("snapshot", { mode: "json" }), // immutable detail at close
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  uniq: uniqueIndex("pr_uniq_idx").on(t.clientId, t.companyId, t.period, t.type),
}));

export const payrollItems = sqliteTable("payroll_items", {
  id: id(),
  payrollRunId: text("payroll_run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  // Earnings
  basicSalary: real("basic_salary").notNull().default(0),
  overtime50: real("overtime_50").notNull().default(0),
  overtime100: real("overtime_100").notNull().default(0),
  seniority: real("seniority").notNull().default(0),
  presenteeism: real("presenteeism").notNull().default(0),
  productivity: real("productivity").notNull().default(0),
  vacationPay: real("vacation_pay").notNull().default(0),
  bonusPay: real("bonus_pay").notNull().default(0),
  nonRemunerative: real("non_remunerative").notNull().default(0),
  // Deductions
  jubilacion: real("jubilacion").notNull().default(0),       // 11%
  obraSocial: real("obra_social").notNull().default(0),      // 3%
  ley19032: real("ley_19032").notNull().default(0),          // 3%
  unionFee: real("union_fee").notNull().default(0),
  incomeTax4th: real("income_tax_4th").notNull().default(0),
  otherDeductions: real("other_deductions").notNull().default(0),
  // Employer contributions
  employerContributions: real("employer_contributions").notNull().default(0),
  art: real("art").notNull().default(0),
  // Totals
  grossPay: real("gross_pay").notNull(),
  totalDeductions: real("total_deductions").notNull(),
  netPay: real("net_pay").notNull(),
}, (t) => ({
  byRun: index("pi_run_idx").on(t.payrollRunId),
  byEmp: index("pi_emp_idx").on(t.employeeId),
}));

// Severance settlement records
export const severanceCalcs = sqliteTable("severance_calcs", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  computedAt: ts("computed_at").notNull(),
  cause: text("cause", { enum: ["sin_causa", "con_causa", "renuncia", "mutuo_acuerdo", "fallecimiento"] }).notNull(),
  bestSalary12m: real("best_salary_12m").notNull(),
  yearsOfService: real("years_of_service").notNull(),
  severanceArt245: real("severance_art_245").notNull().default(0),
  preavisoArt231: real("preaviso_art_231").notNull().default(0),
  integracionMes: real("integracion_mes").notNull().default(0),
  sacProporcional: real("sac_proporcional").notNull().default(0),
  vacacionesNoGozadas: real("vacaciones_no_gozadas").notNull().default(0),
  total: real("total").notNull(),
  snapshot: text("snapshot", { mode: "json" }).notNull(),
});

// ============ CLOSING CHECKLIST ============

export const checklistTemplates = sqliteTable("checklist_templates", {
  id: id(),
  code: text("code").notNull().unique(), // e.g. "monthly_vat"
  name: text("name").notNull(),
  items: text("items", { mode: "json" }).notNull(), // [{key,label,due_offset_days}]
});

export const checklistRuns = sqliteTable("checklist_runs", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => checklistTemplates.id),
  period: text("period").notNull(),
  status: text("status", { enum: ["pending", "in_progress", "done", "blocked"] }).notNull().default("pending"),
  items: text("items", { mode: "json" }).notNull(), // [{key,label,done,doneAt,doneBy,note}]
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => ({
  uniq: uniqueIndex("cr_uniq_idx").on(t.clientId, t.templateId, t.period),
}));

// ============ AUDIT ============

export const auditLog = sqliteTable("audit_log", {
  id: id(),
  userId: text("user_id").references(() => users.id),
  clientId: text("client_id").references(() => clients.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: text("meta", { mode: "json" }),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: ts("created_at").notNull(),
}, (t) => ({
  byClient: index("audit_client_idx").on(t.clientId, t.createdAt),
}));

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type VatReturn = typeof vatReturns.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollItem = typeof payrollItems.$inferSelect;
