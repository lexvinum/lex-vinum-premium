export function splitIntoWineCandidates(text: string) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const line of lines) {
    // ignore lignes trop courtes
    if (line.length < 5) continue;

    // ignore prix seuls
    if (/^\d+([.,]\d{2})?$/.test(line)) continue;

    candidates.push(line);
  }

  return candidates;
}