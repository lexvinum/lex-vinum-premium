type DbWine = {
  id: string;
  slug: string;
  name: string;
  producer?: string | null;
  country?: string | null;
  region?: string | null;
  grape?: string | null;
  color?: string | null;
  style?: string | null;
  price?: number | null;
  vintage?: string | number | null;
  image?: string | null;
  aromasJson?: string | null;
  tagsJson?: string | null;
  description?: string | null;
  isQuebec?: boolean;
  featured?: boolean;
  body?: string | number | null;
acidity?: string | number | null;
tannin?: string | number | null;
minerality?: string | number | null;
  pairingJson?: string | null;
  serving?: string | null;
  temperature?: string | null;
  cellar?: string | null;
};

type OcrWineCandidate = {
  name?: string;
  producer?: string;
  country?: string;
  region?: string;
  color?: string;
  style?: string;
  price?: number | null;
  vintage?: number | null;
};

export type DbMatchResult = {
  wine: DbWine | null;
  confidence: number;
  reason: string;
};

const STOP_WORDS = new Set([
  "vin",
  "vino",
  "wine",
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "en",
  "the",
  "a",
  "au",
  "aux",
  "pour",
  "avec",
  "sur",
  "rouge",
  "blanc",
  "rose",
  "rosé",
  "vinho",
  "igt",
  "doc",
  "docg",
  "aop",
  "aoc",
  "vqa",
  "reserve",
  "réserve",
  "selection",
  "sélection",
  "cuvée",
  "cuvee",
  "estate",
  "cellars",
  "cellar",
]);

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(value: string | null | undefined): string {
  if (!value) return "";

  let text = stripAccents(value)
    .toLowerCase()
    .replace(/[|]/g, "l")
    .replace(/[“”"']/g, "")
    .replace(/&/g, " et ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // petites corrections OCR fréquentes
  text = text
    .replace(/\bchatea u\b/g, "chateau")
    .replace(/\bchat eau\b/g, "chateau")
    .replace(/\bsa1nt\b/g, "saint")
    .replace(/\bsan t\b/g, "saint")
    .replace(/\b0\b/g, "o")
    .replace(/\bl5\b/g, "is")
    .replace(/\bcabernet sauvign0n\b/g, "cabernet sauvignon")
    .replace(/\bmer1ot\b/g, "merlot")
    .replace(/\bp1not\b/g, "pinot")
    .replace(/\bchard0nnay\b/g, "chardonnay")
    .replace(/\bsyra h\b/g, "syrah")
    .replace(/\bma1bec\b/g, "malbec");

  return text;
}

function tokenize(value: string): string[] {
  return normalizeText(value)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function tokenOverlapScore(a: string, b: string): number {
  const ta = unique(tokenize(a));
  const tb = unique(tokenize(b));

  if (!ta.length || !tb.length) return 0;

  const setB = new Set(tb);
  const common = ta.filter((token) => setB.has(token)).length;

  return common / Math.max(ta.length, tb.length);
}

function containsNormalized(haystack: string, needle: string): boolean {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!h || !n) return false;
  return h.includes(n);
}

function levenshtein(a: string, b: string): number {
  const s = normalizeText(a);
  const t = normalizeText(b);

  if (!s.length) return t.length;
  if (!t.length) return s.length;

  const dp = Array.from({ length: s.length + 1 }, () =>
    new Array<number>(t.length + 1).fill(0)
  );

  for (let i = 0; i <= s.length; i++) dp[i][0] = i;
  for (let j = 0; j <= t.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[s.length][t.length];
}

function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const distance = levenshtein(na, nb);
  return 1 - distance / Math.max(na.length, nb.length);
}

function priceScore(a?: number | null, b?: number | null): number {
  if (!a || !b || a <= 0 || b <= 0) return 0;
  const diff = Math.abs(a - b);
  if (diff <= 1.5) return 1;
  if (diff <= 3) return 0.8;
  if (diff <= 5) return 0.55;
  if (diff <= 8) return 0.25;
  return 0;
}

function parseVintageValue(value?: string | number | null): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;

  if (typeof value === "string") {
    const match = value.match(/\b(19\d{2}|20\d{2})\b/);
    if (!match) return null;

    const parsed = Number(match[1]);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function vintageScore(
  a?: string | number | null,
  b?: string | number | null
): number {
  const va = parseVintageValue(a);
  const vb = parseVintageValue(b);

  if (!va || !vb) return 0;
  if (va === vb) return 1;
  if (Math.abs(va - vb) === 1) return 0.4;
  return -0.25;
}

function softFieldScore(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;

  const sim = similarity(a, b);
  const overlap = tokenOverlapScore(a, b);

  if (containsNormalized(a, b) || containsNormalized(b, a)) {
    return Math.max(0.88, overlap, sim);
  }

  return Math.max(sim, overlap);
}

function colorCompatibility(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const na = normalizeText(a);
  const nb = normalizeText(b);
  return na === nb ? 1 : -0.35;
}

function buildCandidateLabel(candidate: OcrWineCandidate): string {
  return [
    candidate.name,
    candidate.producer,
    candidate.region,
    candidate.country,
    candidate.color,
  ]
    .filter(Boolean)
    .join(" ");
}

function computeWineMatchScore(candidate: OcrWineCandidate, dbWine: DbWine) {
  const candidateLabel = buildCandidateLabel(candidate);
  const dbLabel = [
    dbWine.name,
    dbWine.producer,
    dbWine.region,
    dbWine.country,
    dbWine.color,
  ]
    .filter(Boolean)
    .join(" ");

  const name = softFieldScore(candidate.name, dbWine.name);
  const producer = softFieldScore(candidate.producer, dbWine.producer);
  const region = softFieldScore(candidate.region, dbWine.region);
  const country = softFieldScore(candidate.country, dbWine.country);
  const color = colorCompatibility(candidate.color, dbWine.color);
  const label = Math.max(
    similarity(candidateLabel, dbLabel),
    tokenOverlapScore(candidateLabel, dbLabel)
  );
  const price = priceScore(candidate.price, dbWine.price);
  const vintage = vintageScore(candidate.vintage, dbWine.vintage);

  let total =
    name * 44 +
    producer * 16 +
    region * 10 +
    country * 8 +
    Math.max(color, 0) * 6 +
    label * 12 +
    price * 8 +
    Math.max(vintage, 0) * 6;

  if (name >= 0.82 && producer >= 0.72) total += 8;
  if (name >= 0.82 && region >= 0.7) total += 5;
  if (price >= 0.8 && vintage > 0) total += 4;

  if (color < 0) total -= 10;
  if (vintage < 0) total -= 6;

  const reasons: string[] = [];

  if (name >= 0.88) reasons.push("nom très proche");
  else if (name >= 0.74) reasons.push("nom compatible OCR");

  if (producer >= 0.75) reasons.push("producteur cohérent");
  if (region >= 0.72) reasons.push("région cohérente");
  if (country >= 0.72) reasons.push("pays cohérent");
  if (price >= 0.8) reasons.push("prix proche");
  if (vintage > 0.9) reasons.push("millésime identique");
  if (color > 0.9) reasons.push("couleur identique");

  return {
    total,
    reasons,
    breakdown: {
      name,
      producer,
      region,
      country,
      color,
      label,
      price,
      vintage,
    },
  };
}

export function findBestDbMatch(
  candidate: OcrWineCandidate,
  dbWines: DbWine[]
): DbMatchResult {
  if (!dbWines.length) {
    return {
      wine: null,
      confidence: 0,
      reason: "aucune base disponible",
    };
  }

  const scored = dbWines
    .map((wine) => {
      const result = computeWineMatchScore(candidate, wine);
      return {
        wine,
        total: result.total,
        reasons: result.reasons,
        breakdown: result.breakdown,
      };
    })
    .sort((a, b) => b.total - a.total);

  const best = scored[0];
  const second = scored[1];

  if (!best) {
    return {
      wine: null,
      confidence: 0,
      reason: "aucun match trouvé",
    };
  }

  const gap = second ? best.total - second.total : best.total;
  const confidence = Math.max(
    0,
    Math.min(100, Math.round(best.total + Math.min(gap, 20)))
  );

  const hasStrongName =
    best.breakdown.name >= 0.74 || best.breakdown.label >= 0.78;
  const hasSupportSignals =
    best.breakdown.producer >= 0.65 ||
    best.breakdown.region >= 0.65 ||
    best.breakdown.country >= 0.65 ||
    best.breakdown.price >= 0.55 ||
    best.breakdown.vintage > 0.3;

  const accepted =
    (best.total >= 58 && hasStrongName) ||
    (best.total >= 52 && hasStrongName && hasSupportSignals);

  if (!accepted) {
    return {
      wine: null,
      confidence,
      reason: "matching insuffisant",
    };
  }

  return {
    wine: best.wine,
    confidence,
    reason: best.reasons.join(", ") || "match OCR tolérant",
  };
}