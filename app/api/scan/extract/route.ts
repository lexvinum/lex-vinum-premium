import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findBestDbMatch } from "@/lib/ocr-db-matcher";
import { buildWineCandidatesFromOcrLayout } from "@/lib/ocr-layout-parser";
import { extractWinesFromOcr } from "@/lib/ocr-extract-wines";

export const runtime = "nodejs";
export const maxDuration = 60;

type OcrWordPayload = {
  text: string;
  confidence?: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

type OcrLinePayload = {
  text: string;
  confidence?: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words?: OcrWordPayload[];
};

type Preferences = {
  color?: string;
  budget?: string;
  body?: string;
  acidity?: string;
  tannin?: string;
  minerality?: string;
  sweetness?: string;
  aroma?: string;
  dish?: string;
  serviceType?: string;
};

type RequestPayload = {
  extractedText?: string;
  lines?: OcrLinePayload[];
  preferences?: Preferences;
};

type DetectedWine = {
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
  body?: number;
  acidity?: number;
  tannin?: number;
  minerality?: number;
  sweetness?: number;
  aromas?: string[];
  styleTags?: string[];
  wineProfile?: string;
  dbMatch?: any | null;
  dbMatchConfidence?: number;
  dbMatchReason?: string;
  matchedBy?: "ocr_fuzzy" | "none";
};

type RankedWine = {
  wine: DetectedWine;
  score: number;
  reasons: string[];
  pairingScore: number;
  valueScore: number;
  breakdown: Record<string, number>;
};

type PremiumSelections = {
  bestOverall?: RankedWine;
  bestValue?: RankedWine;
  safest?: RankedWine;
  adventurous?: RankedWine;
};

type PremiumExplanation = {
  title: string;
  summary: string;
  why: string[];
  phraseSommelier: string;
  proBreakdown: {
    styleFit: number;
    structureFit: number;
    aromaFit: number;
    pairingFit: number;
    priceFit: number;
    complexityFit: number;
    confidenceFit: number;
    penalty: number;
    total: number;
  };
};

type PremiumSelectionsWithExplanation = PremiumSelections & {
  bestOverallExplanation?: PremiumExplanation;
  bestValueExplanation?: PremiumExplanation;
  safestExplanation?: PremiumExplanation;
  adventurousExplanation?: PremiumExplanation;
};

const COUNTRY_KEYWORDS: Record<string, string[]> = {
  France: [
    "france",
    "bourgogne",
    "bordeaux",
    "alsace",
    "loire",
    "rhone",
    "rhône",
    "beaujolais",
    "champagne",
    "chablis",
    "jura",
    "provence",
    "languedoc",
  ],
  Italie: [
    "italie",
    "italy",
    "toscane",
    "toscana",
    "piemonte",
    "piémont",
    "veneto",
    "sicile",
    "sicilia",
    "barolo",
    "barbaresco",
    "chianti",
    "etna",
    "langhe",
  ],
  Espagne: [
    "espagne",
    "spain",
    "rioja",
    "ribera",
    "duero",
    "priorat",
    "rueda",
    "castilla",
    "jerez",
    "cava",
  ],
  Portugal: ["portugal", "douro", "dao", "dão", "vinho verde", "alentejo"],
  Argentine: ["argentine", "argentina", "mendoza", "salta", "patagonia"],
  Chili: ["chili", "chile", "maipo", "colchagua", "casablanca"],
  Canada: ["canada", "québec", "quebec", "ontario", "okanagan", "niagara"],
  "États-Unis": [
    "usa",
    "etats-unis",
    "états-unis",
    "united states",
    "california",
    "napa",
    "sonoma",
    "oregon",
    "washington",
  ],
  Australie: ["australie", "australia", "barossa", "yarra", "mclaren"],
  Allemagne: ["allemagne", "germany", "mosel", "rheingau", "pfalz"],
  Autriche: ["autriche", "austria", "wachau", "kamptal", "burgenland"],
};

const REGION_KEYWORDS = [
  "Bourgogne",
  "Bordeaux",
  "Rhône",
  "Loire",
  "Alsace",
  "Champagne",
  "Beaujolais",
  "Jura",
  "Provence",
  "Chablis",
  "Toscane",
  "Piémont",
  "Veneto",
  "Sicile",
  "Rioja",
  "Ribera del Duero",
  "Douro",
  "Dão",
  "Mendoza",
  "Pfalz",
  "Mosel",
  "Napa Valley",
  "Sonoma",
];

const GRAPE_KEYWORDS = [
  "cabernet sauvignon",
  "cabernet franc",
  "merlot",
  "pinot noir",
  "gamay",
  "syrah",
  "grenache",
  "mourvèdre",
  "mourvedre",
  "tempranillo",
  "nebbiolo",
  "sangiovese",
  "barbera",
  "dolcetto",
  "malbec",
  "zinfandel",
  "refosco",
  "corvina",
  "chardonnay",
  "sauvignon blanc",
  "chenin blanc",
  "riesling",
  "viognier",
  "pinot gris",
  "pinot grigio",
  "albariño",
  "albarino",
  "verdejo",
  "grüner veltliner",
  "gruner veltliner",
];

const AROMA_LIBRARY: Record<string, string[]> = {
  citrus: ["agrum", "citron", "lime", "pamplemousse", "zeste"],
  floral: ["floral", "fleur", "jasmin", "rose", "violette", "camomille"],
  mineral: ["minéral", "mineral", "salin", "craie", "pierre", "iode"],
  "red-fruit": ["cerise", "fraise", "framboise", "groseille", "grenade"],
  "black-fruit": [
    "mûre",
    "mure",
    "cassis",
    "prune",
    "bleuet",
    "myrtille",
    "fruit noir",
  ],
  tropical: ["ananas", "mangue", "fruit de la passion", "passion", "papaye"],
  spice: [
    "poivre",
    "épice",
    "epice",
    "réglisse",
    "reglisse",
    "clou de girofle",
    "cannelle",
  ],
  oak: ["boisé", "boise", "barrique", "vanille", "toast", "fumé", "fume"],
  earth: ["terre", "sous-bois", "champignon", "truffe", "cuir"],
  herbal: ["herbacé", "herbace", "menthe", "thym", "romarin", "eucalyptus", "fenouil"],
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .trim();
}

function cleanSpaces(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function parseJsonArrayField(value: string | null | undefined): string[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // ignore
  }

  return value
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function parseVintageNumber(value?: string | number | null): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;

  if (typeof value === "string") {
    const match = value.match(/\b(19\d{2}|20\d{2})\b/);
    if (match) {
      const parsed = Number(match[1]);
      return Number.isNaN(parsed) ? null : parsed;
    }
  }

  return null;
}

function detectCountry(text: string) {
  const normalized = normalizeText(text);

  for (const [country, keywords] of Object.entries(COUNTRY_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return country;
    }
  }

  return "";
}

function detectRegion(text: string) {
  const normalized = normalizeText(text);

  for (const region of REGION_KEYWORDS) {
    if (normalized.includes(normalizeText(region))) return region;
  }

  return "";
}

function detectGrape(text: string) {
  const normalized = normalizeText(text);

  for (const grape of GRAPE_KEYWORDS) {
    if (normalized.includes(normalizeText(grape))) return grape;
  }

  return "";
}

function detectColor(text: string, inheritedColor = "") {
  const normalized = normalizeText(text);

  if (/\b(rouge|rouges|red)\b/.test(normalized)) return "rouge";
  if (/\b(blanc|blancs|white)\b/.test(normalized)) return "blanc";
  if (/\b(rose|rosé|roses|rosés)\b/.test(normalized)) return "rosé";
  if (/\b(orange)\b/.test(normalized)) return "orange";
  if (/\b(champagne|mousseux|bulles|pet-nat|pet nat|cava|prosecco|sparkling)\b/.test(normalized)) {
    return "effervescent";
  }

  return inheritedColor || "";
}

function inferAromas(text: string, grape = "", region = "") {
  const normalized = normalizeText(`${text} ${grape} ${region}`);
  const aromas: string[] = [];

  for (const [tag, keywords] of Object.entries(AROMA_LIBRARY)) {
    if (keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      aromas.push(tag);
    }
  }

  if (!aromas.length) {
    if (/sauvignon blanc|chablis|riesling|albarino|albariño/.test(normalized)) {
      aromas.push("citrus", "mineral");
    } else if (/chardonnay/.test(normalized)) {
      aromas.push("citrus", "floral");
    } else if (/pinot noir|gamay/.test(normalized)) {
      aromas.push("red-fruit");
    } else if (/cabernet|merlot|malbec|syrah|tempranillo/.test(normalized)) {
      aromas.push("black-fruit", "spice");
    } else if (/nebbiolo|sangiovese/.test(normalized)) {
      aromas.push("red-fruit", "earth");
    }
  }

  return aromas.slice(0, 4);
}

function inferStructure(wine: Partial<DetectedWine>) {
  const text = normalizeText(
    [
      wine.name,
      wine.producer,
      wine.grape,
      wine.region,
      wine.country,
      wine.color,
      wine.rawText,
    ]
      .filter(Boolean)
      .join(" ")
  );

  let body = 3;
  let acidity = 3;
  let tannin = 2;
  let minerality = 2;
  let sweetness = 1;

  if (wine.color === "blanc") {
    tannin = 1;
    acidity = 3;
    body = 2;
  }

  if (wine.color === "rosé") {
    tannin = 1;
    acidity = 3;
    body = 2;
  }

  if (wine.color === "effervescent") {
    tannin = 1;
    acidity = 4;
    body = 2;
  }

  if (/cabernet sauvignon|syrah|malbec|mourvedre|mourvèdre/.test(text)) {
    body = 4;
    tannin = 4;
    acidity = 3;
  }

  if (/merlot|grenache|tempranillo/.test(text)) {
    body = 3;
    tannin = 3;
    acidity = 3;
  }

  if (/pinot noir|gamay/.test(text)) {
    body = 2;
    tannin = 2;
    acidity = 3;
  }

  if (/nebbiolo|sangiovese/.test(text)) {
    body = 3;
    tannin = 4;
    acidity = 4;
  }

  if (/chardonnay/.test(text)) {
    body = 3;
    acidity = 3;
  }

  if (/sauvignon blanc|riesling|chenin blanc|albarino|albariño|gruner veltliner|gruner/.test(text)) {
    body = 2;
    acidity = 4;
    minerality = 4;
  }

  if (/chablis|champagne|mosel|loire|alsace/.test(text)) {
    acidity = Math.max(acidity, 4);
    minerality = Math.max(minerality, 3);
  }

  if (/bourgogne|burgundy|barolo|barbaresco|etna/.test(text)) {
    minerality = Math.max(minerality, 3);
  }

  if (/boise|boisé|barrique|vanille|toast/.test(text)) {
    body = Math.max(body, 4);
  }

  if (/demi-sec|moelleux|doux|late harvest/.test(text)) {
    sweetness = 4;
  }

  return {
    body: clamp(body, 1, 5),
    acidity: clamp(acidity, 1, 5),
    tannin: clamp(tannin, 1, 5),
    minerality: clamp(minerality, 1, 5),
    sweetness: clamp(sweetness, 1, 5),
  };
}

function inferStyleTags(wine: Partial<DetectedWine>) {
  const tags: string[] = [];
  const text = normalizeText(
    [
      wine.name,
      wine.grape,
      wine.region,
      wine.country,
      wine.rawText,
      ...(wine.aromas || []),
    ]
      .filter(Boolean)
      .join(" ")
  );

  if ((wine.acidity || 0) >= 4) tags.push("acidité vive");
  if ((wine.body || 0) >= 4) tags.push("matière ample");
  if ((wine.tannin || 0) >= 4) tags.push("tanins marqués");
  if ((wine.minerality || 0) >= 4) tags.push("trame minérale");
  if ((wine.sweetness || 0) >= 3) tags.push("touche de douceur");

  if (/boise|boisé|barrique|vanille|toast/.test(text)) tags.push("élevage boisé");
  if (/mineral|minéral|salin|craie|chablis/.test(text)) tags.push("profil tendu");
  if (/pinot noir|gamay/.test(text)) tags.push("rouge délicat");
  if (/cabernet|syrah|malbec|mourvedre|mourvèdre/.test(text)) tags.push("structure affirmée");
  if (/nebbiolo|sangiovese/.test(text)) tags.push("gastronomique");
  if (/champagne|mousseux|cava|prosecco/.test(text)) tags.push("bulles fines");

  return [...new Set(tags)].slice(0, 6);
}

function inferWineProfile(wine: Partial<DetectedWine>) {
  const pieces: string[] = [];

  if (wine.color) pieces.push(wine.color);
  if (wine.grape) pieces.push(wine.grape);
  if (wine.region || wine.country) {
    pieces.push([wine.region, wine.country].filter(Boolean).join(", "));
  }

  if ((wine.body || 0) >= 4) pieces.push("profil ample");
  else if ((wine.body || 0) <= 2) pieces.push("profil plus léger");

  if ((wine.acidity || 0) >= 4) pieces.push("belle tension");
  if ((wine.tannin || 0) >= 4) pieces.push("tanins présents");
  if ((wine.minerality || 0) >= 4) pieces.push("dimension minérale");

  return pieces.join(" • ");
}

function enrichWineCandidate(base: {
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
}): DetectedWine {
  const rawText = cleanSpaces(base.rawText || "");
  const color = base.color || detectColor(rawText, "");
  const country = base.country || detectCountry(rawText);
  const region = base.region || detectRegion(rawText);
  const grape = base.grape || detectGrape(rawText);
  const aromas = inferAromas(rawText, grape, region);

  const wine: DetectedWine = {
    id: base.id,
    rawText,
    name: cleanSpaces(base.name),
    producer: base.producer ? cleanSpaces(base.producer) : undefined,
    vintage: base.vintage,
    price: base.price,
    priceText: base.priceText,
    color,
    country,
    region,
    grape,
    confidence: base.confidence,
    aromas,
    styleTags: [],
    wineProfile: "",
  };

  const structure = inferStructure(wine);
  wine.body = structure.body;
  wine.acidity = structure.acidity;
  wine.tannin = structure.tannin;
  wine.minerality = structure.minerality;
  wine.sweetness = structure.sweetness;
  wine.styleTags = inferStyleTags(wine);
  wine.wineProfile = inferWineProfile(wine);

  return wine;
}

function dedupeWines(wines: DetectedWine[]) {
  const map = new Map<string, DetectedWine>();

  for (const wine of wines) {
    const key = normalizeText(
      [
        wine.name,
        wine.vintage || "",
        wine.region || "",
        wine.country || "",
        wine.price || "",
      ].join(" | ")
    );

    const existing = map.get(key);

    if (!existing) {
      map.set(key, wine);
      continue;
    }

    const existingScore =
      (existing.confidence || 0) +
      (existing.price ? 0.2 : 0) +
      (existing.region ? 0.1 : 0) +
      (existing.country ? 0.1 : 0) +
      (existing.grape ? 0.1 : 0);

    const nextScore =
      (wine.confidence || 0) +
      (wine.price ? 0.2 : 0) +
      (wine.region ? 0.1 : 0) +
      (wine.country ? 0.1 : 0) +
      (wine.grape ? 0.1 : 0);

    if (nextScore > existingScore) {
      map.set(key, wine);
    }
  }

  return [...map.values()];
}

function parsePreferenceScale(value?: string) {
  if (!value) return null;
  const v = normalizeText(value);

  const mapping: Record<string, number> = {
    "tres leger": 1,
    leger: 2,
    moyen: 3,
    moyenne: 3,
    ample: 5,
    faible: 1,
    souples: 1,
    souple: 1,
    moyens: 3,
    marques: 5,
    marque: 5,
    elevee: 5,
    eleve: 5,
    sec: 1,
    "demi-sec": 3,
    moelleux: 4,
    doux: 5,
  };

  if (mapping[v] !== undefined) return mapping[v];

  const num = Number(v.replace(",", "."));
  if (!Number.isNaN(num)) return clamp(num, 1, 5);

  return null;
}

function normalizeColorPreference(value?: string) {
  const v = normalizeText(value || "");
  if (v.includes("roug")) return "rouge";
  if (v.includes("blan")) return "blanc";
  if (v.includes("rose")) return "rosé";
  if (v.includes("orang")) return "orange";
  if (v.includes("bull") || v.includes("mouss") || v.includes("spark")) {
    return "effervescent";
  }
  return "";
}

function parseBudget(value?: string) {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const num = Number(match[1].replace(",", "."));
  if (Number.isNaN(num)) return null;
  return num;
}

function structureFit(wineValue?: number, prefValue?: number | null) {
  if (!prefValue || !wineValue) return 65;
  const distance = Math.abs(wineValue - prefValue);
  return clamp(Math.round(100 - distance * 22), 0, 100);
}

function aromaFit(wine: DetectedWine, preferences: Preferences) {
  const desired = normalizeText(preferences.aroma || "");
  if (!desired) return 65;

  const tokens = desired.split(/[,\s/]+/).filter(Boolean);
  if (!tokens.length) return 65;

  const haystack = normalizeText(
    [
      ...(wine.aromas || []),
      ...(wine.styleTags || []),
      wine.wineProfile || "",
      wine.rawText || "",
      wine.grape || "",
    ].join(" ")
  );

  const hits = tokens.filter((token) => haystack.includes(token));
  if (!hits.length) return 25;

  return clamp(Math.round((hits.length / tokens.length) * 100), 25, 100);
}

function priceFit(wine: DetectedWine, preferences: Preferences) {
  const budget = parseBudget(preferences.budget);
  if (!budget || !wine.price) return 70;

  if (wine.price <= budget) return 100;

  const delta = wine.price - budget;
  if (delta <= 5) return 82;
  if (delta <= 10) return 62;
  if (delta <= 20) return 38;
  return 15;
}

function valueScore(wine: DetectedWine, preferences: Preferences) {
  const fit = priceFit(wine, preferences);
  let bonus = 0;

  if ((wine.styleTags || []).includes("gastronomique")) bonus += 8;
  if ((wine.styleTags || []).includes("trame minérale")) bonus += 5;
  if ((wine.styleTags || []).includes("profil tendu")) bonus += 5;
  if ((wine.confidence || 0) >= 0.8) bonus += 4;

  return clamp(fit + bonus, 0, 100);
}

function pairingScore(wine: DetectedWine, preferences: Preferences) {
  const dish = normalizeText(preferences.dish || "");
  if (!dish) return 68;

  let score = 55;

  const isRed = wine.color === "rouge";
  const isWhite = wine.color === "blanc";
  const isRose = wine.color === "rosé";
  const isSparkling = wine.color === "effervescent";

  const body = wine.body || 3;
  const acidity = wine.acidity || 3;
  const tannin = wine.tannin || 2;
  const sweetness = wine.sweetness || 1;

  if (/poisson|saumon|thon|truite|fruits de mer|homard|huitre|huître|crevette|sushi|crabe/.test(dish)) {
    if (isWhite || isRose || isSparkling) score += 24;
    if (acidity >= 3) score += 8;
    if (tannin <= 2) score += 8;
  }

  if (/poulet|volaille|dinde|canard/.test(dish)) {
    if (isWhite || isRed || isRose) score += 14;
    if (body >= 2 && body <= 4) score += 8;
  }

  if (/boeuf|bœuf|steak|entrecote|entrecôte|agneau|gibier|burger/.test(dish)) {
    if (isRed) score += 26;
    if (tannin >= 3) score += 10;
    if (body >= 3) score += 10;
  }

  if (/pate|pâtes|risotto|pizza/.test(dish)) {
    if (acidity >= 3) score += 10;
    if (body >= 2 && body <= 4) score += 8;
  }

  if (/epice|épice|thai|indien|curry|piment|mexicain/.test(dish)) {
    if (isWhite || isRose) score += 16;
    if (tannin <= 2) score += 8;
    if (sweetness >= 2) score += 8;
  }

  if (/fromage|creme|crème|beurre|alfredo|raclette/.test(dish)) {
    if (body >= 3) score += 10;
    if ((wine.styleTags || []).includes("élevage boisé")) score += 8;
  }

  if (/salade|legume|légume|vegetar|végétar|champignon/.test(dish)) {
    if (acidity >= 3) score += 8;
    if (body <= 3) score += 6;
  }

  if (/dessert|gateau|gâteau|tarte|sucre|sucré|chocolat/.test(dish)) {
    if (sweetness >= 3) score += 25;
    else score -= 18;
  }

  return clamp(score, 0, 100);
}

function buildReasons(
  wine: DetectedWine,
  preferences: Preferences,
  breakdown: Record<string, number>
) {
  const reasons: string[] = [];

  const wantedColor = normalizeColorPreference(preferences.color);
  if (wantedColor && wine.color === wantedColor) {
    reasons.push(`La couleur demandée est respectée (${wine.color}).`);
  }

  if (breakdown.pairing >= 80 && preferences.dish) {
    reasons.push(`Très bon accord potentiel avec ${preferences.dish}.`);
  }

  if (breakdown.structure >= 80) {
    reasons.push("Le profil structurel correspond très bien aux préférences.");
  }

  if (breakdown.aroma >= 75 && preferences.aroma) {
    reasons.push(`Le profil aromatique rejoint bien la recherche “${preferences.aroma}”.`);
  }

  if (breakdown.price >= 80 && wine.price) {
    reasons.push("Le prix reste cohérent avec le budget visé.");
  }

  if ((wine.styleTags || []).includes("gastronomique")) {
    reasons.push("C’est un vin avec une vraie présence à table.");
  }

  if ((wine.styleTags || []).includes("profil tendu")) {
    reasons.push("La tension du vin aide souvent l’accord et la fraîcheur en bouche.");
  }

  if (!reasons.length) {
    reasons.push("Bonne cohérence globale entre le style du vin, la table et les préférences.");
  }

  return reasons.slice(0, 4);
}

function rankWines(wines: DetectedWine[], preferences: Preferences): RankedWine[] {
  const prefBody = parsePreferenceScale(preferences.body);
  const prefAcidity = parsePreferenceScale(preferences.acidity);
  const prefTannin = parsePreferenceScale(preferences.tannin);
  const prefMinerality = parsePreferenceScale(preferences.minerality);
  const prefSweetness = parsePreferenceScale(preferences.sweetness);
  const prefColor = normalizeColorPreference(preferences.color);

  return wines
    .map((wine) => {
      const colorScore =
        prefColor && wine.color
          ? wine.color === prefColor
            ? 100
            : 28
          : 68;

      const structureScore = Math.round(
        average([
          structureFit(wine.body, prefBody),
          structureFit(wine.acidity, prefAcidity),
          structureFit(wine.tannin, prefTannin),
          structureFit(wine.minerality, prefMinerality),
          structureFit(wine.sweetness, prefSweetness),
        ])
      );

      const aromatics = aromaFit(wine, preferences);
      const pairing = pairingScore(wine, preferences);
      const price = priceFit(wine, preferences);
      const value = valueScore(wine, preferences);
      const confidenceScore = clamp(
        Math.round((wine.confidence || 0.65) * 100),
        0,
        100
      );

      const completeness = clamp(
        [
          wine.region,
          wine.country,
          wine.grape,
          wine.price,
          wine.vintage,
          wine.color,
        ].filter(Boolean).length * 14,
        20,
        100
      );

      const total = Math.round(
        colorScore * 0.14 +
          structureScore * 0.26 +
          aromatics * 0.11 +
          pairing * 0.2 +
          price * 0.1 +
          confidenceScore * 0.08 +
          completeness * 0.11
      );

      const breakdown = {
        color: colorScore,
        structure: structureScore,
        aroma: aromatics,
        pairing,
        price,
        confidence: confidenceScore,
        completeness,
      };

      return {
        wine,
        score: clamp(total, 0, 100),
        reasons: buildReasons(wine, preferences, breakdown),
        pairingScore: pairing,
        valueScore: value,
        breakdown,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function pickPremiumSelections(ranked: RankedWine[]): PremiumSelections {
  if (!ranked.length) return {};

  const bestOverall = ranked[0];

  const bestValue =
    [...ranked]
      .sort((a, b) => b.valueScore - a.valueScore || b.score - a.score)
      .find(Boolean) || bestOverall;

  const safest =
    [...ranked]
      .sort((a, b) => {
        const safeA =
          a.score * 0.7 +
          (a.breakdown.confidence || 0) * 0.15 +
          (a.breakdown.completeness || 0) * 0.15;
        const safeB =
          b.score * 0.7 +
          (b.breakdown.confidence || 0) * 0.15 +
          (b.breakdown.completeness || 0) * 0.15;
        return safeB - safeA;
      })
      .find(Boolean) || bestOverall;

  const adventurous =
    [...ranked]
      .filter(
        (item) =>
          item.wine.styleTags?.includes("gastronomique") ||
          item.wine.styleTags?.includes("trame minérale")
      )
      .sort((a, b) => {
        const advA =
          a.score * 0.6 +
          (a.wine.minerality || 0) * 6 +
          (a.wine.acidity || 0) * 5 +
          ((a.wine.styleTags || []).includes("gastronomique") ? 12 : 0);
        const advB =
          b.score * 0.6 +
          (b.wine.minerality || 0) * 6 +
          (b.wine.acidity || 0) * 5 +
          ((b.wine.styleTags || []).includes("gastronomique") ? 12 : 0);
        return advB - advA;
      })[0] ||
    ranked[Math.min(2, ranked.length - 1)] ||
    bestOverall;

  return {
    bestOverall,
    bestValue,
    safest,
    adventurous,
  };
}

function buildSommelierPhrase(
  ranked: RankedWine,
  preferences: Preferences,
  mode: "bestOverall" | "bestValue" | "safest" | "adventurous"
) {
  const wine = ranked.wine;
  const dish = preferences.dish?.trim();
  const color = wine.color || "vin";
  const styleTags = wine.styleTags || [];

  if (mode === "bestValue") {
    return "C’est le choix le plus intelligent si vous voulez maximiser le plaisir sans dépasser inutilement en prix.";
  }

  if (mode === "safest") {
    return "C’est la bouteille la plus rassurante de la sélection : cohérente, lisible et facile à recommander sans risque.";
  }

  if (mode === "adventurous") {
    return "Si vous voulez une bouteille avec un peu plus de relief et de personnalité, c’est celle qui a le plus d’intérêt dans cette sélection.";
  }

  if (dish) {
    return `Si vous prenez ${dish}, ce ${color} a la meilleure cohérence globale à table ce soir.`;
  }

  if (styleTags.includes("gastronomique")) {
    return "C’est la bouteille la plus aboutie si vous cherchez un vin avec de la présence et une vraie tenue à table.";
  }

  return "C’est le choix le plus juste et le plus complet dans la sélection actuelle.";
}

function buildPremiumExplanation(
  ranked: RankedWine,
  preferences: Preferences,
  title: string,
  mode: "bestOverall" | "bestValue" | "safest" | "adventurous"
): PremiumExplanation {
  const wine = ranked.wine;
  const breakdown = ranked.breakdown;

  const styleFit = Math.round(
    average([
      breakdown.color || 0,
      breakdown.completeness || 0,
      (wine.styleTags || []).length ? 82 : 64,
    ])
  );

  const structureFit = breakdown.structure || 0;
  const aromaFitValue = breakdown.aroma || 0;
  const pairingFit = breakdown.pairing || 0;
  const priceFitValue = breakdown.price || 0;

  const complexityBase =
    (wine.body || 0) * 12 +
    (wine.acidity || 0) * 10 +
    (wine.minerality || 0) * 10 +
    (wine.tannin || 0) * 8 +
    ((wine.styleTags || []).includes("gastronomique") ? 12 : 0) +
    ((wine.styleTags || []).includes("trame minérale") ? 8 : 0);

  const complexityFit = clamp(Math.round(complexityBase / 2), 35, 96);
  const confidenceFit = breakdown.confidence || 0;

  let penalty = 0;
  if (priceFitValue < 50) penalty += 10;
  if (confidenceFit < 60) penalty += 12;
  if (breakdown.completeness < 50) penalty += 8;
  if (pairingFit < 55 && preferences.dish) penalty += 10;

  const total = clamp(
    Math.round(
      styleFit * 0.14 +
        structureFit * 0.22 +
        aromaFitValue * 0.12 +
        pairingFit * 0.2 +
        priceFitValue * 0.1 +
        complexityFit * 0.12 +
        confidenceFit * 0.16 -
        penalty * 0.2
    ),
    0,
    100
  );

  const why: string[] = [];

  if (pairingFit >= 80 && preferences.dish) {
    why.push(`Accord particulièrement solide avec ${preferences.dish}.`);
  }

  if (structureFit >= 80) {
    why.push("La structure du vin correspond très bien à vos préférences.");
  }

  if (aromaFitValue >= 75 && preferences.aroma) {
    why.push(`Le profil aromatique rejoint bien la recherche “${preferences.aroma}”.`);
  }

  if (priceFitValue >= 80 && wine.price) {
    why.push("Le positionnement prix reste cohérent pour ce niveau de pertinence.");
  }

  if ((wine.styleTags || []).includes("gastronomique")) {
    why.push("Le vin a une vraie présence de table et un profil plus sérieux.");
  }

  if ((wine.styleTags || []).includes("trame minérale")) {
    why.push("La tension minérale apporte de la précision et de l’allonge.");
  }

  if (!why.length) {
    why.push("Le vin présente la meilleure cohérence générale dans la sélection détectée.");
  }

  const summaryParts: string[] = [];

  if (wine.color) summaryParts.push(wine.color);
  if (wine.region) summaryParts.push(wine.region);
  if (wine.grape) summaryParts.push(wine.grape);
  if ((wine.styleTags || []).length) {
    summaryParts.push((wine.styleTags || []).slice(0, 2).join(", "));
  }

  const summary = summaryParts.length
    ? `${summaryParts.join(" • ")}. Très bonne cohérence globale avec votre recherche.`
    : "Très bonne cohérence globale avec votre recherche.";

  return {
    title,
    summary,
    why: why.slice(0, 4),
    phraseSommelier: buildSommelierPhrase(ranked, preferences, mode),
    proBreakdown: {
      styleFit,
      structureFit,
      aromaFit: aromaFitValue,
      pairingFit,
      priceFit: priceFitValue,
      complexityFit,
      confidenceFit,
      penalty,
      total,
    },
  };
}

function attachPremiumExplanations(
  selections: PremiumSelections,
  preferences: Preferences
): PremiumSelectionsWithExplanation {
  return {
    ...selections,
    bestOverallExplanation: selections.bestOverall
      ? buildPremiumExplanation(
          selections.bestOverall,
          preferences,
          "Meilleur choix pour vous",
          "bestOverall"
        )
      : undefined,
    bestValueExplanation: selections.bestValue
      ? buildPremiumExplanation(
          selections.bestValue,
          preferences,
          "Meilleur rapport plaisir / prix",
          "bestValue"
        )
      : undefined,
    safestExplanation: selections.safest
      ? buildPremiumExplanation(
          selections.safest,
          preferences,
          "Choix le plus rassurant",
          "safest"
        )
      : undefined,
    adventurousExplanation: selections.adventurous
      ? buildPremiumExplanation(
          selections.adventurous,
          preferences,
          "Choix le plus audacieux",
          "adventurous"
        )
      : undefined,
  };
}

function fallbackLinesFromText(text: string): OcrLinePayload[] {
  return text
    .split("\n")
    .map((line) => cleanSpaces(line))
    .filter(Boolean)
    .map((line, index) => ({
      text: line,
      confidence: 75,
      bbox: {
        x0: 0,
        y0: index * 20,
        x1: 1000,
        y1: index * 20 + 14,
      },
      words: [],
    }));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripWeirdPunctuation(value: string) {
  return value
    .replace(/[«»“”"]/g, "")
    .replace(/[|_/\\]+/g, " ")
    .replace(/[•·▪◦●]/g, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\[\s*\]/g, " ")
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/[^\p{L}\p{N}\s'.,\-&]/gu, " ");
}

function cleanCandidateName(raw?: string | null) {
  if (!raw) return "";

  return normalizeWhitespace(stripWeirdPunctuation(raw))
    .replace(/\b([A-Za-zÀ-ÿ]{2,})\s+\1\b/giu, "$1")
    .trim();
}

function getMeaningfulTokens(value: string) {
  const stopwords = new Set([
    "vin",
    "vino",
    "wine",
    "rouge",
    "blanc",
    "rose",
    "rosé",
    "bio",
    "reserve",
    "réserve",
    "grand",
    "estate",
    "domaine",
    "cuvée",
    "cuvee",
    "the",
    "and",
    "les",
    "des",
    "de",
    "du",
    "la",
    "le",
    "del",
    "della",
    "delle",
    "tenuta",
    "bodega",
    "bodegas",
    "cellars",
    "cellar",
    "saint",
    "santa",
    "doc",
    "docg",
    "aoc",
    "igt",
  ]);

  return value
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3)
    .filter((t) => !stopwords.has(t))
    .filter((t) => !/^\d+$/.test(t));
}

function buildDbCandidateNames(detectedWines: Array<{ name?: string; rawText?: string }>) {
  const seen = new Set<string>();

  return detectedWines
    .map((wine) => cleanCandidateName(wine.name || wine.rawText || ""))
    .filter((name) => name.length >= 4)
    .filter((name) => {
      const lowered = name.toLowerCase();
      if (seen.has(lowered)) return false;
      seen.add(lowered);
      return true;
    })
    .slice(0, 8);
}

async function fetchDbCandidates(wines: DetectedWine[]) {
  const candidateNames = buildDbCandidateNames(wines);

  const select = {
    id: true,
    name: true,
    producer: true,
    vintage: true,
    price: true,
    color: true,
    country: true,
    region: true,
    grape: true,
    description: true,
    aromasJson: true,
    tagsJson: true,
  } as const;

  if (!candidateNames.length) {
    return {
      candidateNames,
      dbWines: [] as any[],
    };
  }

  const collected: any[] = [];
  const seenIds = new Set<string>();

  for (const candidateName of candidateNames) {
    const tokens = getMeaningfulTokens(candidateName).slice(0, 2);

    if (!tokens.length) continue;

    const orConditions = tokens.flatMap((token) => [
      { name: { contains: token, mode: "insensitive" as const } },
      { producer: { contains: token, mode: "insensitive" as const } },
      { region: { contains: token, mode: "insensitive" as const } },
      { grape: { contains: token, mode: "insensitive" as const } },
      { country: { contains: token, mode: "insensitive" as const } },
    ]);

    const rows = await prisma.wine.findMany({
      where: {
        OR: orConditions,
      },
      select,
      take: 12,
    });

    for (const row of rows) {
      if (!row?.id || seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      collected.push(row);
    }

    if (collected.length >= 60) break;
  }

  return {
    candidateNames,
    dbWines: collected.slice(0, 60),
  };
}

function stripOcrNoise(value?: string | null) {
  return cleanSpaces(
    String(value || "")
      .replace(/[®©™]/g, " ")
      .replace(/[•·▪◦●]/g, " ")
      .replace(/[|]/g, " ")
      .replace(/\s*[,;:]\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

function cleanWineText(value?: string | null) {
  let text = stripOcrNoise(value);

  text = text
    .replace(/^[Tt]\s+(?=[a-zà-ÿ])/i, "")
    .replace(/^[,.\-–—]+\s*/, "")
    .replace(/^\d+\s+[®©™]?\s*/i, "")
    .replace(/^[^\p{L}]+/u, "")
    .replace(/[^\p{L}\p{N}\s'’"«»\-&/]/gu, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text;
}

function cleanDisplayName(name?: string | null) {
  let text = cleanWineText(name);

  text = text
    .replace(/\b(\d{1,3})\s*[$€£]\b/g, "")
    .replace(/\b(19\d{2}|20\d{2})\b/g, "")
    .replace(/\b(loire|rhone|rhône|france|italie|espagne|portugal|canada)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text;
}

function cleanProducerName(producer?: string | null) {
  let text = cleanWineText(producer);

  text = text
    .replace(/\b(19\d{2}|20\d{2})\b/g, "")
    .replace(/\b\d{1,3}\s*[$€£]\b/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return text;
}

function normalizeVintage(value?: string | null) {
  if (!value) return undefined;

  const match = String(value).match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return undefined;

  const year = Number(match[1]);
  const currentYear = new Date().getFullYear();

  if (year < 1950 || year > currentYear + 1) {
    return undefined;
  }

  return String(year);
}

function isSuspiciousWineName(name?: string | null) {
  const text = cleanDisplayName(name);

  if (!text) return true;
  if (text.length < 5) return true;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return true;

  const normalized = normalizeText(text);

  if (/^(vin|wine|rouge|blanc|rose|rosé)$/.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;

  return false;
}

function sanitizeDetectedWine(wine: DetectedWine): DetectedWine {
  const cleanedName = cleanDisplayName(wine.name);
  const cleanedProducer = cleanProducerName(wine.producer);
  const cleanedRawText = stripOcrNoise(wine.rawText);
  const cleanedVintage = normalizeVintage(wine.vintage);

  return {
    ...wine,
    rawText: cleanedRawText,
    name: cleanedName,
    producer: cleanedProducer || undefined,
    vintage: cleanedVintage,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/scan/extract",
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const timings: Record<string, number> = {};
  const mark = (label: string, from: number) => {
    timings[label] = Date.now() - from;
  };

  try {
    console.log("[scan/extract] POST start");

    const tBody = Date.now();
    const body = (await req.json()) as RequestPayload;
    mark("readBodyMs", tBody);

    const extractedText = String(body?.extractedText || "");
    const preferences = body?.preferences || {};
    const inputLines =
      Array.isArray(body?.lines) && body.lines.length
        ? body.lines
        : fallbackLinesFromText(extractedText);

    if (!extractedText.trim() && !inputLines.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Aucune donnée OCR reçue.",
          debug: { timings },
        },
        { status: 400 }
      );
    }

    console.log("[scan/extract] input", {
      extractedTextLength: extractedText.length,
      linesCount: inputLines.length,
    });

    const tParse = Date.now();
    const layoutCandidates = buildWineCandidatesFromOcrLayout({
      extractedText,
      lines: inputLines,
    });
    mark("layoutParserMs", tParse);

    const tFallback = Date.now();
    const fallbackCandidates =
      layoutCandidates.length >= 3
        ? []
        : extractWinesFromOcr(extractedText).map((wine) => ({
            id: wine.id,
            rawText: wine.rawBlock,
            name: wine.name,
            producer: wine.producer,
            vintage: wine.vintage,
            price: wine.price,
            priceText: wine.priceText,
            color: wine.color,
            country: wine.country,
            region: wine.region,
            grape: wine.grape,
            confidence:
              typeof wine.confidence === "number"
                ? Math.max(0.2, Math.min(0.99, wine.confidence / 100))
                : 0.6,
          }));
    mark("fallbackParserMs", tFallback);

    const tPrepare = Date.now();
    let wines = [...layoutCandidates, ...fallbackCandidates]
      .map((candidate) => enrichWineCandidate(candidate))
      .map((wine) => sanitizeDetectedWine(wine))
      .filter((wine) => !isSuspiciousWineName(wine.name));

    wines = dedupeWines(wines).slice(0, 80);
    mark("prepareCandidatesMs", tPrepare);

    console.log("[scan/extract] candidates", {
      layoutCandidates: layoutCandidates.length,
      fallbackCandidates: fallbackCandidates.length,
      finalCandidates: wines.length,
    });

    const tDb = Date.now();

    let candidateNames: string[] = [];
    let dbWines: any[] = [];
    let databaseUnavailable = false;
    let databaseErrorMessage: string | null = null;

    try {
      const result = await fetchDbCandidates(wines);
      candidateNames = result.candidateNames;
      dbWines = result.dbWines;
    } catch (error) {
      console.error("[scan/extract] DB ERROR (fallback mode)", error);
      databaseUnavailable = true;
      databaseErrorMessage =
        error instanceof Error ? error.message : "Database unavailable";
    }

    mark("dbFetchMs", tDb);

    console.log("[scan/extract] db pool", {
      candidateNamesCount: candidateNames.length,
      dbCandidates: dbWines.length,
      databaseUnavailable,
      candidateNamesPreview: candidateNames.slice(0, 8),
    });

    const tMatch = Date.now();
    const matchedWines: DetectedWine[] = wines.map((wine) => {
      if (databaseUnavailable || !dbWines.length) {
        return sanitizeDetectedWine({
          ...wine,
          dbMatch: null,
          dbMatchConfidence: 0,
          dbMatchReason: databaseUnavailable
            ? "database_unavailable"
            : "no_db_candidates",
          matchedBy: "none",
        });
      }

      const match = findBestDbMatch(
        {
          name: wine.name,
          producer: wine.producer,
          country: wine.country,
          region: wine.region,
          color: wine.color,
          style: wine.wineProfile,
          price: wine.price ?? null,
          vintage: parseVintageNumber(wine.vintage),
        },
        dbWines
      );

      if (!match.wine) {
        return sanitizeDetectedWine({
          ...wine,
          dbMatch: null,
          dbMatchConfidence: match.confidence,
          dbMatchReason: match.reason,
          matchedBy: "none",
        });
      }

      const dbWine = match.wine;
      const matchedAromas = parseJsonArrayField(dbWine.aromasJson);
      const matchedTags = parseJsonArrayField(dbWine.tagsJson);

      return sanitizeDetectedWine({
        ...wine,
        name: dbWine.name ?? wine.name,
        producer: dbWine.producer ?? wine.producer,
        vintage:
          dbWine.vintage !== null && dbWine.vintage !== undefined
            ? String(dbWine.vintage)
            : wine.vintage
              ? String(wine.vintage)
              : undefined,
        price: dbWine.price ?? wine.price,
        color: dbWine.color ?? wine.color,
        country: dbWine.country ?? wine.country,
        region: dbWine.region ?? wine.region,
        grape: dbWine.grape ?? wine.grape,
        aromas: matchedAromas.length ? matchedAromas : wine.aromas,
        styleTags: matchedTags.length ? matchedTags : wine.styleTags,
        wineProfile: dbWine.description ?? wine.wineProfile,
        confidence: Math.max(wine.confidence || 0, 0.9),
        dbMatch: dbWine,
        dbMatchConfidence: match.confidence,
        dbMatchReason: match.reason,
        matchedBy: "ocr_fuzzy",
      });
    });
    mark("dbMatchMs", tMatch);

    const tRank = Date.now();
    const rankedWines = rankWines(matchedWines, preferences);
    const premiumSelections = pickPremiumSelections(rankedWines);
    const premiumSelectionsWithExplanation = attachPremiumExplanations(
      premiumSelections,
      preferences
    );
    mark("rankingMs", tRank);

    timings.totalMs = Date.now() - startedAt;

    console.log("[scan/extract] success", {
      matchedWines: matchedWines.length,
      rankedWines: rankedWines.length,
      databaseUnavailable,
      timings,
    });

    return NextResponse.json({
      success: true,
      extractedText,
      linesCount: inputLines.length,
      wines: matchedWines,
      rankedWines,
      premiumSelections: premiumSelectionsWithExplanation,
      databaseUnavailable,
      debug: {
        timings,
        counts: {
          layoutCandidates: layoutCandidates.length,
          fallbackCandidates: fallbackCandidates.length,
          finalCandidates: wines.length,
          dbCandidates: dbWines.length,
        },
        dbCandidateNames: candidateNames,
        databaseErrorMessage,
      },
    });
  } catch (error) {
    console.error("[scan/extract] ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Erreur lors de l’extraction des vins.",
        debug: {
          timings,
          totalMs: Date.now() - startedAt,
        },
      },
      { status: 500 }
    );
  }
}