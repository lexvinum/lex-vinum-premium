// lib/wine/is-actual-wine.ts

export type WineCandidate = {
  name?: string | null;
  type?: string | null;
  color?: string | null;
  country?: string | null;
  region?: string | null;
  format?: string | number | null;
  formatMl?: number | null;
  category?: string | null;
  subcategory?: string | null;
  typeProduit?: string | null;
  designation?: string | null;
  appellation?: string | null;
  varietals?: string | null;
  grapes?: string | null;
  nature?: string | null;
  bio?: string | null;
  producer?: string | null;
  saqUrl?: string | null;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseFormatToMl(input: string | number | null | undefined): number | null {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input;
  }

  const value = normalize(input);
  if (!value) return null;

  // exemples:
  // "750 ml", "1500ml", "1,5 l", "1.5 l", "3 l", "6x750 ml"
  const literMatch = value.match(/(\d+(?:[.,]\d+)?)\s*l\b/);
  if (literMatch) {
    const liters = Number(literMatch[1].replace(",", "."));
    if (Number.isFinite(liters)) return Math.round(liters * 1000);
  }

  const mlMatch = value.match(/(\d{2,5})\s*ml\b/);
  if (mlMatch) {
    const ml = Number(mlMatch[1]);
    if (Number.isFinite(ml)) return ml;
  }

  const multiBottleMatch = value.match(/(\d+)\s*x\s*(\d{2,5})\s*ml/);
  if (multiBottleMatch) {
    const count = Number(multiBottleMatch[1]);
    const each = Number(multiBottleMatch[2]);
    if (Number.isFinite(count) && Number.isFinite(each)) return count * each;
  }

  return null;
}

const WINE_POSITIVE_KEYWORDS = [
  "vin",
  "wine",
  "rouge",
  "blanc",
  "rose",
  "rosé",
  "orange",
  "mousseux",
  "effervescent",
  "champagne",
  "cava",
  "prosecco",
  "petillant",
  "pétillant",
  "porto",
  "port",
  "madere",
  "madère",
  "sherry",
  "jerez",
  "vermouth",
  "vin doux",
  "vin liquoreux",
  "vin de glace",
  "icewine",
  "late harvest",
  "vendanges tardives",
  "appellation",
  "aop",
  "aoc",
  "doc",
  "docg",
  "igt",
  "vinho verde",
  "rioja",
  "bourgogne",
  "bordeaux",
  "chianti",
  "barolo",
  "sancerre",
  "chablis",
  "pinot noir",
  "cabernet",
  "merlot",
  "syrah",
  "grenache",
  "malbec",
  "tempranillo",
  "sangiovese",
  "chardonnay",
  "sauvignon blanc",
  "riesling",
  "chenin",
  "viognier",
  "gewurztraminer",
  "gewürztraminer",
  "muscadet",
  "albarino",
  "albariño",
];

const WINE_NEGATIVE_KEYWORDS = [
  "vodka",
  "gin",
  "rhum",
  "rum",
  "whisky",
  "whiskey",
  "scotch",
  "bourbon",
  "tequila",
  "mezcal",
  "cognac",
  "armagnac",
  "liqueur",
  "liqueur creme",
  "liqueur crème",
  "creme de",
  "crème de",
  "aperitif",
  "apéritif",
  "digestif",
  "eau-de-vie",
  "brandy",
  "pastis",
  "ouzo",
  "sake",
  "saké",
  "biere",
  "bière",
  "beer",
  "ale",
  "lager",
  "stout",
  "ipa",
  "cidre",
  "cider",
  "cooler",
  "hard seltzer",
  "seltzer",
  "prets-a-boire",
  "prêts-a-boire",
  "pret-a-boire",
  "prêt-à-boire",
  "ready to drink",
  "boisson alcoolisee",
  "boisson alcoolisée",
  "cocktail",
  "malt",
  "hydromel",
  "soju",
  "baijiu",
  "grappa",
  "amaro",
  "schnapps",
  "moonshine",
];

