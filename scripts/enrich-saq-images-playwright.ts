import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { chromium, type Page } from "playwright";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return null;
}

function isBadSaqImage(url: string | null | undefined): boolean {
  if (!url) return true;
  const v = url.toLowerCase();

  return (
    v.includes("data:image") ||
    v.includes("logo-header-site") ||
    v.includes("/placeholder/") ||
    v.includes("/wysiwyg/") ||
    v.includes("/logo/") ||
    v.includes("sprite") ||
    v.includes("icon") ||
    v.includes("loader") ||
    v.includes("banner") ||
    !v.includes("/media/catalog/product/")
  );
}

function score(url: string): number {
  const v = url.toLowerCase();
  let s = 0;

  if (v.includes("/media/catalog/product/")) s += 100;
  if (v.includes("optimize=high")) s += 10;
  if (v.includes("format=jpeg")) s += 6;
  if (v.includes("canvas=")) s += 4;

  if (v.includes("placeholder")) s -= 1000;
  if (v.includes("logo")) s -= 1000;

  return s;
}

function pickBest(urls: string[]): string | null {
  const clean = urls
    .map((u) => normalizeImageUrl(u))
    .filter((u): u is string => !!u)
    .filter((u) => !isBadSaqImage(u))
    .sort((a, b) => score(b) - score(a));

  return clean[0] ?? null;
}

/**
 * ⚠️ IMPORTANT: aucune fonction externe ici
 */
async function extractImages(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const urls: string[] = [];

    // IMG tags
    document.querySelectorAll("img").forEach((img) => {
      const el = img as HTMLImageElement;

      const candidates = [
        el.currentSrc,
        el.src,
        el.getAttribute("src"),
        el.getAttribute("data-src"),
        el.getAttribute("data-original"),
      ];

      candidates.forEach((c) => {
        if (c && c.startsWith("http")) {
          urls.push(c);
        }
      });
    });

    // META (og:image etc.)
    document.querySelectorAll("meta").forEach((meta) => {
      const content = meta.getAttribute("content");
      if (content && content.includes("/media/catalog/product/")) {
        urls.push(content);
      }
    });

    // LD+JSON brut (regex)
    const html = document.documentElement.innerHTML;
    const matches = html.match(/https?:\/\/www\.saq\.com\/media\/catalog\/product\/[^"' )\\]+/g);
    if (matches) {
      urls.push(...matches);
    }

    return Array.from(new Set(urls));
  });
}

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const dryRun = process.argv.includes("--dry-run");
  const showBrowser = process.argv.includes("--headed");

  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

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
  });

  console.log("────────── ENRICHISSEMENT IMAGES SAQ ──────────");
  console.log(`Produits : ${rows.length}`);
  console.log("");

  const browser = await chromium.launch({
    headless: !showBrowser,
  });

  const page = await browser.newPage();

  let updated = 0;
  let noImage = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const wine = rows[i];

    try {
      await page.goto(wine.saqUrl!, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      await page.waitForTimeout(2000);

      const urls = await extractImages(page);
      const best = pickBest(urls);

      if (!best) {
        noImage++;
        console.log(`[${i + 1}] aucun visuel → ${wine.name}`);
        continue;
      }

      if (!dryRun) {
        await prisma.wine.update({
          where: { id: wine.id },
          data: { image: best },
        });
      }

      updated++;
      console.log(`[${i + 1}] OK → ${wine.name}`);
      console.log(best);
      console.log("");

      await sleep(300);
    } catch (e) {
      failed++;
      console.log(`[${i + 1}] ERREUR → ${wine.name}`);
      console.log(e);
    }
  }

  await browser.close();
  await prisma.$disconnect();

  console.log("────────── RÉSUMÉ ──────────");
  console.log("updated:", updated);
  console.log("noImage:", noImage);
  console.log("failed:", failed);
}

main();