import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

type WineRow = {
  id: string;
  name: string;
  saqUrl: string | null;
  image: string | null;
};

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = decodeHtmlEntities(url).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function extractImageFromHtml(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /"image"\s*:\s*"([^"]+)"/i,
    /"large_image"\s*:\s*"([^"]+)"/i,
    /"small_image"\s*:\s*"([^"]+)"/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const normalized = normalizeImageUrl(match?.[1]);
    if (normalized) return normalized;
  }

  return null;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        "accept-language": "fr-CA,fr;q=0.9,en;q=0.8",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        pragma: "no-cache",
        "cache-control": "no-cache",
      },
      redirect: "follow",
    });

    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

async function fetchSaqImageFromUrl(saqUrl: string): Promise<string | null> {
  const html = await fetchHtml(saqUrl);
  if (!html) return null;

  return extractImageFromHtml(html);
}

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
  const dryRun = process.argv.includes("--dry-run");

  const rows = await prisma.wine.findMany({
    where: {
      dataSource: "SAQ",
      saqUrl: { not: null },
      ...(overwrite
        ? {}
        : {
            OR: [{ image: null }, { image: "" }],
          }),
    },
    select: {
      id: true,
      name: true,
      saqUrl: true,
      image: true,
    },
    take: limit,
    orderBy: [{ image: "asc" }, { name: "asc" }],
  });

  let checked = 0;
  let updated = 0;
  let noImageFound = 0;
  let fetchFailed = 0;
  let unchanged = 0;

  console.log("────────── ENRICHISSEMENT IMAGES SAQ VIA saqUrl ──────────");
  console.log(`Produits ciblés       : ${rows.length}`);
  console.log(`Overwrite             : ${overwrite ? "oui" : "non"}`);
  console.log(`Dry run               : ${dryRun ? "oui" : "non"}`);
  console.log("");

  for (const wine of rows) {
    checked += 1;

    if (!wine.saqUrl) {
      noImageFound += 1;
      continue;
    }

    const foundImage = await fetchSaqImageFromUrl(wine.saqUrl);

    if (!foundImage) {
      noImageFound += 1;
      if (checked % 25 === 0) {
        console.log(
          `[${checked}/${rows.length}] aucun visuel trouvé pour: ${wine.name}`
        );
      }
      await sleep(400);
      continue;
    }

    if (wine.image === foundImage) {
      unchanged += 1;
      await sleep(400);
      continue;
    }

    if (!dryRun) {
      try {
        await prisma.wine.update({
          where: { id: wine.id },
          data: {
            image: foundImage,
          },
        });
      } catch {
        fetchFailed += 1;
        await sleep(400);
        continue;
      }
    }

    updated += 1;

    console.log(
      `[${checked}/${rows.length}] image mise à jour → ${wine.name}\n${foundImage}\n`
    );

    await sleep(400);
  }

  console.log("");
  console.log("────────── RÉSUMÉ ──────────");
  console.log(`Produits vérifiés      : ${checked}`);
  console.log(`Images mises à jour    : ${updated}`);
  console.log(`Sans image trouvée     : ${noImageFound}`);
  console.log(`Sans changement        : ${unchanged}`);
  console.log(`Échecs update/fetch    : ${fetchFailed}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });