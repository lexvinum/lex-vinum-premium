import type { OcrCandidateWine } from "@/lib/ocr-wine-parser";

type WineRecord = {
  id: string;
  name: string;
  producer?: string | null;
  region?: string | null;
  country?: string | null;
  grape?: string | null;
  vintage?: string | null;
  price?: number | null;
  color?: string | null;
  body?: number | null;
  acidity?: number | null;
  tannin?: number | null;
  minerality?: number | null;
  sweetness?: number | null;
  aromas?: string[] | null;
  imageUrl?: string | null;
  slug?: string | null;
};

export type MatchedWine = {
  wine: WineRecord;
  candidate: OcrCandidateWine;
  matchScore: number;
  matchReasons: string[];
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1);
}

function intersectCount(a: string[], b: string[]) {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item)).length;
}

function buildWineSearchBlob(wine: WineRecord) {
  return [
    wine.name,
    wine.producer,
    wine.region,
    wine.country,
    wine.grape,
    wine.vintage,
  ]
    .filter(Boolean)
    .join(" ");
}

export function matchOcrCandidatesToWines(
  candidates: OcrCandidateWine[],
  wines: WineRecord[],
): MatchedWine[] {
  const matches: MatchedWine[] = [];

  for (const candidate of candidates) {
    const candidateTokens = tokenize(candidate.guessedName);
    if (!candidateTokens.length) continue;

    let best: MatchedWine | null = null;

    for (const wine of wines) {
      const blob = buildWineSearchBlob(wine);
      const wineTokens = tokenize(blob);

      if (!wineTokens.length) continue;

      const common = intersectCount(candidateTokens, wineTokens);
      const tokenRatio = common / Math.max(candidateTokens.length, 1);

      let score = 0;
      const reasons: string[] = [];

      if (tokenRatio >= 0.34) {
        score += Math.round(tokenRatio * 100);
        reasons.push(`Tokens communs: ${common}`);
      }

      const normalizedCandidateName = normalizeText(candidate.guessedName);
      const normalizedWineName = normalizeText(wine.name);

      if (
        normalizedCandidateName.includes(normalizedWineName) ||
        normalizedWineName.includes(normalizedCandidateName)
      ) {
        score += 45;
        reasons.push("Nom très proche");
      }

      if (candidate.vintage && wine.vintage && String(wine.vintage) === String(candidate.vintage)) {
        score += 20;
        reasons.push("Millésime identique");
      }

      if (
        typeof candidate.price === "number" &&
        typeof wine.price === "number" &&
        Math.abs(candidate.price - wine.price) <= 3
      ) {
        score += 15;
        reasons.push("Prix proche");
      }

      if (candidateTokens.length >= 2 && common >= 2) {
        score += 20;
      }

      if (score < 45) continue;

      if (!best || score > best.matchScore) {
        best = {
          wine,
          candidate,
          matchScore: score,
          matchReasons: reasons,
        };
      }
    }

    if (best) matches.push(best);
  }

  const deduped = new Map<string, MatchedWine>();

  for (const match of matches.sort((a, b) => b.matchScore - a.matchScore)) {
    if (!deduped.has(match.wine.id)) {
      deduped.set(match.wine.id, match);
    }
  }

  return [...deduped.values()].sort((a, b) => b.matchScore - a.matchScore);
}