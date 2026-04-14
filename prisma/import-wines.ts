import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

type CsvWineRow = {
  name?: string;
  producer?: string;
  country?: string;
  region?: string;
  grape?: string;
  color?: string;
  style?: string;
  price?: string;
  vintage?: string;
  image?: string;
  aromas?: string;
  tags?: string;
  description?: string;
  isQuebec?: string;
  featured?: string;
  body?: string;
  acidity?: string;
  tannin?: string;
  minerality?: string;
  pairings?: string;
  serving?: string;
  temperature?: string;
  cellar?: string;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL est manquant dans ton fichier .env");
}

const pool = new pg.Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

function normalizeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function parseBool(value: unknown, fallback = false) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!v) return fallback;
  return ["true", "1", "yes", "oui"].includes(v);
}

function parseFloatOrNull(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (!raw) return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseList(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const items = raw
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length ? JSON.stringify(items) : null;
}

async function main() {
  const filePath = path.join(process.cwd(), "data", "wines.csv");
  const content = fs.readFileSync(filePath, "utf-8");

  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as CsvWineRow[];

  for (const row of rows) {
    const name = String(row.name ?? "").trim();
    if (!name) continue;

    const producer = String(row.producer ?? "").trim() || null;
    const country = String(row.country ?? "").trim() || null;
    const region = String(row.region ?? "").trim() || null;
    const grape = String(row.grape ?? "").trim() || null;
    const color = String(row.color ?? "").trim() || null;
    const style = String(row.style ?? "").trim() || null;
    const price = parseFloatOrNull(row.price);
    const vintage = String(row.vintage ?? "").trim() || null;
    const image = String(row.image ?? "").trim() || null;
    const description = String(row.description ?? "").trim() || null;

    const isQuebec = parseBool(row.isQuebec, false);
    const featured = parseBool(row.featured, false);

    const body = String(row.body ?? "").trim() || null;
    const acidity = String(row.acidity ?? "").trim() || null;
    const tannin = String(row.tannin ?? "").trim() || null;
    const minerality = String(row.minerality ?? "").trim() || null;
    const serving = String(row.serving ?? "").trim() || null;
    const temperature = String(row.temperature ?? "").trim() || null;
    const cellar = String(row.cellar ?? "").trim() || null;

    const aromasJson = parseList(row.aromas);
    const tagsJson = parseList(row.tags);
    const pairingJson = parseList(row.pairings);

    const slug = slugify([name, producer, vintage].filter(Boolean).join(" "));

    await prisma.wine.upsert({
      where: { slug },
      update: {
        name,
        producer,
        country,
        region,
        grape,
        color,
        style,
        price,
        vintage,
        image,
        aromasJson,
        tagsJson,
        description,
        isQuebec,
        featured,
        body,
        acidity,
        tannin,
        minerality,
        pairingJson,
        serving,
        temperature,
        cellar,
      },
      create: {
        slug,
        name,
        producer,
        country,
        region,
        grape,
        color,
        style,
        price,
        vintage,
        image,
        aromasJson,
        tagsJson,
        description,
        isQuebec,
        featured,
        body,
        acidity,
        tannin,
        minerality,
        pairingJson,
        serving,
        temperature,
        cellar,
      },
    });
  }

  console.log("Import terminé");
}

main()
  .catch((error) => {
    console.error("Erreur import:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });