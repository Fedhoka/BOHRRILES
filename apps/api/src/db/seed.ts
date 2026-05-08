import "dotenv/config";
import bcrypt from "bcrypt";
import { db, schema } from "./client.js";

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

async function main() {
  console.log("Seeding demo data...");

  const adminHash = await bcrypt.hash("admin123!", ROUNDS);
  const accountantHash = await bcrypt.hash("contador123!", ROUNDS);
  const clientHash = await bcrypt.hash("cliente123!", ROUNDS);

  const [admin] = await db.insert(schema.users).values({
    email: "admin@estudio.test",
    passwordHash: adminHash,
    name: "Admin Estudio",
    role: "admin_studio",
  }).returning();

  const [accountant] = await db.insert(schema.users).values({
    email: "contador@estudio.test",
    passwordHash: accountantHash,
    name: "Juan Contador",
    role: "accountant",
  }).returning();

  const [readonly] = await db.insert(schema.users).values({
    email: "cliente@empresa.test",
    passwordHash: clientHash,
    name: "Cliente Lectura",
    role: "client_readonly",
  }).returning();

  // Demo clients
  const [acme] = await db.insert(schema.clients).values({
    cuit: "30709653543",
    legalName: "ACME S.A.",
    tradeName: "ACME Retail",
    taxCategory: "responsable_inscripto",
    ivaCondition: "RI",
    fiscalAddress: "Av. Corrientes 1234, CABA",
  }).returning();

  const [bistro] = await db.insert(schema.clients).values({
    cuit: "30715948561",
    legalName: "Bistró del Sur SRL",
    taxCategory: "responsable_inscripto",
    ivaCondition: "RI",
    fiscalAddress: "Honduras 4567, Palermo",
  }).returning();

  // User-client links
  await db.insert(schema.userClients).values([
    { userId: admin!.id, clientId: acme!.id, role: "admin_studio" },
    { userId: admin!.id, clientId: bistro!.id, role: "admin_studio" },
    { userId: accountant!.id, clientId: acme!.id, role: "accountant" },
    { userId: accountant!.id, clientId: bistro!.id, role: "accountant" },
    { userId: readonly!.id, clientId: acme!.id, role: "client_readonly" },
  ]);

  // Companies
  const [acmeCo] = await db.insert(schema.companies).values({
    clientId: acme!.id,
    name: "ACME S.A. - Casa Central",
    cct: "130/75",
    activityCode: "475110",
  }).returning();

  const [bistroCo] = await db.insert(schema.companies).values({
    clientId: bistro!.id,
    name: "Bistró del Sur SRL",
    cct: "389/04",
    activityCode: "561011",
  }).returning();

  // CCT scales (sample: retail 130/75 + hospitality 389/04 + construction 76/75)
  const period = "2026-04";
  await db.insert(schema.cctScales).values([
    { cct: "130/75", category: "Maestranza A", period, baseSalary: 520000 },
    { cct: "130/75", category: "Administrativo A", period, baseSalary: 580000 },
    { cct: "130/75", category: "Cajero", period, baseSalary: 560000 },
    { cct: "130/75", category: "Vendedor B", period, baseSalary: 600000 },
    { cct: "389/04", category: "Mozo", period, baseSalary: 540000 },
    { cct: "389/04", category: "Cocinero", period, baseSalary: 620000 },
    { cct: "389/04", category: "Encargado", period, baseSalary: 720000 },
    { cct: "76/75", category: "Ayudante", period, baseSalary: 600000, hourlyRate: 3500 },
    { cct: "76/75", category: "Oficial", period, baseSalary: 760000, hourlyRate: 4400 },
    { cct: "76/75", category: "Oficial Especializado", period, baseSalary: 880000, hourlyRate: 5100 },
  ]);

  // Demo employees
  await db.insert(schema.employees).values([
    {
      clientId: acme!.id,
      companyId: acmeCo!.id,
      cuil: "20309876543",
      firstName: "María",
      lastName: "González",
      hireDate: new Date("2019-03-15"),
      cct: "130/75",
      category: "Cajero",
      baseSalary: 560000,
    },
    {
      clientId: acme!.id,
      companyId: acmeCo!.id,
      cuil: "20284561234",
      firstName: "Carlos",
      lastName: "Pérez",
      hireDate: new Date("2021-07-01"),
      cct: "130/75",
      category: "Vendedor B",
      baseSalary: 600000,
    },
    {
      clientId: bistro!.id,
      companyId: bistroCo!.id,
      cuil: "27325671234",
      firstName: "Lucía",
      lastName: "Fernández",
      hireDate: new Date("2022-01-10"),
      cct: "389/04",
      category: "Mozo",
      baseSalary: 540000,
    },
  ]);

  // Checklist template
  await db.insert(schema.checklistTemplates).values({
    code: "monthly_vat",
    name: "Cierre mensual IVA",
    items: [
      { key: "ventas_cargadas", label: "Ventas del período cargadas" },
      { key: "compras_cargadas", label: "Compras del período cargadas" },
      { key: "retenciones_cargadas", label: "Retenciones cargadas" },
      { key: "percepciones_cargadas", label: "Percepciones cargadas" },
      { key: "citi_generado", label: "CITI Ventas/Compras generado" },
      { key: "f731_presentado", label: "F731 presentado" },
      { key: "pago_realizado", label: "Pago realizado" },
    ],
  });

  console.log("Seed complete.");
  console.log("Users:");
  console.log("  admin@estudio.test / admin123!");
  console.log("  contador@estudio.test / contador123!");
  console.log("  cliente@empresa.test / cliente123!");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
