export type ScanWine = {
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
};

export type UserPreferences = {
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

export type RankedWineLike = {
  wine: ScanWine;
  score: number;
  reasons?: string[];
  pairingScore?: number;
  valueScore?: number;
  breakdown?: Record<string, number>;
};

export type ProScoreBreakdown = {
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

export type PremiumRecommendationExplanation = {
  sommelierExplanation: string;
  pitfalls: string[];
  serverSentence: string;
  confidenceLabel: "Très forte" | "Forte" | "Moyenne";
  proBreakdown: ProScoreBreakdown;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .trim();
}

function normalizeColor(color?: string) {
  const c = normalizeText(color || "");

  if (c.includes("roug")) return "rouge";
  if (c.includes("blan")) return "blanc";
  if (c.includes("rose")) return "rosé";
  if (c.includes("orang")) return "orange";
  if (
    c.includes("efferv") ||
    c.includes("mouss") ||
    c.includes("spark") ||
    c.includes("bulle") ||
    c.includes("champ")
  ) {
    return "effervescent";
  }

  return c;
}

function normalizeBudget(budget?: string) {
  if (!budget) return null;
  const match = budget.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;

  const value = Number(match[1].replace(",", "."));
  if (Number.isNaN(value)) return null;

  return value;
}

function normalizeScaleValue(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    return clamp(Math.round(value), 1, 5);
  }

  const v = normalizeText(value);

  const map: Record<string, number> = {
    "tres leger": 1,
    "leger": 2,
    "moyen": 3,
    "moyenne": 3,
    "ample": 5,
    "faible": 1,
    "souple": 1,
    "souples": 1,
    "moyens": 3,
    "moyen+": 4,
    "marque": 5,
    "marques": 5,
    "elevee": 5,
    "eleve": 5,
    "sec": 1,
    "demi-sec": 3,
    "moelleux": 4,
    "doux": 5,
  };

  if (map[v] !== undefined) return map[v];

  const num = Number(v.replace(",", "."));
  if (!Number.isNaN(num)) {
    return clamp(Math.round(num), 1, 5);
  }

  return null;
}

function structureFitAxis(wineValue?: number | null, prefValue?: string | number | null) {
  const w = normalizeScaleValue(wineValue ?? null);
  const p = normalizeScaleValue(prefValue ?? null);

  if (w === null && p === null) return 65;
  if (w === null || p === null) return 65;

  const distance = Math.abs(w - p);
  return clamp(Math.round(100 - distance * 22), 0, 100);
}

function styleScore(wine: ScanWine, prefs: UserPreferences) {
  const desiredColor = normalizeColor(prefs.color);
  const wineColor = normalizeColor(wine.color);

  if (!desiredColor) return 72;
  if (!wineColor) return 52;
  if (desiredColor === wineColor) return 100;

  if (
    (desiredColor === "blanc" && wineColor === "effervescent") ||
    (desiredColor === "effervescent" && wineColor === "blanc")
  ) {
    return 70;
  }

  return 28;
}

function structureScore(wine: ScanWine, prefs: UserPreferences) {
  const axes = [
    structureFitAxis(wine.body, prefs.body),
    structureFitAxis(wine.acidity, prefs.acidity),
    structureFitAxis(wine.tannin, prefs.tannin),
    structureFitAxis(wine.minerality, prefs.minerality),
    structureFitAxis(wine.sweetness, prefs.sweetness),
  ];

  return Math.round(average(axes));
}

function aromaScore(wine: ScanWine, prefs: UserPreferences) {
  const desired = normalizeText(prefs.aroma || "");
  if (!desired) return 68;

  const tokens = desired.split(/[,\s/]+/).filter(Boolean);
  if (!tokens.length) return 68;

  const haystack = normalizeText(
    [
      ...(wine.aromas || []),
      ...(wine.styleTags || []),
      wine.wineProfile || "",
      wine.rawText || "",
      wine.grape || "",
      wine.region || "",
      wine.country || "",
    ].join(" ")
  );

  const hits = tokens.filter((token) => haystack.includes(token));
  if (!hits.length) return 25;

  return clamp(Math.round((hits.length / tokens.length) * 100), 25, 100);
}

function pairingScore(wine: ScanWine, prefs: UserPreferences) {
  const dish = normalizeText(prefs.dish || "");
  if (!dish) return 70;

  let score = 55;

  const isRed = normalizeColor(wine.color) === "rouge";
  const isWhite = normalizeColor(wine.color) === "blanc";
  const isRose = normalizeColor(wine.color) === "rosé";
  const isSparkling = normalizeColor(wine.color) === "effervescent";

  const body = normalizeScaleValue(wine.body) ?? 3;
  const acidity = normalizeScaleValue(wine.acidity) ?? 3;
  const tannin = normalizeScaleValue(wine.tannin) ?? 2;
  const sweetness = normalizeScaleValue(wine.sweetness) ?? 1;

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
    if ((wine.styleTags || []).some((tag) => normalizeText(tag).includes("bois"))) score += 8;
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

function priceScore(wine: ScanWine, prefs: UserPreferences) {
  const budget = normalizeBudget(prefs.budget);
  const price = wine.price ?? null;

  if (!budget || !price) return 72;
  if (price <= budget) return 100;

  const delta = price - budget;
  if (delta <= 5) return 82;
  if (delta <= 10) return 62;
  if (delta <= 20) return 38;
  return 15;
}

function confidenceScore(wine: ScanWine) {
  if (typeof wine.confidence !== "number") return 68;
  return clamp(Math.round(wine.confidence * 100), 20, 100);
}

function complexityScore(wine: ScanWine) {
  let score = 50;

  const aromaCount = (wine.aromas || []).length;
  if (aromaCount >= 4) score += 14;
  else if (aromaCount >= 2) score += 8;

  const tags = (wine.styleTags || []).map((tag) => normalizeText(tag));

  if (tags.some((tag) => tag.includes("miner"))) score += 8;
  if (tags.some((tag) => tag.includes("gastronom"))) score += 10;
  if (tags.some((tag) => tag.includes("bois"))) score += 6;
  if (tags.some((tag) => tag.includes("structure"))) score += 8;
  if (tags.some((tag) => tag.includes("tendu"))) score += 8;

  if ((normalizeScaleValue(wine.body) ?? 0) >= 4) score += 4;
  if ((normalizeScaleValue(wine.acidity) ?? 0) >= 4) score += 4;
  if ((normalizeScaleValue(wine.tannin) ?? 0) >= 4) score += 4;

  return clamp(score, 0, 100);
}

function computePenalty(wine: ScanWine, prefs: UserPreferences) {
  let penalty = 0;

  const desiredColor = normalizeColor(prefs.color);
  const wineColor = normalizeColor(wine.color);
  const budget = normalizeBudget(prefs.budget);

  if (desiredColor && wineColor && desiredColor !== wineColor) {
    penalty += 18;
  }

  if (budget && wine.price && wine.price > budget + 10) {
    penalty += 10;
  }

  const wantedTannin = normalizeScaleValue(prefs.tannin);
  const wineTannin = normalizeScaleValue(wine.tannin);

  if (wantedTannin !== null && wineTannin !== null && Math.abs(wantedTannin - wineTannin) >= 3) {
    penalty += 8;
  }

  const wantedBody = normalizeScaleValue(prefs.body);
  const wineBody = normalizeScaleValue(wine.body);

  if (wantedBody !== null && wineBody !== null && Math.abs(wantedBody - wineBody) >= 3) {
    penalty += 7;
  }

  const wantedAcidity = normalizeScaleValue(prefs.acidity);
  const wineAcidity = normalizeScaleValue(wine.acidity);

  if (
    wantedAcidity !== null &&
    wineAcidity !== null &&
    Math.abs(wantedAcidity - wineAcidity) >= 3
  ) {
    penalty += 7;
  }

  return clamp(penalty, 0, 40);
}

function computeProBreakdown(wine: ScanWine, prefs: UserPreferences): ProScoreBreakdown {
  const styleFit = styleScore(wine, prefs);
  const structureFit = structureScore(wine, prefs);
  const aromaFit = aromaScore(wine, prefs);
  const pairingFit = pairingScore(wine, prefs);
  const priceFit = priceScore(wine, prefs);
  const complexityFit = complexityScore(wine);
  const confidenceFit = confidenceScore(wine);
  const penalty = computePenalty(wine, prefs);

  const total = clamp(
    Math.round(
      styleFit * 0.14 +
        structureFit * 0.23 +
        aromaFit * 0.11 +
        pairingFit * 0.2 +
        priceFit * 0.1 +
        complexityFit * 0.12 +
        confidenceFit * 0.1 -
        penalty
    ),
    0,
    100
  );

  return {
    styleFit,
    structureFit,
    aromaFit,
    pairingFit,
    priceFit,
    complexityFit,
    confidenceFit,
    penalty,
    total,
  };
}

function describeBodyLevel(body?: number | null) {
  const value = normalizeScaleValue(body);
  if (value === null) return "une structure équilibrée";
  if (value <= 2) return "une matière plutôt légère";
  if (value === 3) return "une structure équilibrée";
  if (value >= 4) return "une matière plus ample";
  return "une structure cohérente";
}

function describeAcidityLevel(acidity?: number | null) {
  const value = normalizeScaleValue(acidity);
  if (value === null) return "une fraîcheur bien intégrée";
  if (value <= 2) return "une acidité plus douce";
  if (value === 3) return "une fraîcheur bien intégrée";
  if (value >= 4) return "une acidité vive";
  return "une fraîcheur cohérente";
}

function describeTanninLevel(tannin?: number | null) {
  const value = normalizeScaleValue(tannin);
  if (value === null) return "des tanins mesurés";
  if (value <= 2) return "des tanins souples";
  if (value === 3) return "des tanins équilibrés";
  if (value >= 4) return "des tanins plus présents";
  return "des tanins cohérents";
}

function buildSommelierExplanation(
  wine: ScanWine,
  prefs: UserPreferences,
  breakdown: ProScoreBreakdown
) {
  const identity = [
    wine.name,
    wine.vintage || "",
    [wine.region, wine.country].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" ");

  const parts: string[] = [];

  parts.push(`${identity} ressort comme le choix le plus cohérent sur la carte.`);

  if (breakdown.styleFit >= 85 && prefs.color) {
    parts.push(`La couleur demandée est bien respectée, ce qui évite de partir sur un style hors cible dès le départ.`);
  }

  if (breakdown.structureFit >= 80) {
    parts.push(
      `Sur le plan du profil, le vin présente ${describeBodyLevel(wine.body)}, ${describeAcidityLevel(
        wine.acidity
      )}${
        normalizeColor(wine.color) === "rouge"
          ? ` et ${describeTanninLevel(wine.tannin)}`
          : ""
      }, ce qui colle très bien à la recherche actuelle.`
    );
  } else if (breakdown.structureFit >= 65) {
    parts.push(
      `Son profil structurel reste bien aligné avec les préférences, sans être extrême dans un sens ou dans l’autre.`
    );
  }

  if (breakdown.aromaFit >= 75 && prefs.aroma) {
    parts.push(
      `Le registre aromatique rejoint bien l’idée recherchée autour de “${prefs.aroma}”, ce qui renforce la cohérence du choix.`
    );
  }

  if (breakdown.pairingFit >= 82 && prefs.dish) {
    parts.push(
      `Avec ${prefs.dish}, c’est un accord particulièrement pertinent : le vin a le bon niveau d’intensité, de fraîcheur et de relief pour accompagner le plat sans le dominer.`
    );
  } else if (breakdown.pairingFit >= 70 && prefs.dish) {
    parts.push(
      `Pour ${prefs.dish}, l’accord reste solide et logique, avec une bonne compatibilité générale à table.`
    );
  }

  if (breakdown.priceFit >= 80 && wine.price) {
    parts.push(
      `En plus, le prix reste cohérent avec le budget visé, ce qui en fait un choix très rationnel dans cette carte.`
    );
  } else if (wine.price && breakdown.priceFit >= 60) {
    parts.push(
      `Même sans être l’option la moins chère, il garde un bon équilibre entre qualité pressentie, style et pertinence à table.`
    );
  }

  if (breakdown.complexityFit >= 72) {
    parts.push(
      `Il apporte aussi assez de relief pour donner une impression plus sérieuse et plus “sommelier” qu’un choix simplement correct.`
    );
  }

  return parts.join(" ");
}

function buildPitfalls(bestWine: ScanWine, ranked: RankedWineLike[], prefs: UserPreferences) {
  const pitfalls: string[] = [];
  const otherWines = ranked.slice(1, 6).map((item) => item.wine);

  const desiredColor = normalizeColor(prefs.color);
  const budget = normalizeBudget(prefs.budget);
  const desiredTannin = normalizeScaleValue(prefs.tannin);
  const desiredBody = normalizeScaleValue(prefs.body);

  const hasWrongColor = !!desiredColor && otherWines.some((wine) => normalizeColor(wine.color) !== desiredColor);
  const hasOverBudget = !!budget && otherWines.some((wine) => typeof wine.price === "number" && wine.price > budget + 10);
  const hasTooTannic =
    desiredTannin !== null &&
    otherWines.some((wine) => {
      const wt = normalizeScaleValue(wine.tannin);
      return wt !== null && wt - desiredTannin >= 2;
    });

  const hasTooHeavy =
    desiredBody !== null &&
    otherWines.some((wine) => {
      const wb = normalizeScaleValue(wine.body);
      return wb !== null && wb - desiredBody >= 2;
    });

  if (hasWrongColor) {
    pitfalls.push(
      "Évite les bouteilles qui paraissent séduisantes sur la carte mais qui partent dans une autre couleur ou un autre registre que celui recherché."
    );
  }

  if (hasOverBudget) {
    pitfalls.push(
      "Attention aux options nettement plus chères : sur une carte, le prix supérieur ne garantit pas un meilleur accord ni un meilleur plaisir dans ce contexte précis."
    );
  }

  if (hasTooTannic) {
    pitfalls.push(
      "Méfie-toi des rouges plus tanniques que nécessaire : ils peuvent durcir l’accord et rendre l’ensemble plus fatigant à table."
    );
  }

  if (hasTooHeavy) {
    pitfalls.push(
      "Un vin trop ample ou trop massif risquerait de prendre trop de place et de faire perdre la finesse recherchée."
    );
  }

  if ((normalizeScaleValue(bestWine.acidity) ?? 0) >= 4) {
    pitfalls.push(
      "À l’inverse, une option plus molle et moins tendue pourrait sembler rapidement lourde ou manquer de relief en bouche."
    );
  }

  return pitfalls.slice(0, 3);
}

function buildServerSentence(wine: ScanWine, prefs: UserPreferences) {
  const base = [`Je vais prendre ${wine.name}`];

  const descriptors = [wine.color, wine.region, wine.country].filter(Boolean).join(" ");
  if (descriptors) {
    base.push(`, le ${descriptors.toLowerCase()}`);
  }

  if (prefs.dish) {
    base.push(` pour accompagner ${prefs.dish}`);
  }

  base.push(`, s’il vous plaît.`);

  return base.join("");
}

function confidenceFromGap(best: RankedWineLike, second?: RankedWineLike): "Très forte" | "Forte" | "Moyenne" {
  if (!second) return "Très forte";

  const gap = best.score - second.score;
  if (gap >= 15) return "Très forte";
  if (gap >= 7) return "Forte";
  return "Moyenne";
}

export function buildPremiumRecommendationExplanation(params: {
  best: RankedWineLike;
  ranked: RankedWineLike[];
  preferences: UserPreferences;
}): PremiumRecommendationExplanation {
  const { best, ranked, preferences } = params;

  const proBreakdown = computeProBreakdown(best.wine, preferences);
  const sommelierExplanation = buildSommelierExplanation(best.wine, preferences, proBreakdown);
  const pitfalls = buildPitfalls(best.wine, ranked, preferences);
  const serverSentence = buildServerSentence(best.wine, preferences);
  const confidenceLabel = confidenceFromGap(best, ranked[1]);

  return {
    sommelierExplanation,
    pitfalls,
    serverSentence,
    confidenceLabel,
    proBreakdown,
  };
}