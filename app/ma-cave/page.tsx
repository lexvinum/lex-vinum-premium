import { getAllWines, getCellarItems } from "@/lib/wines";
import MaCaveClient from "./ma-cave-client";

export const dynamic = "force-dynamic";

function parseStringArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      return trimmed
        .split(/[;,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

export default async function MaCavePage() {
  const [items, wines] = await Promise.all([getCellarItems(), getAllWines()]);

  const normalizedItems = items.map((item: any) => ({
    ...item,
    wine: {
      ...item.wine,
      aromas: parseStringArray(item.wine.aromasJson),
      tags: parseStringArray(item.wine.tagsJson),
    },
  }));

  const normalizedWines = wines.map((wine: any) => ({
    ...wine,
    aromas:
      "aromas" in wine
        ? parseStringArray(wine.aromas)
        : parseStringArray(wine.aromasJson),
    tags:
      "tags" in wine
        ? parseStringArray(wine.tags)
        : parseStringArray(wine.tagsJson),
  }));

  return (
    <MaCaveClient
      initialItems={normalizedItems}
      wines={normalizedWines}
    />
  );
}