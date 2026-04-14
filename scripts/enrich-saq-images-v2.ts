import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

type SourceRow = {
  slug: string | null;
  name: string | null;
  producer: string | null;
  vintage: number | null;
  image: string | null;
  saqUrl: string | null;
};

type WineRow = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  vintage: number | null;
  image: string | null;
  saqUrl: string | null;
  dataSource: string | null;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL manquant. Vérifie .env.local.");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_INPUT = "./data/saq/saq_enriched_images.csv";
const inputPath = process.argv[2] || DEFAULT_INPUT;
const dryRun = process.argv.includes("--dry-run");
const overwrite = process.argv.includes("--overwrite");

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeUrl(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) return null;
  return text;
}

function normalizeSlug(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeNullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeVintage(value: unknown): number | null {
  if (value == null) return null;

  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;

  const year = Number(match[0]);
  return Number.isNaN(year) ? null : year;
}

function firstNonEmpty(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) {
      const value = row[key];
      if (String(value ?? "").trim()) return value;
    }
  }
  return null;
}

function buildSignature(input: {
  name?: string | null;
  producer?: string | null;
  vintage?: number | null;
}): string {
  const name = normalizeText(input.name);
  const producer = normalizeText(input.producer);
  const vintage = input.vintage ? String(input.vintage) : "";
  return [name, producer, vintage].join(" | ");
}

function rowHasUsefulData(row: SourceRow): boolean {
  return Boolean(row.image || row.saqUrl);
}

async function main() {
  const absolutePath = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fichier introuvable : ${absolutePath}`);
  }

  const fileContent = fs.readFileSync(absolutePath, "utf8");

  const rawRows = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, unknown>[];

  const sourceRows: SourceRow[] = rawRows.map((row) => ({
    slug: normalizeSlug(firstNonEmpty(row, ["slug"])),
    name: normalizeNullableText(firstNonEmpty(row, ["name", "nom"])),
    producer: normalizeNullableText(
      firstNonEmpty(row, ["producer", "producteur"])
    ),
    vintage: normalizeVintage(firstNonEmpty(row, ["vintage", "millesime"])),
    image: normalizeUrl(
      firstNonEmpty(row, [
        "image",
        "imageUrl",
        "imageURL",
        "image_url",
        "photo",
        "photoUrl",
      ])
    ),
    saqUrl: normalizeUrl(
      firstNonEmpty(row, [
        "saqUrl",
        "saqURL",
        "saq_url",
        "url",
        "productUrl",
        "productURL",
        "lien",
      ])
    ),
  }));

  const usefulRows = sourceRows.filter(rowHasUsefulData);

  const bySlug = new Map<string, SourceRow>();
  const bySignature = new Map<string, SourceRow>();

  for (const row of usefulRows) {
    if (row.slug) {
      bySlug.set(row.slug, row);
    }

    const signature = buildSignature({
      name: row.name,
      producer: row.producer,
      vintage: row.vintage,
    });

    if (signature !== " |  | ") {
      bySignature.set(signature, row);
    }
  }

  const wines = (await prisma.wine.findMany({
    where: {
      dataSource: "SAQ",
      color: {
        not: null,
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
      producer: true,
      vintage: true,
      image: true,
      saqUrl: true,
      dataSource: true,
    },
  })) as WineRow[];

  let matchedBySlug = 0;
  let matchedBySignature = 0;
  let updatedCount = 0;
  let imageUpdatedCount = 0;
  let saqUrlUpdatedCount = 0;
  let skippedNoMatch = 0;
  let skippedNoChange = 0;

  const unmatchedSamples: string[] = [];

  for (const wine of wines) {
    let source: SourceRow | undefined;
    let matchedBy: "slug" | "signature" | null = null;

    if (wine.slug && bySlug.has(wine.slug)) {
      source = bySlug.get(wine.slug);
      matchedBy = "slug";
    } else {
      const signature = buildSignature({
        name: wine.name,
        producer: wine.producer,
        vintage: wine.vintage,
      });

      if (bySignature.has(signature)) {
        source = bySignature.get(signature);
        matchedBy = "signature";
      }
    }

    if (!source) {
      skippedNoMatch += 1;
      if (unmatchedSamples.length < 20) {
        unmatchedSamples.push(
          `${wine.slug} | ${wine.name} | ${wine.producer ?? "—"} | ${
            wine.vintage ?? "—"
          }`
        );
      }
      continue;
    }

    if (matchedBy === "slug") matchedBySlug += 1;
    if (matchedBy === "signature") matchedBySignature += 1;

    const nextImage =
      source.image && (overwrite || !wine.image) ? source.image : wine.image;

    const nextSaqUrl =
      source.saqUrl && (overwrite || !wine.saqUrl) ? source.saqUrl : wine.saqUrl;

    const imageWillChange = (wine.image ?? null) !== (nextImage ?? null);
    const saqUrlWillChange = (wine.saqUrl ?? null) !== (nextSaqUrl ?? null);

    if (!imageWillChange && !saqUrlWillChange) {
      skippedNoChange += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.wine.update({
        where: { id: wine.id },
        data: {
          image: nextImage ?? null,
          saqUrl: nextSaqUrl ?? null,
        },
      });
    }

    updatedCount += 1;
    if (imageWillChange) imageUpdatedCount += 1;
    if (saqUrlWillChange) saqUrlUpdatedCount += 1;
  }

  const totalWithImage = await prisma.wine.count({
    where: {
      dataSource: "SAQ",
      color: { not: null },
      image: { not: null },
    },
  });

  const totalWithSaqUrl = await prisma.wine.count({
    where: {
      dataSource: "SAQ",
      color: { not: null },
      saqUrl: { not: null },
    },
  });

  console.log("");
  console.log("────────── ENRICHISSEMENT SAQ IMAGES V2 ──────────");
  console.log("Fichier source         :", absolutePath);
  console.log("Dry run                :", dryRun ? "oui" : "non");
  console.log("Overwrite              :", overwrite ? "oui" : "non");
  console.log("Lignes source utiles   :", usefulRows.length);
  console.log("Vins SAQ analysés      :", wines.length);
  console.log("Match par slug         :", matchedBySlug);
  console.log("Match par signature    :", matchedBySignature);
  console.log("Lignes mises à jour    :", updatedCount);
  console.log("Images mises à jour    :", imageUpdatedCount);
  console.log("saqUrl mis à jour      :", saqUrlUpdatedCount);
  console.log("Sans match             :", skippedNoMatch);
  console.log("Sans changement        :", skippedNoChange);
  console.log("Total image en base    :", totalWithImage);
  console.log("Total saqUrl en base   :", totalWithSaqUrl);

  if (unmatchedSamples.length > 0) {
    console.log("");
    console.log("Exemples sans match :");
    for (const sample of unmatchedSamples) {
      console.log("-", sample);
    }
  }

  console.log("──────────────────────────────────────────────────");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ Erreur enrichissement v2 :", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });