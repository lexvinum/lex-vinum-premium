import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL ou DIRECT_URL manquant dans .env.local");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({
  adapter,
  log: ["warn", "error"],
});

type RawRow = Record<string, unknown>;

type ImportedWineRow = {
  slug: string;
  name: string;
  country: string | null;
  region: string | null;
  vintage: string | null;
  appellationOrigine: string | null;
  designationReglementee: string | null;
  grape: string | null;
  alcohol: string | null;
  tauxSucre: string | null;
  color: string | null;
  natureType: string | null;
  bioType: string | null;
  formatMl: number | null;
  producer: string | null;
  saqCode: string | null;
  saqUrl: string | null;
  image: string | null;
  aromasJson: string | null;
  acidity: string | null;
  sugar: string | null;
  body: string | null;
  palate: string | null;
  oak: string | null;
  temperature: string | null;
  price: number | null;
  dataSource: string;
  sourceFile: string | null;
  isQuebec: boolean;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\[/g, "")
    .replace(/\]/g, "")
    .replace(/\(/g, "")
    .replace(/\)/g, "")
    .replace(/'/g, "")
    .replace(/’/g, "")
    .replace(/\//g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function normalizePrice(value: unknown): number | null {
  const raw = normalizeString(value);
  if (!raw) return null;

  const normalized = raw.replace(",", ".").replace(/[^\d.-]/g, "");
  if (!normalized) return null;

  const num = Number.parseFloat(normalized);
  return Number.isNaN(num) ? null : num;
}

function normalizeInt(value: unknown): number | null {
  const raw = normalizeString(value);
  if (!raw) return null;

  const normalized = raw.replace(/[^\d-]/g, "");
  if (!normalized) return null;

  const num = Number.parseInt(normalized, 10);
  return Number.isNaN(num) ? null : num;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function toJsonString(value: string | null): string | null {
  if (!value) return null;

  const parts = value
    .split(/[;,|]/g)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length === 0) return null;
  return JSON.stringify(parts);
}

function absoluteSaqUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `https://www.saq.com${url}`;
  return `https://www.saq.com/${url.replace(/^\/+/, "")}`;
}

function extractMeta(html: string, property: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

function extractJsonLdImage(html: string): string | null {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!scripts) return null;

  for (const script of scripts) {
    const content = script
      .replace(/^<script[^>]*>/i, "")
      .replace(/<\/script>$/i, "")
      .trim();

    try {
      const parsed = JSON.parse(content);
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of candidates) {
        if (!item || typeof item !== "object") continue;

        const image = (item as { image?: unknown }).image;
        if (typeof image === "string" && image.trim()) return image.trim();

        if (Array.isArray(image)) {
          const first = image.find((v) => typeof v === "string" && v.trim());
          if (typeof first === "string") return first.trim();
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchSaqImage(url: string | null): Promise<string | null> {
  const finalUrl = absoluteSaqUrl(url);
  if (!finalUrl) return null;

  try {
    const res = await fetch(finalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 LexVinumImporter/1.0",
        "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      console.warn(`⚠️ Impossible de lire ${finalUrl} (${res.status})`);
      return null;
    }

    const html = await res.text();

    const ogImage =
      extractMeta(html, "og:image") ||
      extractMeta(html, "og:image:secure_url") ||
      extractMeta(html, "twitter:image") ||
      extractJsonLdImage(html);

    return ogImage || null;
  } catch (error) {
    console.warn(`⚠️ Erreur image SAQ pour ${finalUrl}`, error);
    return null;
  }
}

function mapRow(row: Record<string, unknown>): Omit<ImportedWineRow, "image"> | null {
  const name = normalizeString(row["nom"]);
  if (!name) return null;

  const country = normalizeString(row["pays"]);
  const region = normalizeString(row["region"]);
  const saqCode = normalizeString(row["code saq"]);
  const vintage = normalizeString(row["annee"]);
  const producer = normalizeString(row["producteur"]);
  const saqUrl = absoluteSaqUrl(normalizeString(row["lien saq"]));

  const slugBase = slugify(name);
  const slug = saqCode ? `${slugBase}-${saqCode}` : slugBase;

  const isQuebec =
    (country?.toLowerCase().includes("canada") ?? false) &&
    (region?.toLowerCase().includes("quebec") ||
      region?.toLowerCase().includes("québec") ||
      false);

  return {
    slug,
    name,
    country,
    region,
    vintage,
    appellationOrigine: normalizeString(row["appellation dorigine"]),
    designationReglementee: normalizeString(row["designation reglementee"]),
    grape: normalizeString(row["cepages"]),
    alcohol: normalizeString(row["alcool"]),
    tauxSucre: normalizeString(row["taux de sucre"]),
    color: normalizeString(row["couleur"]),
    natureType: normalizeString(row["nature regulier"]),
    bioType: normalizeString(row["bio regulier"]),
    formatMl: normalizeInt(row["format ml"]),
    producer,
    saqCode,
    saqUrl,
    aromasJson: toJsonString(normalizeString(row["aromes"])),
    acidity: normalizeString(row["acidite"]),
    sugar: normalizeString(row["sucre"]),
    body: normalizeString(row["corps"]),
    palate: normalizeString(row["bouche"]),
    oak: normalizeString(row["boise"]),
    temperature: normalizeString(row["temperature de service"]),
    price: normalizePrice(row["prix"]),
    dataSource: "SAQ",
    sourceFile: "saq-wines.xlsx",
    isQuebec,
  };
}

async function main() {
  const fileArg = process.argv.find((arg) => arg.startsWith("--file="));
  const syncDelete = process.argv.includes("--sync-delete");
  const refreshImagesOnly = process.argv.includes("--refresh-images-only");

  const inputPath = fileArg
    ? fileArg.replace("--file=", "")
    : path.join(process.cwd(), "data/saq-wines.xlsx");

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Fichier introuvable : ${inputPath}`);
  }

  console.log(`📘 Lecture : ${inputPath}`);

  const workbook = XLSX.readFile(inputPath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, {
    defval: null,
    raw: false,
  });

  console.log(`📦 Lignes brutes : ${rawRows.length}`);

  const normalizedRows = rawRows.map((row) => {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      next[normalizeHeader(key)] = value;
    }
    return next;
  });

  const importedRows = normalizedRows
    .map(mapRow)
    .filter((row): row is NonNullable<ReturnType<typeof mapRow>> => Boolean(row));

  console.log(`🍷 Vins prêts à importer : ${importedRows.length}`);

  let created = 0;
  let updated = 0;
  let refreshedImages = 0;

  const saqCodesInFile = new Set<string>();

  for (let i = 0; i < importedRows.length; i += 1) {
    const row = importedRows[i];

    if (row.saqCode) {
      saqCodesInFile.add(row.saqCode);
    }

    const image = await fetchSaqImage(row.saqUrl);

    const data = {
      slug: row.slug,
      name: row.name,
      country: row.country,
      region: row.region,
      vintage: row.vintage,
      appellationOrigine: row.appellationOrigine,
      designationReglementee: row.designationReglementee,
      grape: row.grape,
      alcohol: row.alcohol,
      tauxSucre: row.tauxSucre,
      color: row.color,
      natureType: row.natureType,
      bioType: row.bioType,
      formatMl: row.formatMl,
      producer: row.producer,
      saqCode: row.saqCode,
      saqUrl: row.saqUrl,
      image,
      aromasJson: row.aromasJson,
      acidity: row.acidity,
      sugar: row.sugar,
      body: row.body,
      palate: row.palate,
      oak: row.oak,
      temperature: row.temperature,
      price: row.price,
      dataSource: row.dataSource,
      sourceFile: row.sourceFile,
      isQuebec: row.isQuebec,
    };

    const existing = row.saqCode
      ? await prisma.wine.findUnique({
          where: { saqCode: row.saqCode },
          select: { id: true, image: true },
        })
      : await prisma.wine.findUnique({
          where: { slug: row.slug },
          select: { id: true, image: true },
        });

    if (refreshImagesOnly) {
      if (existing?.id && image && image !== existing.image) {
        await prisma.wine.update({
          where: { id: existing.id },
          data: { image, saqUrl: row.saqUrl },
        });
        refreshedImages += 1;
      }
    } else if (existing) {
      await prisma.wine.update({
        where: { id: existing.id },
        data,
      });
      updated += 1;
    } else {
      await prisma.wine.create({
        data,
      });
      created += 1;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`⏳ ${i + 1}/${importedRows.length} lignes traitées...`);
    }
  }

  if (syncDelete && !refreshImagesOnly) {
    const dbRows = await prisma.wine.findMany({
      where: { dataSource: "SAQ" },
      select: { id: true, saqCode: true },
    });

    const idsToDelete = dbRows
      .filter((row) => row.saqCode && !saqCodesInFile.has(row.saqCode))
      .map((row) => row.id);

    if (idsToDelete.length > 0) {
      await prisma.wine.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }

    console.log(`🗑️ Supprimés car absents du fichier : ${idsToDelete.length}`);
  }

  console.log(`✅ Import terminé`);
  if (refreshImagesOnly) {
    console.log(`🖼️ Images mises à jour : ${refreshedImages}`);
  } else {
    console.log(`➕ Créés : ${created}`);
    console.log(`🔁 Mis à jour : ${updated}`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Erreur d’import :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });