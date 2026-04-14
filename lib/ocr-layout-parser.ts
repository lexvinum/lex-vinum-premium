type OcrBox =
  | {
      x0?: number;
      y0?: number;
      x1?: number;
      y1?: number;
      left?: number;
      top?: number;
      width?: number;
      height?: number;
    }
  | undefined;

export type OcrLayoutLine = {
  text?: string;
  bbox?: OcrBox;
  box?: OcrBox;
  words?: Array<{ text?: string }>;
};

export type WineCandidate = {
  id: string;
  rawText: string;
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
};

type BuildArgs = {
  extractedText?: string;
  lines?: OcrLayoutLine[];
};

type NormalizedLine = {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
};

type LineBlock = {
  lines: NormalizedLine[];
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};

type PriceAnchor = {
  text: string;
  price: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

const SECTION_HEADERS = [
  "vin au verre",
  "vins au verre",
  "blanc",
  "blancs",
  "rouge",
  "rouges",
  "rosé",
  "rosés",
  "orange",
  "champagne",
  "bulles",
  "effervescent",
  "effervescents",
  "dessert",
  "fortifié",
  "fortifiés",
];

const NON_WINE_GARBAGE = [
  "menu",
  "cocktail",
  "cocktails",
  "bière",
  "bières",
  "beer",
  "spiritueux",
  "mocktail",
  "digestif",
  "liqueur",
  "whisky",
  "vodka",
  "gin",
  "rhum",
  "tequila",
  "saké",
  "sake",
  "café",
  "espresso",
  "desserts",
  "taxes",
  "pourboire",
  "merci",
];

const GRAPES = [
  "cabernet sauvignon",
  "cabernet franc",
  "merlot",
  "pinot noir",
  "gamay",
  "syrah",
  "shiraz",
  "grenache",
  "mourvèdre",
  "tempranillo",
  "sangiovese",
  "nebbiolo",
  "barbera",
  "malbec",
  "zinfandel",
  "carignan",
  "cinsault",
  "pinot gris",
  "pinot grigio",
  "chardonnay",
  "sauvignon blanc",
  "chenin",
  "chenin blanc",
  "riesling",
  "viognier",
  "aligoté",
  "melon de bourgogne",
  "gewurztraminer",
  "semillon",
  "sémillon",
  "verdicchio",
  "vermentino",
  "grüner veltliner",
  "grenache blanc",
  "muscat",
];

const COUNTRIES = [
  "france",
  "italie",
  "italy",
  "espagne",
  "spain",
  "portugal",
  "allemagne",
  "germany",
  "autriche",
  "austria",
  "états-unis",
  "etats-unis",
  "usa",
  "argentine",
  "argentina",
  "chili",
  "australie",
  "australia",
  "nouvelle-zélande",
  "new zealand",
  "afrique du sud",
  "south africa",
];

const REGIONS = [
  "bourgogne",
  "burgundy",
  "bordeaux",
  "beaujolais",
  "vallée du rhône",
  "vallee du rhone",
  "rhône",
  "rhone",
  "loire",
  "alsace",
  "champagne",
  "muscadet",
  "chablis",
  "sancerre",
  "pouilly-fumé",
  "pouilly fume",
  "côte-rôtie",
  "cote-rotie",
  "hermitage",
  "cornas",
  "gigondas",
  "châteauneuf-du-pape",
  "chateauneuf-du-pape",
  "toscane",
  "tuscany",
  "piémont",
  "piedmont",
  "sicile",
  "sicily",
  "rioja",
  "ribera del duero",
  "priorat",
  "douro",
  "dao",
  "alentejo",
  "mosel",
  "wachau",
  "napa",
  "sonoma",
  "mendoza",
  "maipo",
  "barossa",
  "marlborough",
  "oregon",
];

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `wine_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function safeText(value: unknown) {
  return String(value || "")
    .replace(/[|¦]/g, " ")
    .replace(/[•·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLine(raw: OcrLayoutLine): NormalizedLine | null {
  const text =
    safeText(raw.text) ||
    safeText(raw.words?.map((w) => w.text || "").join(" "));

  if (!text) return null;

  const b = raw.bbox || raw.box || {};
  const left = Number(b.left ?? b.x0 ?? 0);
  const top = Number(b.top ?? b.y0 ?? 0);
  const right = Number(
    b.x1 ??
      (typeof b.left === "number" && typeof b.width === "number"
        ? b.left + b.width
        : left + 100)
  );
  const bottom = Number(
    b.y1 ??
      (typeof b.top === "number" && typeof b.height === "number"
        ? b.top + b.height
        : top + 20)
  );

  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);

  return {
    text,
    left,
    right,
    top,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  };
}

function cleanOcrText(text: string) {
  return text
    .replace(/[“”"]/g, "")
    .replace(/[‘’']/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeGarbage(text: string) {
  const t = text.toLowerCase();
  return NON_WINE_GARBAGE.some((w) => t.includes(w));
}

function looksLikeSectionHeader(text: string) {
  const t = text.toLowerCase().trim();
  if (t.length > 40) return false;
  return SECTION_HEADERS.some((w) => t.includes(w));
}

function detectColorFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\brosé?s?\b/.test(t)) return "rosé";
  if (/\bblancs?\b/.test(t)) return "blanc";
  if (/\brouges?\b/.test(t)) return "rouge";
  if (/\borange\b/.test(t)) return "orange";
  if (/\bchampagne\b|\bbulles?\b|\beffervesc/.test(t)) return "effervescent";
  return undefined;
}

function getVintage(text: string): string | undefined {
  const match = text.match(/\b(19\d{2}|20\d{2})\b/);
  return match?.[1];
}

function normalizePriceToken(token: string) {
  return token
    .replace(/[Oo]/g, "0")
    .replace(/[Il|]/g, "1")
    .replace(/[Ss]/g, "5")
    .replace(/[B]/g, "8")
    .replace(/[,]/g, ".")
    .replace(/\s+/g, "");
}

function extractPrice(text: string): { price?: number; priceText?: string } {
  const normalized = text.replace(/\$/g, " $ ");
  const matches = [
    ...normalized.matchAll(
      /(?<!\d)(\d{1,3}(?:[.,]\d{1,2})?)\s*(\$|cad)?(?!\d)/gi
    ),
  ];

  const candidates = matches
    .map((m) => normalizePriceToken(m[1]))
    .map((raw) => {
      const n = Number(raw);
      return Number.isFinite(n) ? n : null;
    })
    .filter((n): n is number => n !== null)
    .filter((n) => n >= 5 && n <= 1000);

  if (!candidates.length) return {};

  const price = candidates[candidates.length - 1];
  return {
    price,
    priceText: String(price),
  };
}

function isRightAlignedPrice(line: NormalizedLine, maxX: number) {
  const hasPrice = extractPrice(line.text).price !== undefined;

  if (!hasPrice) return false;

  // proche du bord droit (typique des prix sur une carte)
  return line.right > maxX * 0.75;
}

function removeLeadingNoiseFromRawText(rawText: string, name: string) {
  const cleaned = rawText.trim();
  if (!cleaned || !name) return rawText;

  const words = cleaned.split(/\s+/);

  // 🔥 CAS 1 — préfixe OCR cassé type SAIN / OLTO / NITE / OIRS
  if (
    words.length >= 2 &&
    /^[A-ZÀ-Ÿ]{3,5}$/.test(words[0]) &&
    !cleaned.toLowerCase().includes(name.toLowerCase())
  ) {
    return words.slice(1).join(" ");
  }

  // 🔥 CAS 2 — si le nom n’est pas dans le texte → on le préfixe
  if (!cleaned.toLowerCase().includes(name.toLowerCase())) {
    return `${name} • ${cleaned}`;
  }

  return cleaned;
}

function extractPriceAnchors(lines: NormalizedLine[]): PriceAnchor[] {
  return lines
    .map((line) => {
      const priceInfo = extractPrice(line.text);

      if (priceInfo.price === undefined) return null;

      return {
        text: line.text,
        price: priceInfo.price,
        left: line.left,
        right: line.right,
        top: line.top,
        bottom: line.bottom,
        centerX: line.centerX,
        centerY: line.centerY,
      };
    })
    .filter((item): item is PriceAnchor => Boolean(item));
}

function scorePriceAttachment(block: LineBlock, price: PriceAnchor) {
  const blockCenterY = (block.top + block.bottom) / 2;
  const verticalDistance = Math.abs(price.centerY - blockCenterY);
  const horizontalDistance = Math.max(0, price.left - block.right);

  let score = 100;

  score -= verticalDistance * 1.8;
  score -= horizontalDistance * 0.15;

  if (price.left < block.right) score -= 35;
  if (price.centerY < block.top - 20) score -= 25;
  if (price.centerY > block.bottom + 35) score -= 25;

  return score;
}

function findBestPriceForBlock(block: LineBlock, prices: PriceAnchor[]) {
  const candidates = prices
    .map((price) => ({
      price,
      score: scorePriceAttachment(block, price),
    }))
    .filter((item) => item.score > 20)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.price;
}

function isValidWineCandidate(name: string) {
  const cleanedName = name.replace(/\s+/g, " ").trim();
  const words = cleanedName.split(/\s+/).filter(Boolean);

  if (!cleanedName) return false;
  if (cleanedName.length < 5) return false;
  if (words.length === 1 && words[0].length < 6) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(cleanedName)) return false;

  const weirdChars = cleanedName.replace(/[A-Za-zÀ-ÿ0-9\s'’\-\.]/g, "");
  if (weirdChars.length >= 4) return false;

  if (
    /^(vin|vino|rouge|rouges|blanc|blancs|rosé|rosés|orange|bulles|champagne|mousseux)$/i.test(
      cleanedName
    )
  ) {
    return false;
  }

  if (/^[A-ZÀ-Ÿ]{2,5}$/.test(cleanedName)) return false;

  return true;
}

function hasWineLikeShape(text: string) {
  const t = text.toLowerCase();

  if (looksLikeGarbage(t)) return false;

  const hasVintage = /\b(19\d{2}|20\d{2})\b/.test(t);
  const hasPrice = extractPrice(t).price !== undefined;
  const manyWords = t.split(/\s+/).length >= 2;
  const hasLetters = /[a-zà-ÿ]/i.test(t);
  const hasCapsPattern = /[A-ZÀ-Ý][a-zà-ÿ]+/.test(text);
  const hasRegion = REGIONS.some((r) => t.includes(r));
  const hasCountry = COUNTRIES.some((c) => t.includes(c));
  const hasGrape = GRAPES.some((g) => t.includes(g));

  if (!hasLetters || !manyWords) return false;

  if (hasVintage || hasPrice || hasRegion || hasCountry || hasGrape) return true;
  if (hasCapsPattern && t.length >= 8) return true;

  return false;
}

function splitColumns(lines: NormalizedLine[]): NormalizedLine[][] {
  if (lines.length <= 4) return [lines];

  const minX = Math.min(...lines.map((l) => l.left));
  const maxX = Math.max(...lines.map((l) => l.right));
  const width = maxX - minX;
  const center = minX + width / 2;

  const leftSide = lines.filter((l) => l.centerX < center - width * 0.08);
  const rightSide = lines.filter((l) => l.centerX > center + width * 0.08);

  if (leftSide.length >= 3 && rightSide.length >= 3) {
    return [
      leftSide.sort((a, b) => a.top - b.top),
      rightSide.sort((a, b) => a.top - b.top),
    ];
  }

  return [lines.sort((a, b) => a.top - b.top)];
}

function looksLikeNewWineStart(text: string) {
  const t = text.trim();

  if (/^[A-ZÀ-Ý][A-Za-zÀ-ÿ]+/.test(t)) return true;
  if (GRAPES.some((g) => t.toLowerCase().includes(g))) return true;
  if (REGIONS.some((r) => t.toLowerCase().includes(r))) return true;

  return false;
}

function countPrices(text: string) {
  return [...text.matchAll(/\d{1,3}(?:[.,]\d{1,2})?/g)]
    .map((m) => Number(m[0]))
    .filter((n) => n >= 5 && n <= 500).length;
}

function looksLikeTwoWineNames(text: string) {
  const matches = text.match(/[A-ZÀ-Ý]{3,}/g);
  return Boolean(matches && matches.length >= 2);
}

function shouldMergeLines(a: NormalizedLine, b: NormalizedLine) {
  const combinedText = `${a.text} ${b.text}`;
  const combinedPriceCount = countPrices(combinedText);
  const maxX = Math.max(a.right, b.right);

  // si la ligne suivante est surtout un prix à droite,
  // on la garde avec le bloc actuel
  if (isRightAlignedPrice(b, maxX)) return true;

  // si les deux lignes ressemblent à deux débuts de vins distincts,
  // on ne merge pas
  if (looksLikeNewWineStart(a.text) && looksLikeNewWineStart(b.text)) {
    return false;
  }

  // bloc trop long = souvent mélange de plusieurs vins
  if (combinedText.length > 120) return false;

  if (combinedPriceCount >= 2) return false;

  const verticalGap = b.top - a.bottom;
  if (verticalGap > 28) return false;

  const aHasPrice = extractPrice(a.text).price !== undefined;
  const bHasPrice = extractPrice(b.text).price !== undefined;
  const bStartsNewWine = looksLikeNewWineStart(b.text);

  if (bStartsNewWine && aHasPrice) return false;
  if (aHasPrice && bHasPrice) return false;
  if (b.text.length > 45) return false;
  if (looksLikeTwoWineNames(combinedText)) return false;

  return true;
}

function makeBlock(lines: NormalizedLine[]): LineBlock {
  return {
    lines,
    text: cleanOcrText(lines.map((l) => l.text).join(" ")),
    left: Math.min(...lines.map((l) => l.left)),
    right: Math.max(...lines.map((l) => l.right)),
    top: Math.min(...lines.map((l) => l.top)),
    bottom: Math.max(...lines.map((l) => l.bottom)),
  };
}

function buildBlocksForColumn(lines: NormalizedLine[]): LineBlock[] {
  if (!lines.length) return [];

  const blocks: LineBlock[] = [];
  let current: NormalizedLine[] = [lines[0]];

  for (let i = 1; i < lines.length; i += 1) {
    const prev = current[current.length - 1];
    const next = lines[i];

    if (shouldMergeLines(prev, next)) {
      current.push(next);
    } else {
      blocks.push(makeBlock(current));
      current = [next];
    }
  }

  if (current.length) {
    blocks.push(makeBlock(current));
  }

  return blocks;
}

function cleanupBlockText(text: string) {
  return cleanOcrText(
    text
      .replace(/\bvin[s]?\s+au\s+verre\b/gi, "")
      .replace(/\bprix\b/gi, "")
      .replace(/\bimportation privée\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/_/g, " ")
  );
}

function extractCountry(text: string) {
  const t = text.toLowerCase();
  return COUNTRIES.find((c) => t.includes(c));
}

function extractRegion(text: string) {
  const t = text.toLowerCase();
  return REGIONS.find((r) => t.includes(r));
}

function extractGrape(text: string) {
  const t = text.toLowerCase();
  return GRAPES.find((g) => t.includes(g));
}

function splitBlockIntoSubBlocks(text: string): string[] {
  const cleaned = cleanupBlockText(text);
  if (!cleaned) return [];

  let parts = [cleaned];

  parts = parts.flatMap((part) =>
    part
      .split(/(?=[A-ZÀ-Ý][A-ZÀ-Ý\s\-]{4,})/)
      .map((t) => cleanOcrText(t))
      .filter(Boolean)
  );

  parts = parts.flatMap((part) =>
    part
      .split(/(?<=\b(?:19\d{2}|20\d{2})\b)\s+(?=[A-ZÀ-Ý][A-Za-zÀ-ÿ])/)
      .map((t) => cleanOcrText(t))
      .filter(Boolean)
  );

  parts = parts.flatMap((part) =>
    part
      .split(/(?<=\b\d{2,3}\s*\$?)\s+(?=[A-ZÀ-Ý][A-Za-zÀ-ÿ])/)
      .map((t) => cleanOcrText(t))
      .filter(Boolean)
  );

  return parts.filter((part) => part.length >= 4);
}

function cleanProbableWineName(name: string) {
  let cleaned = name.replace(/\s+/g, " ").trim();

  cleaned = cleaned.replace(/^[\s\-–—.,:;|/\\]+/, "");
  cleaned = cleaned.replace(/[\s\-–—.,:;|/\\]+$/, "");

  if (/^[A-ZÀ-Ÿ]{3,5}\s*\.\s+/.test(cleaned)) {
    cleaned = cleaned.replace(/^[A-ZÀ-Ÿ]{3,5}\s*\.\s+/, "");
  }

  if (
    /^[A-ZÀ-Ÿ]{3,5}\s+[A-ZÀ-Ÿ]?[a-zà-ÿ]/.test(cleaned) &&
    cleaned.split(/\s+/).length >= 2
  ) {
    cleaned = cleaned.replace(/^[A-ZÀ-Ÿ]{3,5}\s+/, "");
  }

  cleaned = cleaned.replace(/\s*\.\s*/g, ". ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/^[\s\-–—.,:;|/\\]+/, "");
  cleaned = cleaned.replace(/[\s\-–—.,:;|/\\]+$/, "");

  const words = cleaned.split(/\s+/).filter(Boolean);

  if (
    words.length >= 2 &&
    /^[A-ZÀ-Ÿ]{3,5}$/.test(words[0]) &&
    /[a-zà-ÿ]{3,}/.test(words[1])
  ) {
    cleaned = words.slice(1).join(" ");
  }

  return cleaned;
}

function pickProbableWineName(rawName: string): string {
  const cleaned = cleanOcrText(rawName);
  if (!cleaned) return "";

  const base = cleanProbableWineName(cleaned);

  const chunks = [
    base,
    ...base.split(/\s+-\s+/),
    ...base.split(/\s*,\s*/),
    ...base.split(/\s+\.\s+/),
  ]
    .map((p) => cleanProbableWineName(p))
    .filter(Boolean);

  const expandedCandidates = new Set<string>();

  for (const chunk of chunks) {
    expandedCandidates.add(chunk);

    const words = chunk.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      expandedCandidates.add(words.slice(1).join(" "));
    }
    if (words.length >= 3) {
      expandedCandidates.add(words.slice(2).join(" "));
      expandedCandidates.add(words.slice(0, 2).join(" "));
      expandedCandidates.add(words.slice(0, 3).join(" "));
    }
    if (words.length >= 4) {
      expandedCandidates.add(words.slice(1, 4).join(" "));
      expandedCandidates.add(words.slice(1).join(" "));
    }
  }

  const candidates = Array.from(expandedCandidates)
    .map((candidate) => cleanProbableWineName(candidate))
    .filter(Boolean)
    .filter((candidate) => candidate.length >= 4);

  const scored = candidates
    .map((candidate) => {
      let score = 0;
      const lower = candidate.toLowerCase();
      const words = candidate.split(/\s+/).filter(Boolean);

      if (words.length >= 2) score += 4;
      if (words.length >= 3) score += 3;
      if (candidate.length >= 8) score += 2;
      if (candidate.length >= 14) score += 2;

      if (/[A-ZÀ-Ý][a-zà-ÿ]/.test(candidate)) score += 2;
      if (/[a-zà-ÿ]{3,}/.test(candidate)) score += 2;

      if (!/\b(?:19\d{2}|20\d{2})\b/.test(candidate)) score += 2;
      if (extractPrice(candidate).price === undefined) score += 2;
      if (!REGIONS.some((r) => lower.includes(r))) score += 2;
      if (!COUNTRIES.some((c) => lower.includes(c))) score += 2;
      if (!GRAPES.some((g) => lower.includes(g))) score += 1;

      // pénalité si début en CAPS cassé : "SAIN", "OLTO", "NITE", "OIRS"
      if (/^[A-ZÀ-Ÿ]{3,5}\b/.test(candidate)) score -= 8;

      // encore pire si suivi d'une virgule ou ponctuation
      if (/^[A-ZÀ-Ÿ]{3,5}\s*[,.;:-]/.test(candidate)) score -= 10;

      // pénalité si le premier mot est court et full caps
      if (words[0] && /^[A-ZÀ-Ÿ]{3,5}$/.test(words[0])) score -= 8;

      // bonus si ça ressemble à un vrai nom de cuvée / domaine
      if (
        /\b(dom(?:aine)?|clos|château|chateau|villa|quinta|mas|domaine|casa)\b/i.test(
          candidate
        )
      ) {
        score += 4;
      }

      // bonus si plusieurs mots "naturels"
      const naturalWords = words.filter((w) => /[a-zà-ÿ]{3,}/.test(w)).length;
      score += naturalWords;

      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  return scored[0]?.candidate || base;
}

function scoreCandidate(
  text: string,
  flags: {
    hasPrice: boolean;
    hasVintage: boolean;
    hasRegion: boolean;
    hasCountry: boolean;
    hasGrape: boolean;
  }
) {
  let score = 0.35;
  if (flags.hasPrice) score += 0.2;
  if (flags.hasVintage) score += 0.15;
  if (flags.hasRegion) score += 0.1;
  if (flags.hasCountry) score += 0.08;
  if (flags.hasGrape) score += 0.08;
  if (/[A-ZÀ-Ý][a-zà-ÿ]+/.test(text)) score += 0.08;
  if (text.split(/\s+/).length >= 3) score += 0.05;
  return Math.min(0.99, Number(score.toFixed(2)));
}

function buildSingleCandidateFromText(
  rawCandidateText: string,
  inheritedColor?: string
): WineCandidate | null {
  const rawText = cleanupBlockText(rawCandidateText);

  if (!rawText) return null;
  if (looksLikeSectionHeader(rawText)) return null;
  if (looksLikeGarbage(rawText)) return null;

  const priceInfo = extractPrice(rawText);
  const vintage = getVintage(rawText);
  const color = inheritedColor || detectColorFromText(rawText);
  const region = extractRegion(rawText);
  const country = extractCountry(rawText);
  const grape = extractGrape(rawText);

  let name = rawText;

  if (priceInfo.priceText) {
    name = name.replace(
      new RegExp(`\\b${priceInfo.priceText}\\b\\s*\\$?`, "i"),
      " "
    );
  }

  if (vintage) {
    name = name.replace(new RegExp(`\\b${vintage}\\b`, "i"), " ");
  }

  if (region) {
    name = name.replace(
      new RegExp(region.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      " "
    );
  }

  if (country) {
    name = name.replace(
      new RegExp(country.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      " "
    );
  }

  if (grape) {
    name = name.replace(
      new RegExp(grape.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      " "
    );
  }

  if (color) {
    name = name.replace(new RegExp(`\\b${color}\\b`, "i"), " ");
  }

  name = cleanOcrText(name);

  const lines = rawText
    .split(/\n+/)
    .map((line) => cleanOcrText(line))
    .filter(Boolean);

  let probableName = pickProbableWineName(name);

  if ((!probableName || probableName.length < 5) && lines.length > 0) {
    probableName = pickProbableWineName(lines[0]);
  }

  probableName = cleanProbableWineName(probableName);

  const probableWords = probableName.split(/\s+/).filter(Boolean);

  if (probableWords.length === 1 && /^[A-ZÀ-Ÿ]{3,5}$/.test(probableName)) {
    return null;
  }

  if (/^[A-ZÀ-Ÿ]{1,5}$/.test(probableName.trim())) return null;
  if (!isValidWineCandidate(probableName)) return null;

  const wineLike = hasWineLikeShape(rawText);
  const hasUsefulSignals =
    wineLike ||
    priceInfo.price !== undefined ||
    vintage !== undefined ||
    region !== undefined ||
    country !== undefined ||
    grape !== undefined;

  if (!hasUsefulSignals) return null;

  const rawParts = cleanOcrText(name)
    .split(/\s+-\s+|,\s+/)
    .map((p) => cleanOcrText(p))
    .filter(Boolean);

  const producerParts = rawParts.filter(
    (part) =>
      cleanProbableWineName(part).toLowerCase() !== probableName.toLowerCase()
  );

  const producer =
    producerParts.length > 0
      ? producerParts.slice(0, 2).join(" - ")
      : undefined;

  const cleanedRawText = removeLeadingNoiseFromRawText(rawText, probableName);

  return {
    id: uid(),
    rawText: cleanedRawText,
    name: probableName,
    producer,
    vintage,
    price: priceInfo.price,
    priceText: priceInfo.priceText,
    color,
    country,
    region,
    grape,
    confidence: scoreCandidate(cleanedRawText, {
      hasPrice: priceInfo.price !== undefined,
      hasVintage: Boolean(vintage),
      hasRegion: Boolean(region),
      hasCountry: Boolean(country),
      hasGrape: Boolean(grape),
    }),
  };
}

function buildCandidateFromBlock(
  block: LineBlock,
  inheritedColor?: string,
  priceAnchors: PriceAnchor[] = []
): WineCandidate[] {
  const subBlocks = splitBlockIntoSubBlocks(block.text);
  const results: WineCandidate[] = [];

  for (const subBlock of subBlocks) {
    const candidate = buildSingleCandidateFromText(subBlock, inheritedColor);

    if (!candidate) continue;

    if (candidate.price === undefined) {
      const bestPrice = findBestPriceForBlock(block, priceAnchors);

      if (bestPrice) {
        candidate.price = bestPrice.price;
        candidate.priceText = String(bestPrice.price);
      }
    }

    results.push(candidate);
  }

  return results;
}

function dedupeCandidates(items: WineCandidate[]) {
  const map = new Map<string, WineCandidate>();

  for (const item of items) {
    const key = [
      item.name.toLowerCase(),
      item.vintage || "",
      item.price || "",
    ].join("|");

    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }

    const existingScore = existing.confidence || 0;
    const nextScore = item.confidence || 0;

    if (nextScore > existingScore) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

function fallbackCandidatesFromRawText(extractedText: string): WineCandidate[] {
  const cleaned = extractedText
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

  if (!cleaned) return [];

  const rawLines = cleaned
    .split("\n")
    .map((l) => cleanOcrText(l))
    .filter(Boolean)
    .filter((l) => !looksLikeGarbage(l));

  const merged: string[] = [];
  let buffer = "";

  for (const line of rawLines) {
    const thisHasPrice = extractPrice(line).price !== undefined;

    if (!buffer) {
      buffer = line;
      if (thisHasPrice) {
        merged.push(buffer);
        buffer = "";
      }
      continue;
    }

    const combined = cleanOcrText(`${buffer} ${line}`);
    const combinedHasPrice = extractPrice(combined).price !== undefined;

    if (
      combinedHasPrice ||
      line.length < 30 ||
      /\b(19\d{2}|20\d{2})\b/.test(line)
    ) {
      buffer = combined;
      if (extractPrice(buffer).price !== undefined) {
        merged.push(buffer);
        buffer = "";
      }
    } else {
      merged.push(buffer);
      buffer = line;
    }
  }

  if (buffer) merged.push(buffer);

  return merged.flatMap((text) =>
    buildCandidateFromBlock({
      lines: [],
      text,
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    })
  );
}

export function buildWineCandidatesFromOcrLayout({
  extractedText = "",
  lines = [],
}: BuildArgs): WineCandidate[] {
  const normalized = lines
    .map(normalizeLine)
    .filter((line): line is NormalizedLine => Boolean(line))
    .filter((line) => line.text.length >= 2);

  const allCandidates: WineCandidate[] = [];

  if (normalized.length) {
    const columns = splitColumns(normalized);

    for (const column of columns) {
      const sorted = [...column].sort((a, b) => a.top - b.top);
      const blocks = buildBlocksForColumn(sorted);
      const priceAnchors = extractPriceAnchors(sorted);

      let currentColor: string | undefined;

      for (const block of blocks) {
        const blockText = cleanupBlockText(block.text);

        if (!blockText) continue;

        if (looksLikeSectionHeader(blockText)) {
          currentColor = detectColorFromText(blockText) || currentColor;
          continue;
        }

        const candidates = buildCandidateFromBlock(
          block,
          currentColor,
          priceAnchors
        );

        allCandidates.push(...candidates);
      }
    }
  }

  const dedupedLayout = dedupeCandidates(allCandidates);

  if (dedupedLayout.length >= 3) {
    return dedupedLayout.sort(
      (a, b) => (b.confidence || 0) - (a.confidence || 0)
    );
  }

  const fallback = fallbackCandidatesFromRawText(extractedText);
  const merged = dedupeCandidates([...dedupedLayout, ...fallback]);

  return merged.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
}