import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

type SeedWine = {
  slug: string;
  name: string;
  producer?: string;
  country?: string;
  region?: string;
  grape?: string;
  color?: string;
  style?: string;
  price?: number;
  vintage?: string;
  image?: string;
  aromasJson?: string;
  tagsJson?: string;
  description?: string;
  isQuebec?: boolean;
  featured?: boolean;
  body?: string;
  acidity?: string;
  tannin?: string;
  minerality?: string;
  pairingJson?: string;
  serving?: string;
  temperature?: string;
  cellar?: string;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

function cleanString(value?: string | null) {
  if (!value) return undefined;
  const cleaned = value.trim();
  return cleaned.length ? cleaned : undefined;
}

function normalizeWine(wine: SeedWine): SeedWine {
  return {
    slug: cleanString(wine.slug)?.toLowerCase() || "",
    name: cleanString(wine.name) || "",
    producer: cleanString(wine.producer),
    country: cleanString(wine.country),
    region: cleanString(wine.region),
    grape: cleanString(wine.grape),
    color: cleanString(wine.color),
    style: cleanString(wine.style),
    price:
      typeof wine.price === "number" && Number.isFinite(wine.price)
        ? wine.price
        : undefined,
    vintage: cleanString(wine.vintage),
    image: cleanString(wine.image),
    aromasJson: cleanString(wine.aromasJson),
    tagsJson: cleanString(wine.tagsJson),
    description: cleanString(wine.description),
    isQuebec: Boolean(wine.isQuebec),
    featured: Boolean(wine.featured),
    body: cleanString(wine.body),
    acidity: cleanString(wine.acidity),
    tannin: cleanString(wine.tannin),
    minerality: cleanString(wine.minerality),
    pairingJson: cleanString(wine.pairingJson),
    serving: cleanString(wine.serving),
    temperature: cleanString(wine.temperature),
    cellar: cleanString(wine.cellar),
  };
}

async function main() {
  const filePath = path.join(process.cwd(), "prisma", "data", "wines.json");
  const raw = await fs.readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw) as SeedWine[];

  if (!Array.isArray(parsed)) {
    throw new Error("wines.json doit contenir un tableau JSON");
  }

  const wines = parsed
    .map(normalizeWine)
    .filter((wine) => wine.slug && wine.name);

  if (wines.length === 0) {
    throw new Error("Aucun vin valide à importer");
  }

  await prisma.wine.createMany({
    data: wines,
    skipDuplicates: true,
  });

  console.log(`✅ Import terminé: ${wines.length} vins traités`);
}

main()
  .catch((error) => {
    console.error("❌ Import échoué:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });