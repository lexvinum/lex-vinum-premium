import { prisma } from "@/lib/prisma";

function normalize(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value?: string | null) {
  return new Set(normalize(value).split(" ").filter(Boolean));
}

function overlapScore(a?: string | null, b?: string | null) {
  const setA = tokenSet(a);
  const setB = tokenSet(b);

  if (!setA.size || !setB.size) return 0;

  let overlap = 0;
  for (const token of setA) {
    if (setB.has(token)) overlap++;
  }

  return Math.round((overlap / Math.max(setA.size, setB.size)) * 100);
}

export async function matchWineWithDatabase(candidate: {
  name?: string | null;
  producer?: string | null;
  region?: string | null;
  country?: string | null;
  grape?: string | null;
  color?: string | null;
}) {
  const wines = await prisma.wine.findMany();

  let bestWine: (typeof wines)[number] | null = null;
  let bestScore = 0;
  let bestReasons: string[] = [];

  for (const wine of wines) {
    const nameScore = overlapScore(candidate.name, wine.name);
    const producerScore = overlapScore(candidate.producer, wine.producer);
    const regionScore = overlapScore(candidate.region, wine.region);
    const countryScore = overlapScore(candidate.country, wine.country);
    const grapeScore = overlapScore(candidate.grape, wine.grape);
    const colorScore =
      normalize(candidate.color) && normalize(candidate.color) === normalize(wine.color)
        ? 100
        : 0;

    const total = Math.round(
      nameScore * 0.4 +
        producerScore * 0.2 +
        regionScore * 0.15 +
        countryScore * 0.1 +
        grapeScore * 0.1 +
        colorScore * 0.05
    );

    const reasons: string[] = [];
    if (nameScore >= 70) reasons.push("Nom très proche");
    if (producerScore >= 70) reasons.push("Producteur reconnu");
    if (regionScore >= 70) reasons.push("Région cohérente");
    if (countryScore >= 70) reasons.push("Pays cohérent");
    if (grapeScore >= 70) reasons.push("Cépage cohérent");
    if (colorScore === 100) reasons.push("Couleur cohérente");

    if (total > bestScore) {
      bestScore = total;
      bestWine = wine;
      bestReasons = reasons;
    }
  }

  return {
    matchedWine: bestWine,
    confidence: bestScore,
    reasons: bestReasons,
  };
}