import type { WineCandidate } from "@/lib/ocr-layout-parser";

export type EnrichedWine = WineCandidate & {
  body?: number;
  acidity?: number;
  tannin?: number;
  minerality?: number;
  sweetness?: number;
  fruit?: number;
  oak?: number;
  funkiness?: number;
  styleTags?: string[];
};

export function enrichWineStyle(wine: WineCandidate): EnrichedWine {
  const text = [
    wine.name,
    wine.producer,
    wine.region,
    wine.country,
    wine.grape,
    wine.color,
    wine.rawText,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  let body = 2;
  let acidity = 2;
  let tannin = wine.color === "rouge" ? 2 : 0;
  let minerality = 1;
  let sweetness = 0;
  let fruit = 2;
  let oak = 0;
  let funkiness = 0;

  const tags: string[] = [];

  if (text.includes("muscadet")) {
    body = 1;
    acidity = 4;
    minerality = 4;
    fruit = 1;
    tags.push("vif", "minéral", "salin");
  }

  if (text.includes("beaujolais")) {
    body = 2;
    acidity = 3;
    tannin = 1;
    fruit = 4;
    tags.push("fruité", "souple");
  }

  if (text.includes("bourgogne blanc") || text.includes("chardonnay")) {
    body = 3;
    acidity = 3;
    minerality = Math.max(minerality, 2);
    fruit = 3;
    tags.push("élégant", "gastronomique");
  }

  if (text.includes("alsace")) {
    acidity = Math.max(acidity, 3);
    fruit = Math.max(fruit, 3);
    tags.push("aromatique");
  }

  if (text.includes("rhone") || text.includes("rhône")) {
    body = Math.max(body, 3);
    fruit = Math.max(fruit, 3);
    tags.push("ample");
  }

  if (text.includes("loire")) {
    acidity = Math.max(acidity, 3);
    minerality = Math.max(minerality, 2);
    tags.push("tendu");
  }

  if (text.includes("chenin")) {
    acidity = Math.max(acidity, 3);
    fruit = Math.max(fruit, 2);
    tags.push("structuré");
  }

  if (text.includes("sauvignon")) {
    acidity = Math.max(acidity, 4);
    body = Math.min(body, 2);
    minerality = Math.max(minerality, 2);
    tags.push("tranchant");
  }

  if (text.includes("riesling")) {
    acidity = 4;
    minerality = Math.max(minerality, 3);
    tags.push("précis");
  }

  if (text.includes("pinot noir")) {
    body = Math.min(Math.max(body, 2), 3);
    tannin = 1;
    fruit = Math.max(fruit, 3);
    tags.push("élégant");
  }

  if (text.includes("cabernet sauvignon")) {
    body = 4;
    tannin = 4;
    fruit = Math.max(fruit, 3);
    tags.push("structuré");
  }

  if (text.includes("syrah")) {
    body = Math.max(body, 3);
    tannin = Math.max(tannin, 3);
    tags.push("épicé");
  }

  if (text.includes("nature") || text.includes("nat")) {
    funkiness = 2;
    tags.push("nature");
  }

  if (wine.color === "blanc") {
    tannin = 0;
  }

  if (wine.color === "rosé") {
    tannin = 0;
    body = Math.min(body, 2);
    fruit = Math.max(fruit, 3);
  }

  return {
    ...wine,
    body,
    acidity,
    tannin,
    minerality,
    sweetness,
    fruit,
    oak,
    funkiness,
    styleTags: [...new Set(tags)],
  };
}