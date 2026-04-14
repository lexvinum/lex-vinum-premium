export type ExtractedWine = {
  id: string;
  rawBlock: string;
  name: string;
  producer?: string;
  vintage?: string;
  price?: number;
  priceText?: string;
  color?: string;
  country?: string;
  region?: string;
  grape?: string;
  confidence?: number;
  matchedDbWineId?: string | null;
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[|]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[“”‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForCompare(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeForCompare(value).replace(/\s+/g, "-");
}

function cleanOcrArtifacts(value: string) {
  return String(value || "")
    .replace(/[＿_]+/g, " ")
    .replace(/[•·]+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function fixBrokenPriceTokens(value: string) {
  return value
    .replace(/(\d{1,3})\s*[°%]\s*(\d{2})/g, "$1.$2")
    .replace(/(\d{1,3})\s*[oO]\s*(\d{2})/g, "$1.$2")
    .replace(/(\d{1,3})\s*[,;:]\s*(\d{2})(?!\d)/g, "$1.$2");
}

function preprocessRawText(rawText: string) {
  return String(rawText || "")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/(?:^|\n)\s*B menus.*?(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*FAQ\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*GELB OKA.*?(?=\n|$)/gi, "\n")
    .replace(/BLANCS\s+ROUGES/gi, "BLANCS\nROUGES")
    .split("\n")
    .map((line) => fixBrokenPriceTokens(cleanOcrArtifacts(line)))
    .join("\n");
}

function extractVintage(text: string) {
  return text.match(/\b(19\d{2}|20\d{2})\b/)?.[1];
}

function extractPriceText(text: string) {
  const matches = [
    ...text.matchAll(/\b(\d{1,3}\.\d{2}|\d{2,3})\b/g),
  ];

  if (!matches.length) return undefined;

  const last = matches[matches.length - 1][0];
  const numeric = Number(last);

  if (!Number.isFinite(numeric)) return undefined;
  if (numeric < 8 || numeric > 1000) return undefined;

  return last;
}

function extractPrice(text: string) {
  const priceText = extractPriceText(text);
  if (!priceText) return undefined;

  const numeric = Number(priceText);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function guessColor(text: string) {
  const t = normalizeForCompare(text);

  if (/\brouge\b|\bred\b/.test(t)) return "rouge";
  if (/\bblanc\b|\bwhite\b|\bpinot grigio\b|\bpinot gris\b/.test(t)) return "blanc";
  if (/\brose\b|\brosé\b/.test(t)) return "rosé";
  if (/\borange\b/.test(t)) return "orange";

  if (
    /\bchablis\b|\bsancerre\b|\bchardonnay\b|\bsauvignon blanc\b|\briesling\b|\bchenin\b|\bpinot grigio\b/.test(
      t,
    )
  ) {
    return "blanc";
  }

  if (
    /\bpinot noir\b|\bmerlot\b|\bcabernet\b|\bsyrah\b|\bgrenache\b|\bmalbec\b|\bnebbiolo\b|\btempranillo\b|\brefosco\b/.test(
      t,
    )
  ) {
    return "rouge";
  }

  return undefined;
}

function guessCountry(text: string) {
  const t = normalizeForCompare(text);

  if (/\bfrance\b|\bbourgogne\b|\bbordeaux\b|\bloire\b|\balsace\b|\brhone\b|\blandes\b/.test(t)) {
    return "France";
  }

  if (/\bitalie\b|\bitaly\b|\bsiciliane\b|\bsicile\b|\bveneto\b|\bmarche\b/.test(t)) {
    return "Italie";
  }

  if (/\bespagne\b|\bspain\b|\bcastilla y leon\b/.test(t)) {
    return "Espagne";
  }

  if (/\ballemagne\b|\bgermany\b|\bpfalz\b|\blandwein\b/.test(t)) {
    return "Allemagne";
  }

  return undefined;
}

function guessRegion(text: string) {
  const t = normalizeForCompare(text);

  const regionMap: Array<[RegExp, string]> = [
    [/\bsicile\b|\bsiciliane\b/, "Sicile"],
    [/\bveneto\b/, "Veneto"],
    [/\bmarche\b/, "Marche"],
    [/\bpfalz\b/, "Pfalz"],
    [/\bcastilla y leon\b/, "Castilla y León"],
    [/\blandes\b/, "Landes"],
    [/\bc d rhone\b|\bcotes du rhone\b|\brhone\b/, "Rhône"],
  ];

  for (const [pattern, label] of regionMap) {
    if (pattern.test(t)) return label;
  }

  return undefined;
}

function guessGrape(text: string) {
  const t = normalizeForCompare(text);

  const grapes = [
    "cabernet sauvignon",
    "merlot",
    "pinot noir",
    "syrah",
    "grenache",
    "mourvedre",
    "tempranillo",
    "nebbiolo",
    "sangiovese",
    "malbec",
    "gamay",
    "chardonnay",
    "sauvignon blanc",
    "chenin blanc",
    "riesling",
    "viognier",
    "pinot gris",
    "pinot grigio",
    "refosco",
  ];

  const found = grapes.find((grape) => t.includes(grape));
  if (!found) return undefined;

  return found
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function looksLikeSectionHeader(line: string) {
  const t = normalizeForCompare(line);

  return [
    "blancs",
    "rouges",
    "roses",
    "champagnes",
    "mousseux",
    "vin au verre",
    "au verre",
    "bouteille",
    "importation privee",
  ].some((item) => t === item);
}

function looksLikeNoise(line: string) {
  const t = normalizeForCompare(line);

  if (!t) return true;
  if (t.length < 3) return true;

  return [
    "menus",
    "certificats",
    "cadeau",
    "gateaux",
    "barbara",
    "faq",
    "oka",
    "cocktail",
    "cocktails",
    "biere",
    "beer",
    "digestif",
    "dessert",
    "cafe",
    "cafes",
    "taxes",
    "pourboire",
    "liqueur",
    "spiritueux",
    "sans alcool",
    "eau",
    "the",
  ].some((item) => t.includes(item));
}

function looksLikeWineRelevantLine(line: string) {
  const t = normalizeForCompare(line);

  if (looksLikeNoise(t)) return false;
  if (looksLikeSectionHeader(t)) return true;

  const hasVintage = /\b(19\d{2}|20\d{2})\b/.test(t);
  const hasPrice = /\b(\d{1,3}\.\d{2}|\d{2,3})\b/.test(t);

  const wineWords = [
    "domaine",
    "chateau",
    "tenuta",
    "villa",
    "clos",
    "pinot",
    "grigio",
    "refosco",
    "landwein",
    "rosso",
    "siciliane",
    "veneto",
    "marche",
    "pfalz",
    "castilla",
    "rhone",
    "mourres",
    "noir",
  ];

  const hasWineWord = wineWords.some((word) => t.includes(word));
  return hasVintage || hasPrice || hasWineWord;
}

function splitLinesThatContainTwoWines(lines: string[]) {
  const result: string[] = [];

  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned) continue;

    const matches = [...cleaned.matchAll(/\b(19\d{2}|20\d{2})\b/g)];

    if (matches.length >= 2) {
      let start = 0;

      for (let i = 1; i < matches.length; i += 1) {
        const nextIndex = matches[i].index ?? 0;
        const cutWindowStart = Math.max(0, nextIndex - 30);
        const cutChunk = cleaned.slice(cutWindowStart, nextIndex);
        const splitPoint =
          cutWindowStart + Math.max(cutChunk.lastIndexOf("  "), cutChunk.lastIndexOf("_"));

        if (splitPoint > start + 8) {
          result.push(cleaned.slice(start, splitPoint).trim());
          start = splitPoint;
        }
      }

      result.push(cleaned.slice(start).trim());
      continue;
    }

    result.push(cleaned);
  }

  return result;
}

function buildBlocksFromOcr(rawText: string) {
  const prepared = preprocessRawText(rawText);

  const lines = prepared
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !looksLikeNoise(line));

  const blocks: string[] = [];
  let current = "";

  for (const line of lines) {
    const clean = line.replace(/[＿_]+/g, " ").trim();

    const hasPrice = /\b(\d{1,3}\.\d{2}|\d{2,3})\b/.test(clean);

    if (!current) {
      current = clean;
    } else {
      current += " " + clean;
    }

    // 🔥 RÈGLE CLÉ : prix = fin du vin
    if (hasPrice) {
      blocks.push(current.trim());
      current = "";
    }
  }

  if (current) {
    blocks.push(current.trim());
  }

  return blocks;
}

function cleanWineName(block: string) {
  const content = block.replace(/\[section:[^\]]+\]/gi, "").trim();

  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const cleanedLines = lines.map((line) =>
    line
      .replace(/\b(19\d{2}|20\d{2})\b/g, " ")
      .replace(/\b(\d{1,3}\.\d{2}|\d{2,3})\b/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  return cleanedLines.join(" ").replace(/\s+/g, " ").trim();
}

function extractProducer(block: string, name: string) {
  const lines = block
    .replace(/\[section:[^\]]+\]/gi, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const producerLine = lines.find((line) =>
    /\bdomaine\b|\bchateau\b|\btenuta\b|\bvilla\b|\bclos\b/.test(normalizeForCompare(line)),
  );

  if (!producerLine) return undefined;
  if (normalizeForCompare(producerLine) === normalizeForCompare(name)) return undefined;

  return producerLine;
}

function inferColorFromSection(block: string) {
  const section = block.match(/\[section:([^\]]+)\]/i)?.[1]?.toLowerCase() || "";

  if (section.includes("rouge")) return "rouge";
  if (section.includes("blanc")) return "blanc";
  if (section.includes("rose")) return "rosé";
  if (section.includes("champagne") || section.includes("mousseux")) return "blanc";

  return undefined;
}

function isProbablyValidWineName(name: string) {
  const text = normalizeForCompare(name);

  if (!text) return false;
  if (text.length < 5) return false;
  if (text.split(" ").length < 2) return false;
  if (/^\d+$/.test(text)) return false;
  if (looksLikeNoise(text)) return false;

  const banned = [
    "blancs",
    "rouges",
    "roses",
    "champagnes",
    "mousseux",
    "vin au verre",
    "bouteille",
  ];

  if (banned.includes(text)) return false;

  return true;
}

function splitLineIntoWineChunks(line: string): string[] {
  const cleaned = line
    .replace(/[＿_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split UNIQUEMENT sur millésime
  const parts = cleaned.split(
    /(?=\b(19\d{2}|20\d{2})\b)/g
  );

  const rebuilt: string[] = [];

  for (let i = 0; i < parts.length; i += 2) {
    const left = parts[i] || "";
    const year = parts[i + 1] || "";

    const combined = `${left} ${year}`.trim();

    if (combined.length > 10) {
      rebuilt.push(combined);
    }
  }

  return rebuilt;
}

function isGarbageName(name: string) {
  const t = normalizeForCompare(name);

  const badStarts = [
    "casa",
    "noir",
    "sable",
    "rosso",
    "vino",
  ];

  if (badStarts.includes(t.split(" ")[0])) return true;

  return false;
}

export function extractWinesFromOcr(rawText: string): ExtractedWine[] {
  const blocks = buildBlocksFromOcr(rawText);
  const wines: ExtractedWine[] = [];

  for (const block of blocks) {
    const name = cleanWineName(block);

    if (!isProbablyValidWineName(name)) continue;
    if (isGarbageName(name)) continue;

    const producer = extractProducer(block, name);
    const vintage = extractVintage(block);
    const price = extractPrice(block);
    const priceText = extractPriceText(block);
    const color = inferColorFromSection(block) || guessColor(block);
    const region = guessRegion(block);
    const country = guessCountry(block);
    const grape = guessGrape(block);

    let confidence = 35;
    if (vintage) confidence += 15;
    if (typeof price === "number") confidence += 20;
    if (producer) confidence += 10;
    if (color) confidence += 5;
    if (region) confidence += 5;
    if (country) confidence += 5;
    if (grape) confidence += 5;

    wines.push({
      id: slugify(`${name}-${vintage || ""}-${priceText || ""}-${wines.length}`),
      rawBlock: block,
      name,
      producer,
      vintage,
      price,
      priceText,
      color,
      region,
      country,
      grape,
      confidence: Math.min(confidence, 100),
      matchedDbWineId: null,
    });
  }

  const unique = new Map<string, ExtractedWine>();

  for (const wine of wines) {
    const key = normalizeForCompare(`${wine.name} ${wine.vintage || ""} ${wine.priceText || ""}`);
    if (!unique.has(key)) unique.set(key, wine);
  }

  return [...unique.values()];
}