const WINE_ONLY_TYPE_KEYWORDS = [
  "vin rouge",
  "vin blanc",
  "vin rose",
  "vin rosé",
  "vin orange",
  "vin mousseux",
  "vin effervescent",
  "vin fortifie",
  "vin fortifié",
  "champagne",
  "porto",
  "sherry",
  "madere",
  "madère",
];

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(normalize(needle)));
}

function compactJoin(values: Array<string | null | undefined>): string {
  return values.map(normalize).filter(Boolean).join(" | ");
}

export function isActualWine(candidate: WineCandidate): boolean {
  const searchable = compactJoin([
    candidate.name,
    candidate.type,
    candidate.color,
    candidate.country,
    candidate.region,
    candidate.category,
    candidate.subcategory,
    candidate.typeProduit,
    candidate.designation,
    candidate.appellation,
    candidate.varietals,
    candidate.grapes,
    candidate.nature,
    candidate.bio,
    candidate.producer,
    candidate.saqUrl,
    typeof candidate.format === "string" ? candidate.format : null,
  ]);

  if (!searchable) return false;

  // Blocage immédiat des faux positifs évidents
  if (containsAny(searchable, WINE_NEGATIVE_KEYWORDS)) {
    return false;
  }

  const parsedFormat =
    candidate.formatMl ??
    parseFormatToMl(typeof candidate.format === "number" ? candidate.format : candidate.format);

  // Formats ultra suspects pour spiritueux / prêts-à-boire
  // On n'exclut pas automatiquement les 375 ml ou 500 ml car certains vins existent dans ces formats.
  if (parsedFormat !== null) {
    const suspiciousTinyFormats = new Set([50, 200, 213, 222, 250, 355, 330, 341, 473, 500]);
    if (suspiciousTinyFormats.has(parsedFormat)) {
      const hasStrongWineSignal =
        containsAny(searchable, WINE_ONLY_TYPE_KEYWORDS) ||
        containsAny(searchable, WINE_POSITIVE_KEYWORDS) ||
        normalize(candidate.appellation).length > 0 ||
        normalize(candidate.varietals ?? candidate.grapes).length > 0;

      if (!hasStrongWineSignal) {
        return false;
      }
    }
  }

  const typeSignals = compactJoin([
    candidate.type,
    candidate.category,
    candidate.subcategory,
    candidate.typeProduit,
    candidate.designation,
    candidate.appellation,
    candidate.color,
  ]);

  const hasStrongWineTypeSignal =
    containsAny(typeSignals, WINE_ONLY_TYPE_KEYWORDS) ||
    containsAny(typeSignals, ["vin", "wine", "champagne", "porto", "sherry", "madere", "madère"]);

  const hasWineSemanticSignal =
    containsAny(searchable, WINE_POSITIVE_KEYWORDS) ||
    normalize(candidate.appellation).length > 0 ||
    normalize(candidate.varietals ?? candidate.grapes).length > 0;

  // Dernier garde-fou :
  // un produit passe s'il a soit un signal type très fort,
  // soit un signal sémantique vin suffisamment crédible.
  if (hasStrongWineTypeSignal) return true;
  if (hasWineSemanticSignal) return true;

  return false;
}

export function getPreferredWineImage(
  wineImage?: string | null,
  color?: string | null
): string {
  const normalizedColor = normalize(color);

  if (wineImage && wineImage.trim().length > 0) {
    return wineImage;
  }

  if (normalizedColor.includes("rouge")) return "/images/editorial-1.jpeg";
  if (normalizedColor.includes("blanc")) return "/images/lifestyle-1.jpeg";
  if (normalizedColor.includes("rose") || normalizedColor.includes("rosé")) {
    return "/images/lifestyle-2.jpeg";
  }
  if (normalizedColor.includes("mousse") || normalizedColor.includes("efferves")) {
    return "/images/grid-2.jpeg";
  }

  return "/images/grid-1.jpeg";
}