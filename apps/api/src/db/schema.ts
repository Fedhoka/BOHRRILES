import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  json,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id").primaryKey().$defaultFn(() => crypto.randomUUID());

const ts = (name: string) =>
  timestamp(name, { mode: "date", withTimezone: true }).$defaultFn(() => new Date());

// ============ AUTH / TENANCY ============

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").$type<"admin_studio" | "accountant" | "client_readonly">().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("rt_user_idx").on(t.userId),
  uniqueIndex("rt_token_idx").on(t.tokenHash),
]);

export const clients = pgTable("clients", {
  id: id(),
  cuit: text("cuit").notNull().unique(),
  legalName: text("legal_name").notNull(),
  tradeName: text("trade_name"),
  taxCategory: text("tax_category").$type<"responsable_inscripto" | "monotributista" | "exento" | "consumidor_final">().notNull(),
  ivaCondition: text("iva_condition"),
  fiscalAddress: text("fiscal_address"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
});

export const userClients = pgTable("user_clients", {
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  role: text("role").$type<"admin_studio" | "accountant" | "client_readonly">().notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.clientId] }),
]);

export const companies = pgTable("companies", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  cct: text("cct"),
  activityCode: text("activity_code"),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("companies_client_idx").on(t.clientId),
]);

// ============ VAT ============

export const salesInvoices = pgTable("sales_invoices", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  issueDate: timestamp("issue_date", { mode: "date", withTimezone: true }).notNull(),
  invoiceType: text("invoice_type").$type<"A" | "B" | "C" | "M" | "E">().notNull(),
  pointOfSale: integer("point_of_sale").notNull(),
  number: integer("number").notNull(),
  buyerCuit: text("buyer_cuit"),
  buyerName: text("buyer_name"),
  netAmount: real("net_amount").notNull(),
  vat21: real("vat_21").notNull().default(0),
  vat105: real("vat_10_5").notNull().default(0),
  vat27: real("vat_27").notNull().default(0),
  vatPerceptions: real("vat_perceptions").notNull().default(0),
  iibbPerceptions: real("iibb_perceptions").notNull().default(0),
  exempt: real("exempt").notNull().default(0),
  total: real("total").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("si_client_period_idx").on(t.clientId, t.period),
  uniqueIndex("si_uniq_idx").on(t.clientId, t.invoiceType, t.pointOfSale, t.number),
]);

export const purchaseInvoices = pgTable("purchase_invoices", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  issueDate: timestamp("issue_date", { mode: "date", withTimezone: true }).notNull(),
  invoiceType: text("invoice_type").$type<"A" | "B" | "C" | "M" | "E">().notNull(),
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
  grantsCredit: boolean("grants_credit").notNull().default(false),
  isPayroll: boolean("is_payroll").notNull().default(false),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("pi_client_period_idx").on(t.clientId, t.period),
  uniqueIndex("pi_uniq_idx").on(t.clientId, t.supplierCuit, t.invoiceType, t.pointOfSale, t.number),
]);

export const withholdings = pgTable("withholdings", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  taxType: text("tax_type").$type<"iva" | "ganancias" | "iibb" | "suss">().notNull(),
  certNumber: text("cert_number").notNull(),
  date: timestamp("date", { mode: "date", withTimezone: true }).notNull(),
  amount: real("amount").notNull(),
  agentCuit: text("agent_cuit").notNull(),
  agentName: text("agent_name").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("wh_client_period_idx").on(t.clientId, t.period),
]);

export const perceptions = pgTable("perceptions", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  taxType: text("tax_type").$type<"iva" | "iibb" | "ganancias">().notNull(),
  jurisdiction: text("jurisdiction"),
  date: timestamp("date", { mode: "date", withTimezone: true }).notNull(),
  amount: real("amount").notNull(),
  agentCuit: text("agent_cuit").notNull(),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("pc_client_period_idx").on(t.clientId, t.period),
]);

export const vatReturns = pgTable("vat_returns", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  closedAt: timestamp("closed_at", { mode: "date", withTimezone: true }).notNull(),
  closedBy: text("closed_by").notNull().references(() => users.id),
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
  snapshot: json("snapshot").notNull(),
}, (t) => [
  uniqueIndex("vr_uniq_idx").on(t.clientId, t.period),
]);

// ============ PAYROLL ============

export const employees = pgTable("employees", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  cuil: text("cuil").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  hireDate: timestamp("hire_date", { mode: "date", withTimezone: true }).notNull(),
  terminationDate: timestamp("termination_date", { mode: "date", withTimezone: true }),
  cct: text("cct").notNull(),
  category: text("category").notNull(),
  baseSalary: real("base_salary").notNull(),
  workSchedule: text("work_schedule").$type<"full_time" | "part_time">().notNull().default("full_time"),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("emp_client_idx").on(t.clientId),
  index("emp_cuil_idx").on(t.clientId, t.cuil),
]);

