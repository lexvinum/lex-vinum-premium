import type { EnrichedWine } from "@/lib/wine-style-engine";

export type UserTasteProfile = {
  color?: string;
  maxPrice?: number;
  body?: number;
  acidity?: number;
  tannin?: number;
  minerality?: number;
  fruit?: number;
  dish?: string;
};

export type RankedWine = {
  wine: EnrichedWine;
  score: number;
  reasons: string[];
  pairingScore: number;
  valueScore: number;
};

export function scoreDishPairing(wine: EnrichedWine, dish?: string) {
  if (!dish) return { score: 0, reasons: [] as string[] };

  const d = dish.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  if (/hu[iî]tre|crustac|fruit de mer|poisson/.test(d)) {
    if ((wine.acidity || 0) >= 3) {
      score += 12;
      reasons.push("fraîcheur idéale pour les produits marins");
    }
    if ((wine.minerality || 0) >= 3) {
      score += 10;
      reasons.push("profil minéral très adapté");
    }
    if (wine.color === "blanc") {
      score += 8;
      reasons.push("style naturellement cohérent avec le plat");
    }
  }

  if (/volaille|poulet|cr[eè]me|p[âa]tes/.test(d)) {
    if ((wine.body || 0) >= 2 && (wine.body || 0) <= 3) {
      score += 10;
      reasons.push("texture adaptée au plat");
    }
  }

  if (/boeuf|bœuf|steak|agneau|canard/.test(d)) {
    if (wine.color === "rouge") {
      score += 10;
      reasons.push("couleur cohérente avec le plat");
    }
    if ((wine.tannin || 0) >= 2) {
      score += 10;
      reasons.push("structure suffisante pour le plat");
    }
  }

  return { score, reasons };
}

export function scoreWineForUser(
  wine: EnrichedWine,
  profile: UserTasteProfile
): RankedWine {
  let score = 0;
  const reasons: string[] = [];

  if (profile.color && wine.color === profile.color) {
    score += 20;
    reasons.push("couleur recherchée");
  }

  if (profile.maxPrice !== undefined && wine.price !== undefined) {
    if (wine.price <= profile.maxPrice) {
      score += 18;
      reasons.push("dans le budget");
    } else {
      const over = wine.price - profile.maxPrice;
      score -= Math.min(20, over * 0.8);
    }
  }

  if (profile.body !== undefined && wine.body !== undefined) {
    const diff = Math.abs(profile.body - wine.body);
    score += Math.max(0, 15 - diff * 5);
    if (diff <= 1) reasons.push("corps cohérent");
  }

  if (profile.acidity !== undefined && wine.acidity !== undefined) {
    const diff = Math.abs(profile.acidity - wine.acidity);
    score += Math.max(0, 15 - diff * 5);
    if (diff <= 1) reasons.push("acidité cohérente");
  }

  if (profile.tannin !== undefined && wine.tannin !== undefined) {
    const diff = Math.abs(profile.tannin - wine.tannin);
    score += Math.max(0, 12 - diff * 4);
    if (diff <= 1) reasons.push("structure cohérente");
  }

  if (profile.minerality !== undefined && wine.minerality !== undefined) {
    const diff = Math.abs(profile.minerality - wine.minerality);
    score += Math.max(0, 12 - diff * 4);
    if (diff <= 1) reasons.push("belle minéralité");
  }

  if (profile.fruit !== undefined && wine.fruit !== undefined) {
    const diff = Math.abs(profile.fruit - wine.fruit);
    score += Math.max(0, 10 - diff * 3);
    if (diff <= 1) reasons.push("profil fruité cohérent");
  }

  const pairing = scoreDishPairing(wine, profile.dish);
  score += pairing.score;

  const confidenceBonus = Math.round((wine.confidence || 0) * 15);
  score += confidenceBonus;

  const valueScore =
    wine.price && wine.price > 0 ? Math.round((score / wine.price) * 100) : 0;

  return {
    wine,
    score: Math.round(score),
    reasons: [...new Set([...reasons, ...pairing.reasons])],
    pairingScore: pairing.score,
    valueScore,
  };
}

export function rankWinesForUser(
  wines: EnrichedWine[],
  profile: UserTasteProfile
) {
  return wines
    .map((wine) => scoreWineForUser(wine, profile))
    .sort((a, b) => b.score - a.score);
}

export function buildPremiumSelections(ranked: RankedWine[]) {
  const bestOverall = ranked[0];

  const bestValue = [...ranked]
    .filter((item) => item.wine.price !== undefined)
    .sort((a, b) => b.valueScore - a.valueScore)[0];

  const safest = [...ranked].sort(
    (a, b) => (b.wine.confidence || 0) - (a.wine.confidence || 0)
  )[0];

  const adventurous = [...ranked]
    .filter(
      (item) =>
        (item.wine.styleTags || []).includes("nature") ||
        (item.wine.styleTags || []).includes("épicé") ||
        (item.wine.styleTags || []).includes("salin")
    )
    .sort((a, b) => b.score - a.score)[0];

  return {
    bestOverall,
    bestValue,
    safest,
    adventurous,
  };
}