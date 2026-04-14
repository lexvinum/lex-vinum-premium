import type { Wine } from "@prisma/client";

export type RecommendationPreferences = {
  color?: string;
  maxPrice?: number;
  body?: number;
  acidity?: number;
  tannin?: number;
  minerality?: number;
  sweetness?: number;
  aroma?: string;
};

export type RankedWine = {
  wine: Wine;
  score: number;
  reasons: string[];
};

function normalizeText(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function parseScaleValue(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    const match = trimmed.match(/(\d+(\.\d+)?)/);
    if (!match) return null;

    const parsed = Number(match[1]);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function parseArrayField(value: string | null | undefined): string[] {
  if (!value) return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item)).filter(Boolean);
    }
  } catch {
    return trimmed
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function scoreNumeric(
  preference?: number,
  wineValue?: string | number | null
) {
  if (preference === undefined || preference === null) return 0;

  const parsedWineValue = parseScaleValue(wineValue);
  if (parsedWineValue === null) return 0;

  const diff = Math.abs(preference - parsedWineValue);

  if (diff === 0) return 18;
  if (diff === 1) return 12;
  if (diff === 2) return 6;
  return 0;
}

export function rankWines(
  wines: Wine[],
  preferences: RecommendationPreferences
): RankedWine[] {
  const aromaWanted = normalizeText(preferences.aroma);

  return wines
    .map((wine) => {
      let score = 0;
      const reasons: string[] = [];

      if (preferences.color) {
        const wantedColor = normalizeText(preferences.color);
        const wineColor = normalizeText(wine.color);

        if (wantedColor && wineColor === wantedColor) {
          score += 30;
          reasons.push(`couleur ${wine.color}`);
        }
      }

      if (preferences.maxPrice !== undefined && preferences.maxPrice !== null) {
        if (wine.price !== null && wine.price !== undefined) {
          if (wine.price <= preferences.maxPrice) {
            score += 20;
            reasons.push(`dans le budget (${wine.price} $)`);
          } else {
            const over = wine.price - preferences.maxPrice;
            if (over <= 10) {
              score += 5;
              reasons.push("légèrement au-dessus du budget");
            } else {
              score -= 20;
            }
          }
        }
      }

      const bodyScore = scoreNumeric(preferences.body, wine.body);
      if (bodyScore > 0) {
        score += bodyScore;
        reasons.push("corps compatible");
      }

      const acidityScore = scoreNumeric(preferences.acidity, wine.acidity);
      if (acidityScore > 0) {
        score += acidityScore;
        reasons.push("acidité compatible");
      }

      const tanninScore = scoreNumeric(preferences.tannin, wine.tannin);
      if (tanninScore > 0) {
        score += tanninScore;
        reasons.push("tanins compatibles");
      }

      const mineralityScore = scoreNumeric(preferences.minerality, wine.minerality);
      if (mineralityScore > 0) {
        score += mineralityScore;
        reasons.push("minéralité compatible");
      }

      const sweetnessScore = scoreNumeric(preferences.sweetness, wine.sugar);
      if (sweetnessScore > 0) {
        score += sweetnessScore;
        reasons.push("sucrosité compatible");
      }

      if (aromaWanted) {
        const aromaPool = [
          ...parseArrayField(wine.aromasJson),
          ...parseArrayField(wine.tagsJson),
        ]
          .map((item) => normalizeText(item))
          .filter(Boolean)
          .join(" ");

        if (aromaPool.includes(aromaWanted)) {
          score += 22;
          reasons.push("arômes recherchés");
        }
      }

      return {
        wine,
        score,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}