export const cctScales = pgTable("cct_scales", {
  id: id(),
  cct: text("cct").notNull(),
  category: text("category").notNull(),
  period: text("period").notNull(),
  baseSalary: real("base_salary").notNull(),
  hourlyRate: real("hourly_rate"),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  uniqueIndex("cct_uniq_idx").on(t.cct, t.category, t.period),
]);

export const payrollRuns = pgTable("payroll_runs", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  companyId: text("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  period: text("period").notNull(),
  type: text("type").$type<"monthly" | "bonus_h1" | "bonus_h2" | "vacation" | "settlement">().notNull(),
  status: text("status").$type<"draft" | "closed">().notNull().default("draft"),
  closedAt: timestamp("closed_at", { mode: "date", withTimezone: true }),
  closedBy: text("closed_by").references(() => users.id),
  snapshot: json("snapshot"),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  uniqueIndex("pr_uniq_idx").on(t.clientId, t.companyId, t.period, t.type),
]);

export const payrollItems = pgTable("payroll_items", {
  id: id(),
  payrollRunId: text("payroll_run_id").notNull().references(() => payrollRuns.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  basicSalary: real("basic_salary").notNull().default(0),
  overtime50: real("overtime_50").notNull().default(0),
  overtime100: real("overtime_100").notNull().default(0),
  seniority: real("seniority").notNull().default(0),
  presenteeism: real("presenteeism").notNull().default(0),
  productivity: real("productivity").notNull().default(0),
  vacationPay: real("vacation_pay").notNull().default(0),
  bonusPay: real("bonus_pay").notNull().default(0),
  nonRemunerative: real("non_remunerative").notNull().default(0),
  jubilacion: real("jubilacion").notNull().default(0),
  obraSocial: real("obra_social").notNull().default(0),
  ley19032: real("ley_19032").notNull().default(0),
  unionFee: real("union_fee").notNull().default(0),
  incomeTax4th: real("income_tax_4th").notNull().default(0),
  otherDeductions: real("other_deductions").notNull().default(0),
  employerContributions: real("employer_contributions").notNull().default(0),
  art: real("art").notNull().default(0),
  grossPay: real("gross_pay").notNull(),
  totalDeductions: real("total_deductions").notNull(),
  netPay: real("net_pay").notNull(),
}, (t) => [
  index("pi_run_idx").on(t.payrollRunId),
  index("pi_emp_idx").on(t.employeeId),
]);

export const severanceCalcs = pgTable("severance_calcs", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  computedAt: ts("computed_at").notNull(),
  cause: text("cause").$type<"sin_causa" | "con_causa" | "renuncia" | "mutuo_acuerdo" | "fallecimiento">().notNull(),
  bestSalary12m: real("best_salary_12m").notNull(),
  yearsOfService: real("years_of_service").notNull(),
  severanceArt245: real("severance_art_245").notNull().default(0),
  preavisoArt231: real("preaviso_art_231").notNull().default(0),
  integracionMes: real("integracion_mes").notNull().default(0),
  sacProporcional: real("sac_proporcional").notNull().default(0),
  vacacionesNoGozadas: real("vacaciones_no_gozadas").notNull().default(0),
  total: real("total").notNull(),
  snapshot: json("snapshot").notNull(),
});

export const checklistTemplates = pgTable("checklist_templates", {
  id: id(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  items: json("items").notNull(),
});

export const checklistRuns = pgTable("checklist_runs", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  templateId: text("template_id").notNull().references(() => checklistTemplates.id),
  period: text("period").notNull(),
  status: text("status").$type<"pending" | "in_progress" | "done" | "blocked">().notNull().default("pending"),
  items: json("items").notNull(),
  createdAt: ts("created_at").notNull(),
  updatedAt: ts("updated_at").notNull(),
}, (t) => [
  uniqueIndex("cr_uniq_idx").on(t.clientId, t.templateId, t.period),
]);

export const auditLog = pgTable("audit_log", {
  id: id(),
  userId: text("user_id").references(() => users.id),
  clientId: text("client_id").references(() => clients.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  meta: json("meta"),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: ts("created_at").notNull(),
}, (t) => [
  index("audit_client_idx").on(t.clientId, t.createdAt),
]);

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Company = typeof companies.$inferSelect;
export type SalesInvoice = typeof salesInvoices.$inferSelect;
export type PurchaseInvoice = typeof purchaseInvoices.$inferSelect;
export type VatReturn = typeof vatReturns.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type PayrollItem = typeof payrollItems.$inferSelect;
