import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL manquant dans .env.local");
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

type RawRow = Record<string, unknown>;

function cleanString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "nan") return null;
  return text;
}

function normalizeKey(key: string): string {
  return key
    .replace(/^\ufeff/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function remapRowKeys(row: RawRow): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    mapped[normalizeKey(key)] = value;
  }

  return mapped;
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const normalized = normalizeKey(key);
    if (normalized in row) return row[normalized];
  }
  return undefined;
}

function toFloat(value: unknown): number | null {
  const text = cleanString(value);
  if (!text) return null;

  const normalized = text.replace(",", ".");
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

function normalizeVintage(value: unknown): string | null {
  const text = cleanString(value);
  if (!text) return null;

  const match = text.match(/\b(19\d{2}|20\d{2}|21\d{2})\b/);
  if (match) return match[1];

  return null;
}

function toBool(value: unknown): boolean {
  const text = cleanString(value)?.toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function safeJsonString(value: unknown): string | null {
  const text = cleanString(value);
  if (!text) return null;

  try {
    const parsed = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {
    return null;
  }
}

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vin"
  );
}

async function main() {
  const filePath = path.join(
    process.cwd(),
    "prisma",
    "data",
    "lex_vinum_wines_clean.csv"
  );

  const csvContent = readFileSync(filePath, "utf-8");

  const rawRows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as RawRow[];

  if (!rawRows.length) {
    throw new Error("Le CSV est vide.");
  }

  console.log(`📦 ${rawRows.length} lignes trouvées dans le CSV`);
  console.log("🧾 Colonnes brutes détectées :", Object.keys(rawRows[0]));

  const rows = rawRows.map(remapRowKeys);

  console.log("🧾 Colonnes normalisées :", Object.keys(rows[0]));

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const name =
      cleanString(pick(row, "name")) ||
      cleanString(pick(row, "nom"));

    if (!name) {
      skipped++;
      continue;
    }

    const producer =
      cleanString(pick(row, "producer")) ||
      cleanString(pick(row, "producteur"));

    const country =
      cleanString(pick(row, "country")) ||
      cleanString(pick(row, "pays"));

    const region = cleanString(pick(row, "region"));
    const color = cleanString(pick(row, "color"));
    const price = toFloat(pick(row, "price", "prix"));
    const vintage = normalizeVintage(pick(row, "vintage", "annee"));

    const saqCode =
      cleanString(pick(row, "saqcode")) ||
      cleanString(pick(row, "codesaq"));

    const saqUrl =
      cleanString(pick(row, "saqurl")) ||
      cleanString(pick(row, "liensaq"));

    const description = cleanString(pick(row, "description"));
    const aromasJson = safeJsonString(pick(row, "aromasjson"));
    const tagsJson = safeJsonString(pick(row, "tagsjson"));
    const isQuebec = toBool(pick(row, "isquebec"));
    const featured = toBool(pick(row, "featured"));

    const slug =
      cleanString(pick(row, "slug")) ||
      slugify(`${name}-${vintage ?? ""}-${producer ?? ""}`);

    try {
      await prisma.wine.upsert({
        where: { slug },
        update: {
          name,
          producer,
          country,
          region,
          color,
          price,
          vintage,
          description,
          aromasJson,
          tagsJson,
          isQuebec,
          featured,
        },
        create: {
          slug,
          name,
          producer,
          country,
          region,
          color,
          price,
          vintage,
          description,
          aromasJson,
          tagsJson,
          isQuebec,
          featured,
        },
      });

      imported++;
    } catch (error: any) {
      skipped++;
      console.error("❌ ERREUR DETAILLEE");
      console.error("Nom:", name);
      console.error("Slug:", slug);
      console.error("Message:", error?.message);
      console.error("Code:", error?.code);
      console.error("Meta:", error?.meta);
      console.error("Ligne normalisée:", row);
      break;
    }
  }

  console.log("✅ Import terminé");
  console.log(`✔️ Importés / mis à jour : ${imported}`);
  console.log(`⚠️ Ignorés / en erreur : ${skipped}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed échoué");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
