import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

type CsvRow = {
  nom: string | null;
  pays: string | null;
  region: string | null;
  annee: number | null;
  appellationOrigine: string | null;
  designationReglementee: string | null;
  cepages: string | null;
  producteur: string | null;
  couleur: string | null;
  prix: number | null;
  lienSaq: string | null;
  codeSaq: string | null;
};

type WineRow = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  vintage: number | null;
  color: string | null;
  price: number | null;
  saqUrl: string | null;
  image: string | null;
  saqCode: string | null;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL manquant. Vérifie .env.local et lance la commande avec DOTENV_CONFIG_PATH=.env.local."
  );
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const INPUT_PATH = process.argv[2] || "./data/saq-wines.csv";
const DRY_RUN = process.argv.includes("--dry-run");
const OVERWRITE = process.argv.includes("--overwrite");
const LIMIT_ARG = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split("=")[1]) : null;

const VALID_WINE_COLORS = new Set([
  "rouge",
  "blanc",
  "rose",
  "rosé",
  "mousseux",
  "effervescent",
  "orange",
]);

const EXCLUDED_NAME_TERMS = [
  "amaretto",
  "biere",
  "bière",
  "ipa",
  "lager",
  "stout",
  "porter",
  "ale",
  "cidre",
  "hydromel",
  "cooler",
  "limonade",
  "sour",
  "gin",
  "vodka",
  "rhum",
  "rum",
  "whisky",
  "whiskey",
  "liqueur",
  "creme",
  "crème",
  "tequila",
  "mezcal",
  "brandy",
  "cognac",
  "aperitif",
  "apéritif",
  "cocktail",
  "hard seltzer",
  "microbrasserie",
  "punch",
  "spritz",
];

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeNullableText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeUrl(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) return null;
  return text;
}

function normalizeNumber(value: unknown): number | null {
  if (value == null) return null;
  const raw = String(value).trim().replace(",", ".");
  if (!raw) return null;
  const num = Number(raw);
  return Number.isNaN(num) ? null : num;
}

function normalizeYear(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/\b(19|20)\d{2}\b/);
  if (!match) return null;
  const year = Number(match[0]);
  return Number.isNaN(year) ? null : year;
}

function buildSignature(input: {
  name?: string | null;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  vintage?: number | null;
  color?: string | null;
}): string {
  return [
    normalizeText(input.name),
    normalizeText(input.producer),
    normalizeText(input.country),
    normalizeText(input.region),
    input.vintage ? String(input.vintage) : "",
    normalizeText(input.color),
  ].join(" | ");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-CA,fr;q=0.9,en;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function extractImageUrl(html: string): string | null {
  const patterns = [
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /<meta\s+content="([^"]+)"\s+property="og:image"/i,
    /"image"\s*:\s*"([^"]+)"/i,
    /"imageUrl"\s*:\s*"([^"]+)"/i,
    /https?:\/\/[^"'\\\s>]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'\\\s>]*)?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const candidate = decodeHtmlEntities(match[1] ?? match[0]).trim();
    if (/^https?:\/\//i.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function fetchImageFromSaqPage(url: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(url, 8000);

    if (!response.ok) return null;

    const html = await response.text();
    return extractImageUrl(html);
  } catch {
    return null;
  }
}

function hasValidWineColor(value: string | null | undefined): boolean {
  const color = normalizeText(value);
  return VALID_WINE_COLORS.has(color);
}

function looksLikeNonWineName(value: string | null | undefined): boolean {
  const name = normalizeText(value);
  return EXCLUDED_NAME_TERMS.some((term) => name.includes(normalizeText(term)));
}

async function main() {
  const absolutePath = path.resolve(process.cwd(), INPUT_PATH);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fichier introuvable : ${absolutePath}`);
  }

  const csvContent = fs.readFileSync(absolutePath, "utf8");

  const rawRows = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  }) as Record<string, unknown>[];

  const sourceRows: CsvRow[] = rawRows.map((row) => ({
    nom: normalizeNullableText(row["nom"]),
    pays: normalizeNullableText(row["pays"]),
    region: normalizeNullableText(row["région"]),
    annee: normalizeYear(row["année"]),
    appellationOrigine: normalizeNullableText(row["appellation d'origine"]),
    designationReglementee: normalizeNullableText(row["désignation réglementée"]),
    cepages: normalizeNullableText(row["cépages"]),
    producteur: normalizeNullableText(row["producteur"]),
    couleur: normalizeNullableText(row["couleur"]),
    prix: normalizeNumber(row["prix"]),
    lienSaq: normalizeUrl(row["lien saq"]),
    codeSaq: normalizeNullableText(row["code saq"]),
  }));

  const withSaqLinks = sourceRows.filter((row) => {
    if (!row.lienSaq) return false;
    if (!hasValidWineColor(row.couleur)) return false;
    if (looksLikeNonWineName(row.nom)) return false;

    const hasWineSignal =
      Boolean(row.appellationOrigine) ||
      Boolean(row.designationReglementee) ||
      Boolean(row.cepages);

    return hasWineSignal;
  });

  const byCodeSaq = new Map<string, CsvRow>();
  const bySignature = new Map<string, CsvRow>();

  for (const row of withSaqLinks) {
    if (row.codeSaq) {
      byCodeSaq.set(row.codeSaq, row);
    }

    const signature = buildSignature({
      name: row.nom,
      producer: row.producteur,
      country: row.pays,
      region: row.region,
      vintage: row.annee,
      color: row.couleur,
    });

    bySignature.set(signature, row);
  }

  const wines = (await prisma.wine.findMany({
    where: {
      dataSource: "SAQ",
      color: {
        in: ["Rouge", "Blanc", "Rosé", "Rose", "Mousseux", "Effervescent", "Orange"],
      },
      NOT: [
        { name: { contains: "amaretto", mode: "insensitive" } },
        { name: { contains: "bière", mode: "insensitive" } },
        { name: { contains: "biere", mode: "insensitive" } },
        { name: { contains: "ipa", mode: "insensitive" } },
        { name: { contains: "cidre", mode: "insensitive" } },
        { name: { contains: "hydromel", mode: "insensitive" } },
        { name: { contains: "limonade", mode: "insensitive" } },
        { name: { contains: "gin", mode: "insensitive" } },
        { name: { contains: "vodka", mode: "insensitive" } },
        { name: { contains: "whisky", mode: "insensitive" } },
        { name: { contains: "whiskey", mode: "insensitive" } },
        { name: { contains: "liqueur", mode: "insensitive" } },
        { name: { contains: "tequila", mode: "insensitive" } },
        { name: { contains: "mezcal", mode: "insensitive" } },
        { name: { contains: "rhum", mode: "insensitive" } },
        { name: { contains: "rum", mode: "insensitive" } },
        { name: { contains: "cocktail", mode: "insensitive" } },
        { name: { contains: "cooler", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      producer: true,
      country: true,
      region: true,
      vintage: true,
      color: true,
      price: true,
      saqUrl: true,
      image: true,
      saqCode: true,
    },
  })) as WineRow[];

  const targetWines = LIMIT ? wines.slice(0, LIMIT) : wines;

  let matchedByCode = 0;
  let matchedBySignature = 0;
  let updatedSaqUrl = 0;
  let updatedImage = 0;
  let noMatch = 0;
  let noImageFound = 0;
  let unchanged = 0;

  console.log(`Début du traitement de ${targetWines.length} vins...`);

  for (let index = 0; index < targetWines.length; index += 1) {
    const wine = targetWines[index];
    const currentIndex = index + 1;

    if (currentIndex === 1 || currentIndex % 10 === 0) {
      console.log(`→ Traitement ${currentIndex}/${targetWines.length}: ${wine.slug}`);
    }

    let source: CsvRow | undefined;
    let matchedBy: "code" | "signature" | null = null;

    if (wine.saqCode && byCodeSaq.has(String(wine.saqCode))) {
      source = byCodeSaq.get(String(wine.saqCode));
      matchedBy = "code";
    } else {
      const signature = buildSignature({
        name: wine.name,
        producer: wine.producer,
        country: wine.country,
        region: wine.region,
        vintage: wine.vintage,
        color: wine.color,
      });

      if (bySignature.has(signature)) {
        source = bySignature.get(signature);
        matchedBy = "signature";
      }
    }

    if (!source?.lienSaq) {
      noMatch += 1;
      continue;
    }

    if (matchedBy === "code") matchedByCode += 1;
    if (matchedBy === "signature") matchedBySignature += 1;

    let nextSaqUrl = wine.saqUrl;
    if (source.lienSaq && (OVERWRITE || !wine.saqUrl)) {
      nextSaqUrl = source.lienSaq;
    }

    let nextImage = wine.image;

    if (!DRY_RUN && nextSaqUrl && (OVERWRITE || !wine.image)) {
      const fetchedImage = await fetchImageFromSaqPage(nextSaqUrl);

      if (fetchedImage) {
        nextImage = fetchedImage;
      } else {
        noImageFound += 1;
      }

      await sleep(250);
    }

    const saqUrlWillChange = (wine.saqUrl ?? null) !== (nextSaqUrl ?? null);
    const imageWillChange = (wine.image ?? null) !== (nextImage ?? null);

    if (!saqUrlWillChange && !imageWillChange) {
      unchanged += 1;
      continue;
    }

    if (!DRY_RUN) {
      await prisma.wine.update({
        where: { id: wine.id },
        data: {
          saqUrl: nextSaqUrl ?? null,
          image: nextImage ?? null,
        },
      });
    }

    if (saqUrlWillChange) updatedSaqUrl += 1;
    if (imageWillChange) updatedImage += 1;
  }

  const totalWithImage = await prisma.wine.count({
    where: {
      dataSource: "SAQ",
      color: {
        in: ["Rouge", "Blanc", "Rosé", "Rose", "Mousseux", "Effervescent", "Orange"],
      },
      image: { not: null },
    },
  });

  const totalWithSaqUrl = await prisma.wine.count({
    where: {
      dataSource: "SAQ",
      color: {
        in: ["Rouge", "Blanc", "Rosé", "Rose", "Mousseux", "Effervescent", "Orange"],
      },
      saqUrl: { not: null },
    },
  });

  console.log("");
  console.log("────────── ENRICHISSEMENT SAQ LINKS + IMAGES V2 ──────────");
  console.log("Fichier source         :", absolutePath);
  console.log("Dry run                :", DRY_RUN ? "oui" : "non");
  console.log("Overwrite              :", OVERWRITE ? "oui" : "non");
  console.log("Limite                 :", LIMIT ?? "aucune");
  console.log("Lignes CSV avec lien   :", withSaqLinks.length);
  console.log("Vins analysés          :", targetWines.length);
  console.log("Match code SAQ         :", matchedByCode);
  console.log("Match signature        :", matchedBySignature);
  console.log("saqUrl mis à jour      :", updatedSaqUrl);
  console.log("Images mises à jour    :", updatedImage);
  console.log("Sans match             :", noMatch);
  console.log("Image non trouvée      :", noImageFound);
  console.log("Sans changement        :", unchanged);
  console.log("Total image en base    :", totalWithImage);
  console.log("Total saqUrl en base   :", totalWithSaqUrl);
  console.log("──────────────────────────────────────────────────────────");
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