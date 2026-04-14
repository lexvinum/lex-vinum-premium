export type OcrCandidateWine = {
  rawLine: string;
  normalizedLine: string;
  guessedName: string;
  vintage?: string;
  price?: number;
};

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[|]/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDisplayText(value: string) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractVintage(line: string) {
  const match = line.match(/\b(19\d{2}|20\d{2})\b/);
  return match?.[1];
}

function extractPrice(line: string) {
  const matches = [...line.matchAll(/(?:\$|cad)?\s?(\d{2,3})(?:[.,](\d{2}))?/gi)];
  if (!matches.length) return undefined;

  const last = matches[matches.length - 1];
  const integer = last[1];
  const decimals = last[2];

  const value = Number(`${integer}${decimals ? `.${decimals}` : ""}`);
  return Number.isFinite(value) ? value : undefined;
}

function looksLikeNoise(line: string) {
  const text = normalizeText(line);

  if (!text) return true;
  if (text.length < 6) return true;

  const bannedPatterns = [
    /menu/,
    /cocktail/,
    /biere/,
    /beer/,
    /spiritueux/,
    /digestif/,
    /dessert/,
    /cafe/,
    /merci/,
    /taxes?/,
    /pourboire/,
    /verre/,
    /bouteille/,
    /oz\b/,
    /ml\b/,
    /cl\b/,
    /importation privee/,
    /vin au verre/,
    /mousseux/,
  ];

  if (bannedPatterns.some((pattern) => pattern.test(text))) return true;

  return false;
}

function seemsLikeWineLine(line: string) {
  const text = normalizeText(line);

  if (looksLikeNoise(text)) return false;

  const hasVintage = /\b(19\d{2}|20\d{2})\b/.test(text);
  const hasPrice = /(?:\$|cad)?\s?\d{2,3}(?:[.,]\d{2})?/.test(text);

  const wineWords = [
    "chateau",
    "domaine",
    "tenuta",
    "villa",
    "cuvée",
    "cuvee",
    "reserve",
    "riserva",
    "grand cru",
    "premier cru",
    "bourgogne",
    "bordeaux",
    "rioja",
    "barolo",
    "barbaresco",
    "chianti",
    "champagne",
    "pinot",
    "merlot",
    "syrah",
    "grenache",
    "chardonnay",
    "riesling",
    "sancerre",
    "chablis",
    "cotes",
    "côte",
    "valpolicella",
    "amarone",
    "morgon",
    "fleurie",
    "gevrey",
    "vosne",
    "meursault",
    "pommard",
  ];

  const hasWineWord = wineWords.some((word) => text.includes(normalizeText(word)));
  const enoughWords = text.split(" ").length >= 2;

  return enoughWords && (hasVintage || hasPrice || hasWineWord);
}

function cleanCandidateName(line: string) {
  let value = cleanDisplayText(line);

  value = value.replace(/\b(19\d{2}|20\d{2})\b/g, " ");
  value = value.replace(/(?:\$|cad)?\s?\d{2,3}(?:[.,]\d{2})?/gi, " ");
  value = value.replace(/\s+/g, " ").trim();

  return value;
}

export function extractWineCandidatesFromOcr(rawText: string): OcrCandidateWine[] {
  const rawLines = String(rawText || "")
    .split("\n")
    .map((line) => cleanDisplayText(line))
    .filter(Boolean);

  const mergedLines: string[] = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const current = rawLines[i];
    const next = rawLines[i + 1];

    const currentLooksPartial =
      current.length < 34 &&
      !/\b(19\d{2}|20\d{2})\b/.test(current) &&
      !/(?:\$|cad)?\s?\d{2,3}(?:[.,]\d{2})?/.test(current);

    const nextLooksComplementary =
      !!next &&
      next.length < 90 &&
      (/\b(19\d{2}|20\d{2})\b/.test(next) ||
        /(?:\$|cad)?\s?\d{2,3}(?:[.,]\d{2})?/.test(next) ||
        /^[A-ZÀ-ÿa-z]/.test(next));

    if (currentLooksPartial && nextLooksComplementary) {
      mergedLines.push(`${current} ${next}`.replace(/\s+/g, " ").trim());
      i += 1;
      continue;
    }

    mergedLines.push(current);
  }

  const candidates: OcrCandidateWine[] = [];

  for (const line of mergedLines) {
    if (!seemsLikeWineLine(line)) continue;

    const guessedName = cleanCandidateName(line);
    if (!guessedName || guessedName.length < 5) continue;
    if (normalizeText(guessedName).split(" ").length < 2) continue;

    candidates.push({
      rawLine: line,
      normalizedLine: normalizeText(line),
      guessedName,
      vintage: extractVintage(line),
      price: extractPrice(line),
    });
  }

  const unique = new Map<string, OcrCandidateWine>();

  for (const item of candidates) {
    const key = `${normalizeText(item.guessedName)}__${item.vintage || ""}__${item.price || ""}`;
    if (!unique.has(key)) unique.set(key, item);
  }

  return [...unique.values()].slice(0, 80);
}