"use client";

import Image from "next/image";
import { ChangeEvent, useMemo, useState } from "react";
import { buildPremiumRecommendationExplanation } from "@/lib/recommendation-explainer";

type Preferences = {
  color: string;
  budget: string;
  body: string;
  acidity: string;
  tannin: string;
  minerality: string;
  aroma: string;
  dish: string;
};

type OcrWordPayload = {
  text: string;
  confidence?: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

type OcrLinePayload = {
  text: string;
  confidence?: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  words: OcrWordPayload[];
};

type DetectedWine = {
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

type RankedWine = {
  wine: DetectedWine;
  score: number;
  reasons: string[];
  pairingScore?: number;
  valueScore?: number;
  breakdown?: Record<string, number>;
};

type PremiumSelections = {
  bestOverall?: RankedWine;
  bestValue?: RankedWine;
  safest?: RankedWine;
  adventurous?: RankedWine;
};

type ExtractApiResponse = {
  success: boolean;
  extractedText?: string;
  linesCount?: number;
  wines?: DetectedWine[];
  rankedWines?: RankedWine[];
  premiumSelections?: PremiumSelections;
  error?: string;
};

const INITIAL_PREFERENCES: Preferences = {
  color: "",
  budget: "",
  body: "",
  acidity: "",
  tannin: "",
  minerality: "",
  aroma: "",
  dish: "",
};

function mapTesseractLines(result: any): OcrLinePayload[] {
  const lines = Array.isArray(result?.data?.lines) ? result.data.lines : [];
  const text = String(result?.data?.text || "");

  const mapped = lines
    .map((line: any) => {
      const bbox = line?.bbox || {};
      const words = Array.isArray(line?.words) ? line.words : [];

      return {
        text: String(line?.text || "").trim(),
        confidence:
          typeof line?.confidence === "number"
            ? line.confidence
            : typeof line?.conf === "number"
              ? line.conf
              : undefined,
        bbox: {
          x0: Number(bbox.x0 || 0),
          y0: Number(bbox.y0 || 0),
          x1: Number(bbox.x1 || 0),
          y1: Number(bbox.y1 || 0),
        },
        words: words.map((word: any) => {
          const wordBox = word?.bbox || {};
          return {
            text: String(word?.text || "").trim(),
            confidence:
              typeof word?.confidence === "number"
                ? word.confidence
                : typeof word?.conf === "number"
                  ? word.conf
                  : undefined,
            bbox: {
              x0: Number(wordBox.x0 || 0),
              y0: Number(wordBox.y0 || 0),
              x1: Number(wordBox.x1 || 0),
              y1: Number(wordBox.y1 || 0),
            },
          };
        }),
      };
    })
    .filter((line: OcrLinePayload) => line.text.length > 0);

  if (mapped.length > 0) return mapped;

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      text: line,
      confidence: undefined,
      bbox: {
        x0: 0,
        y0: index * 24,
        x1: 1000,
        y1: index * 24 + 18,
      },
      words: [],
    }));
}

async function runStructuredOcr(file: File) {
  const Tesseract = (await import("tesseract.js")).default;

  const result = await Tesseract.recognize(file, "fra+eng", {
    logger: () => {},
  });

  return {
    text: String(result?.data?.text || ""),
    lines: mapTesseractLines(result),
  };
}

function formatWineMeta(wine: DetectedWine) {
  return [
    wine.producer,
    wine.vintage,
    wine.region,
    wine.country,
    wine.grape,
    wine.color,
    typeof wine.price === "number" ? `${wine.price} $` : wine.priceText,
  ]
    .filter(Boolean)
    .join(" • ");
}

export default function ScanPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const [draftPreferences, setDraftPreferences] =
    useState<Preferences>(INITIAL_PREFERENCES);
  const [appliedPreferences, setAppliedPreferences] =
    useState<Preferences>(INITIAL_PREFERENCES);
  const [hasPendingPreferenceChanges, setHasPendingPreferenceChanges] =
    useState(false);

  const [ocrText, setOcrText] = useState("");
  const [ocrLines, setOcrLines] = useState<OcrLinePayload[]>([]);
  const [detectedWines, setDetectedWines] = useState<DetectedWine[]>([]);

  const [loadingOcr, setLoadingOcr] = useState(false);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [error, setError] = useState("");

  const [rankedWines, setRankedWines] = useState<RankedWine[]>([]);
  const [premiumSelections, setPremiumSelections] =
    useState<PremiumSelections | null>(null);

  const displayedWines = useMemo(() => {
    return rankedWines.length ? rankedWines.map((r) => r.wine) : detectedWines;
  }, [rankedWines, detectedWines]);

  const bestRankedWine = useMemo(() => {
    return premiumSelections?.bestOverall || rankedWines[0] || null;
  }, [premiumSelections, rankedWines]);

  const premiumExplanation = useMemo(() => {
    if (!bestRankedWine || rankedWines.length === 0) return null;

    try {
      return buildPremiumRecommendationExplanation({
        best: bestRankedWine,
        ranked: rankedWines,
        preferences: appliedPreferences,
      });
    } catch {
      return null;
    }
  }, [bestRankedWine, rankedWines, appliedPreferences]);

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K]
  ) {
    setDraftPreferences((prev) => ({ ...prev, [key]: value }));
    setHasPendingPreferenceChanges(true);
  }

  function resetAll() {
    setSelectedFile(null);
    setPreviewUrl("");
    setOcrText("");
    setOcrLines([]);
    setDetectedWines([]);
    setRankedWines([]);
    setPremiumSelections(null);
    setError("");
    setDraftPreferences(INITIAL_PREFERENCES);
    setAppliedPreferences(INITIAL_PREFERENCES);
    setHasPendingPreferenceChanges(false);
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;

    setError("");
    setOcrText("");
    setOcrLines([]);
    setDetectedWines([]);
    setRankedWines([]);
    setPremiumSelections(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl("");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleExtractWines(
    extractedText: string,
    lines: OcrLinePayload[],
    preferencesToUse: Preferences
  ) {
    setLoadingExtraction(true);

    try {
      setDetectedWines([]);
      setRankedWines([]);
      setPremiumSelections(null);

      const res = await fetch("/api/scan/extract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extractedText,
          lines,
          preferences: preferencesToUse,
        }),
      });

      const data: ExtractApiResponse = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Erreur extraction vins");
      }

      setDetectedWines(Array.isArray(data.wines) ? data.wines : []);
      setRankedWines(Array.isArray(data.rankedWines) ? data.rankedWines : []);
      setPremiumSelections(data.premiumSelections || null);
    } finally {
      setLoadingExtraction(false);
    }
  }

  async function handleAnalyze(forcedPreferences?: Preferences) {
    try {
      setError("");
      setOcrText("");
      setOcrLines([]);
      setDetectedWines([]);
      setRankedWines([]);
      setPremiumSelections(null);

      if (!selectedFile) {
        setError("Veuillez d’abord choisir une image.");
        return;
      }

      const preferencesToUse = forcedPreferences ?? appliedPreferences;

      setLoadingOcr(true);

      const ocr = await runStructuredOcr(selectedFile);

      setOcrText(ocr.text);
      setOcrLines(ocr.lines);
      setLoadingOcr(false);

      await handleExtractWines(ocr.text, ocr.lines, preferencesToUse);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue pendant l’analyse.";

      setError(message);
      setLoadingOcr(false);
      setLoadingExtraction(false);
    }
  }

  async function handleStartScan() {
    setAppliedPreferences(draftPreferences);
    setHasPendingPreferenceChanges(false);
    await handleAnalyze(draftPreferences);
  }

  async function handleApplyPreferenceChanges() {
    const nextPreferences = { ...draftPreferences };
    setAppliedPreferences(nextPreferences);
    setHasPendingPreferenceChanges(false);

    if (!ocrText.trim()) return;

    await handleExtractWines(ocrText, ocrLines, nextPreferences);
  }

  return (
    <main className="bg-[#efebe3] px-5 py-8 text-[#1f1a17] md:px-10 md:py-10 xl:px-14">
      <section className="overflow-hidden rounded-[34px] border border-[#d9d0c3] bg-[#f6f1e8] shadow-[0_24px_80px_rgba(31,26,23,0.05)]">
        <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative min-h-[560px] overflow-hidden bg-[#223328] p-8 text-[#ece4d8] md:p-12">
            <Image
              src="/images/lifestyle-1.jpeg"
              alt="Ambiance vin et recommandation"
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(18,29,22,0.20),rgba(18,29,22,0.82))]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="max-w-3xl">
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#d9ccb8]">
                  Scan intelligent
                </p>

                <h1 className="mt-5 font-serif text-5xl leading-[0.94] text-[#f4ede3] md:text-6xl">
                  Lire une carte des vins,
                  <span className="block font-light italic text-[#d7ccb9]">
                    avec l’œil d’un sommelier privé.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-[15px] leading-8 text-[#ddd4c8]">
                  Téléverse une photo de carte, laisse Lex Vinum interpréter les
                  vins détectés, puis affine la sélection selon ton goût, ton
                  budget et le contexte du repas.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <FeatureGlassCard
                  eyebrow="Lecture OCR"
                  title="Détection structurée"
                />
                <FeatureGlassCard
                  eyebrow="Profil gustatif"
                  title="Affinage sur mesure"
                />
                <FeatureGlassCard
                  eyebrow="Analyse premium"
                  title="Recommandation finale"
                />
              </div>
            </div>
          </div>

          <div className="bg-[#f5efe6] p-6 md:p-8">
            <div className="flex h-full flex-col rounded-[30px] border border-[#ddd3c6] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_16px_50px_rgba(31,26,23,0.04)] backdrop-blur-sm md:p-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#7f7367]">
                  Téléversement
                </p>
                <h2 className="mt-4 font-serif text-3xl leading-tight text-[#221c18]">
                  Dépose une image de la carte
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#5d544b]">
                  Une photo droite, nette et bien éclairée améliore fortement la
                  lecture OCR et la qualité de la recommandation.
                </p>
              </div>

              <label className="mt-6 flex min-h-[290px] cursor-pointer items-center justify-center overflow-hidden rounded-[26px] border border-[#d9d0c3] bg-[#ece5da] p-4 transition hover:bg-[#e7dfd3]">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Aperçu de la carte des vins"
                    className="max-h-[500px] w-auto rounded-[20px] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
                  />
                ) : (
                  <div className="px-6 text-center">
                    <p className="text-base font-medium text-[#231d19]">
                      Clique pour choisir une photo
                    </p>
                    <p className="mt-2 text-sm text-[#6b6156]">
                      JPG, PNG ou toute image lisible par le navigateur
                    </p>
                  </div>
                )}
              </label>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleStartScan}
                  disabled={!selectedFile || loadingOcr || loadingExtraction}
                  className="rounded-full bg-[#1f2d23] px-6 py-3 text-sm font-medium text-[#f4ede3] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingOcr
                    ? "Lecture OCR en cours..."
                    : loadingExtraction
                      ? "Analyse en cours..."
                      : "Scanner la carte"}
                </button>

                {(selectedFile ||
                  ocrText ||
                  detectedWines.length > 0 ||
                  rankedWines.length > 0) && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="rounded-full border border-[#d7cfc2] bg-white px-6 py-3 text-sm font-medium text-[#2a221d] transition hover:bg-[#f1eadf]"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>

              {error && (
                <div className="mt-5 rounded-[18px] border border-[rgba(180,74,54,0.18)] bg-[rgba(180,74,54,0.07)] px-4 py-3 text-sm text-[#8d3f33]">
                  {error}
                </div>
              )}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <MiniEditorialTile
                  image="/images/editorial-1.jpeg"
                  title="Conseil"
                  text="Privilégie une photo frontale, sans reflet."
                />
                <MiniEditorialTile
                  image="/images/lifestyle-2.jpeg"
                  title="Résultat"
                  text="Ajuste ensuite les préférences pour recalculer."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 overflow-hidden rounded-[32px] border border-[#d6dcca] bg-[#edf2ea] shadow-[0_18px_60px_rgba(31,26,23,0.04)]">
        <div className="grid lg:grid-cols-[0.32fr_0.68fr]">
          <div className="relative min-h-[250px] overflow-hidden">
            <Image
              src="/images/terroir-1.jpeg"
              alt="Univers du terroir"
              fill
              unoptimized
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 30vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,29,22,0.62),rgba(18,29,22,0.18))]" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#d8d1c5]">
                Profil de dégustation
              </p>
              <h2 className="mt-3 max-w-xs font-serif text-3xl leading-[1.02] text-[#f4ede3]">
                Préférences en pleine largeur, avant la lecture finale.
              </h2>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#5f6d55]">
                  Ajustement sur mesure
                </p>
                <h3 className="mt-3 font-serif text-4xl leading-[0.96] text-[#1f2a24]">
                  Préférences
                </h3>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[#4d5a48]">
                  Définis ton style recherché avant le scan ou modifie-le après
                  analyse pour recalculer la recommandation sans relancer toute
                  la lecture OCR.
                </p>
              </div>

              <div className="rounded-full border border-[#cfdbca] bg-[rgba(255,255,255,0.72)] px-4 py-2 text-sm text-[#50604b]">
                Profil gustatif personnalisé
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SelectField
                label="Couleur"
                value={draftPreferences.color}
                onChange={(value) => updatePreference("color", value)}
                options={["", "rouge", "blanc", "rosé", "orange"]}
              />

              <SelectField
                label="Budget"
                value={draftPreferences.budget}
                onChange={(value) => updatePreference("budget", value)}
                options={["", "15", "25", "40", "60", "80", "120", "160"]}
              />

              <SelectField
                label="Corps"
                value={draftPreferences.body}
                onChange={(value) => updatePreference("body", value)}
                options={["", "léger", "moyen", "ample"]}
              />

              <SelectField
                label="Acidité"
                value={draftPreferences.acidity}
                onChange={(value) => updatePreference("acidity", value)}
                options={["", "faible", "moyenne", "élevée"]}
              />

              <SelectField
                label="Tanins"
                value={draftPreferences.tannin}
                onChange={(value) => updatePreference("tannin", value)}
                options={["", "souples", "moyens", "marqués"]}
              />

              <SelectField
                label="Minéralité"
                value={draftPreferences.minerality}
                onChange={(value) => updatePreference("minerality", value)}
                options={["", "faible", "moyenne", "élevée"]}
              />

              <InputField
                label="Arôme"
                value={draftPreferences.aroma}
                onChange={(value) => updatePreference("aroma", value)}
                placeholder="ex. fruits noirs, floral, agrumes"
              />

              <InputField
                label="Plat"
                value={draftPreferences.dish}
                onChange={(value) => updatePreference("dish", value)}
                placeholder="ex. steak, homard, pâtes, sushi"
              />
            </div>

            <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-3 sm:grid-cols-2 lg:max-w-2xl">
                <SoftInfoCard>
                  Tu peux scanner directement avec ces paramètres, puis ajuster
                  ensuite si ton envie change.
                </SoftInfoCard>
                <SoftInfoCard>
                  Le bouton de mise à jour recalcule la recommandation à partir
                  de l’analyse déjà lue.
                </SoftInfoCard>
              </div>

              <button
                type="button"
                onClick={handleApplyPreferenceChanges}
                disabled={
                  !hasPendingPreferenceChanges ||
                  loadingExtraction ||
                  !ocrText.trim()
                }
                className="rounded-full bg-[#1f2a24] px-6 py-3 text-sm font-medium text-[#f3ece1] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingExtraction
                  ? "Mise à jour..."
                  : "Mettre à jour la recommandation"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="overflow-hidden rounded-[30px] border border-[#d7cfc2] bg-[#f6f2eb] shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
          <div className="relative h-[230px]">
            <Image
              src="/images/editorial-1.jpeg"
              alt="Lecture de carte"
              fill
              unoptimized
              loading="lazy"
              sizes="(max-width: 1280px) 100vw, 40vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,29,22,0.62),rgba(18,29,22,0.10))]" />
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#d9d0c3]">
                Lecture de la carte
              </p>
              <h2 className="mt-3 max-w-lg font-serif text-4xl leading-[0.96] text-[#f4ede3]">
                Les vins détectés et classés à partir de la carte analysée.
              </h2>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
                  Résultats détectés
                </p>
                <h3 className="mt-3 font-serif text-3xl leading-[0.98] text-[#221c18]">
                  Lecture de la carte
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5c544b]">
                  Voici les options retenues à partir du scan et, lorsqu’elles
                  sont disponibles, les raisons qui soutiennent leur classement.
                </p>
              </div>

              <div className="rounded-full border border-[#d7cfc2] bg-white px-4 py-2 text-xs text-[#554b43]">
                {displayedWines.length} vins
              </div>
            </div>

            {displayedWines.length === 0 ? (
              <div className="mt-6 rounded-[22px] border border-[#e2dbcf] bg-white p-5 text-sm text-[#514740]">
                Aucun vin détecté pour l’instant.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {displayedWines.map((wine, index) => {
                  const rankedItem =
                    rankedWines.find((item) => item.wine.id === wine.id) ||
                    rankedWines[index];

                  return (
                    <div
                      key={wine.id || `${wine.name}-${index}`}
                      className="rounded-[22px] border border-[#e2dbcf] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.03)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[#1f1b18]">
                            {wine.name || "Nom partiel à confirmer"}
                          </p>

                          <p className="mt-1 text-sm leading-7 text-[#4a4038]">
                            {formatWineMeta(wine) || "Informations partielles"}
                          </p>

                          {!!wine.styleTags?.length && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {wine.styleTags.slice(0, 6).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-[#d7ded2] bg-[#f4f7f2] px-3 py-1 text-[11px] text-[#4d5c4b]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {rankedItem?.reasons?.length ? (
                            <div className="mt-3 space-y-1 text-xs leading-6 text-[#584e46]">
                              {rankedItem.reasons.slice(0, 2).map((reason, i) => (
                                <p key={`${reason}-${i}`}>• {reason}</p>
                              ))}
                            </div>
                          ) : null}
                        </div>

                        {rankedItem && (
                          <div className="shrink-0 rounded-[16px] border border-[#e2dbcf] bg-[#f9f6f1] px-4 py-3 text-right">
                            <p className="text-[10px] uppercase tracking-[0.2em] text-[#786c61]">
                              Score
                            </p>
                            <p className="mt-1 text-lg font-semibold text-[#1f1b18]">
                              {rankedItem.score}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-8">
          {bestRankedWine ? (
            <section className="overflow-hidden rounded-[30px] border border-[#d7cfc2] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
              <div className="grid lg:grid-cols-[1.08fr_0.92fr]">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
                        Recommandation principale
                      </p>

                      <h2 className="mt-4 font-serif text-4xl leading-[0.95] text-[#221c18] md:text-5xl">
                        {bestRankedWine.wine.name}
                      </h2>

                      <p className="mt-3 text-sm leading-7 text-[#5c544b]">
                        {formatWineMeta(bestRankedWine.wine)}
                      </p>
                    </div>

                    <div className="rounded-[22px] border border-[#d8dfd4] bg-[#edf1eb] px-5 py-4 text-right">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#5c6658]">
                        Score
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-[#1f1b18]">
                        {bestRankedWine.score}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-[22px] border border-[#d8dfd4] bg-[#f4f7f2] p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#5c6658]">
                        Pourquoi ce vin
                      </p>
                      <div className="mt-4 space-y-2 text-sm leading-7 text-[#4f463e]">
                        {bestRankedWine.reasons?.length ? (
                          bestRankedWine.reasons.map((reason, index) => (
                            <p key={`${reason}-${index}`}>• {reason}</p>
                          ))
                        ) : (
                          <p>
                            • Très bon alignement global avec les préférences et
                            la carte détectée.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[22px] border border-[#d8dfd4] bg-[#f4f7f2] p-5">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#5c6658]">
                        Lecture sommelier
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {bestRankedWine.wine.styleTags?.length ? (
                          bestRankedWine.wine.styleTags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-[#d8dfd4] bg-white px-3 py-1 text-xs text-[#41503f]"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-[#d8dfd4] bg-white px-3 py-1 text-xs text-[#41503f]">
                            Profil en cours d’enrichissement
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {premiumExplanation && (
                    <div className="mt-6 rounded-[26px] border border-[#e3dacd] bg-[#f8f3ec] p-5 md:p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
                            Analyse sommelier premium
                          </p>
                          <h3 className="mt-2 font-serif text-3xl leading-[0.96] text-[#221c18]">
                            Pourquoi c’est le meilleur choix ici
                          </h3>
                        </div>

                        <div className="rounded-full border border-[#ddd1c2] bg-white px-4 py-2 text-sm text-[#554b43]">
                          Confiance : {premiumExplanation.confidenceLabel}
                        </div>
                      </div>

                      <p className="mt-5 text-sm leading-8 text-[#5c544b]">
                        {premiumExplanation.sommelierExplanation}
                      </p>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[20px] border border-[rgba(180,74,54,0.18)] bg-[rgba(180,74,54,0.05)] p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#8b4b40]">
                            Pièges à éviter
                          </p>
                          <div className="mt-4 space-y-2 text-sm leading-7 text-[#5c544b]">
                            {premiumExplanation.pitfalls.length > 0 ? (
                              premiumExplanation.pitfalls.map((item, index) => (
                                <p key={`${item}-${index}`}>• {item}</p>
                              ))
                            ) : (
                              <p>
                                • Aucun piège majeur détecté parmi les options
                                les plus cohérentes.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-[20px] border border-[#e2dbcf] bg-white p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#786c61]">
                            Phrase prête à dire au serveur
                          </p>
                          <div className="mt-4 rounded-[16px] border border-[#e2dbcf] bg-[#f9f6f1] p-4">
                            <p className="text-sm italic leading-7 text-[#5c544b]">
                              “{premiumExplanation.serverSentence}”
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    {premiumSelections?.bestValue && (
                      <SelectionMiniCard
                        label="Meilleure valeur"
                        wine={premiumSelections.bestValue.wine}
                      />
                    )}

                    {premiumSelections?.safest && (
                      <SelectionMiniCard
                        label="Option sûre"
                        wine={premiumSelections.safest.wine}
                      />
                    )}

                    {premiumSelections?.adventurous && (
                      <SelectionMiniCard
                        label="Choix audacieux"
                        wine={premiumSelections.adventurous.wine}
                      />
                    )}
                  </div>
                </div>

                <div className="relative min-h-[320px] overflow-hidden bg-[#223328]">
                  <Image
                    src="/images/lifestyle-2.jpeg"
                    alt="Recommandation premium"
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,29,22,0.72),rgba(18,29,22,0.12))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.34em] text-[#d9ccb8]">
                      Lecture finale
                    </p>
                    <p className="mt-3 max-w-sm font-serif text-3xl leading-[1.02] text-[#f4ede3]">
                      Une recommandation plus éditoriale, plus claire, plus
                      assumée.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="overflow-hidden rounded-[30px] border border-[#d7cfc2] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
              <div className="relative h-[220px]">
                <Image
                  src="/images/lifestyle-2.jpeg"
                  alt="Analyse premium"
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(max-width: 1280px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,29,22,0.62),rgba(18,29,22,0.10))]" />
              </div>

              <div className="p-6 md:p-8">
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
                  Recommandation
                </p>
                <h2 className="mt-3 font-serif text-3xl leading-[0.98] text-[#221c18]">
                  La recommandation apparaîtra ici après analyse
                </h2>
                <p className="mt-4 text-sm leading-7 text-[#5c544b]">
                  Scanne d’abord une carte des vins pour faire émerger la
                  sélection principale, les meilleures alternatives et
                  l’explication premium.
                </p>
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-[30px] border border-[#d7cfc2] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.04)]">
            <div className="grid md:grid-cols-[0.95fr_1.05fr]">
              <div className="relative min-h-[260px] overflow-hidden">
                <Image
                  src="/images/editorial-1.jpeg"
                  alt="Conseils de service"
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(max-width: 1024px) 100vw, 35vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(18,29,22,0.62),rgba(18,29,22,0.08))]" />
              </div>

              <div className="p-6 md:p-8">
                <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
                  Conseils de service
                </p>
                <h3 className="mt-3 font-serif text-3xl leading-[0.98] text-[#221c18]">
                  Comment utiliser l’analyse
                </h3>

                <div className="mt-5 space-y-3 text-sm leading-7 text-[#5c544b]">
                  <p>
                    Commence par scanner la carte avec les paramètres qui te
                    ressemblent le plus.
                  </p>
                  <p>
                    Si tu ajustes ensuite le budget, le plat ou le style
                    recherché, utilise le bouton pour recalculer la
                    recommandation.
                  </p>
                  <p>
                    L’analyse priorise la cohérence globale entre la carte
                    détectée, ton profil gustatif et le contexte du repas.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function FeatureGlassCard({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(255,255,255,0.14)] bg-[rgba(255,255,255,0.08)] p-5 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[#d9ccb8]">
        {eyebrow}
      </p>
      <p className="mt-3 font-serif text-2xl text-[#f4ede3]">{title}</p>
    </div>
  );
}

function MiniEditorialTile({
  image,
  title,
  text,
}: {
  image: string;
  title: string;
  text: string;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#ddd3c6] bg-white">
      <div className="relative h-[108px]">
        <Image
          src={image}
          alt={title}
          fill
          unoptimized
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#7a7165]">
          {title}
        </p>
        <p className="mt-2 text-sm leading-6 text-[#5c544b]">{text}</p>
      </div>
    </div>
  );
}

function SoftInfoCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-[#cfdbca] bg-[rgba(255,255,255,0.72)] px-4 py-4 text-sm leading-7 text-[#4d5a48]">
      {children}
    </div>
  );
}

function SelectionMiniCard({
  label,
  wine,
}: {
  label: string;
  wine: DetectedWine;
}) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-[#cfd8ca] bg-[#edf1eb] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
      <p className="text-xs uppercase tracking-[0.2em] text-[#5f6d55]">
        {label}
      </p>
      <p className="mt-2 font-medium text-[#1f1b18]">{wine.name}</p>
      <p className="mt-1 text-sm leading-7 text-[#494039]">
        {formatWineMeta(wine) || "Profil en cours de confirmation"}
      </p>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#4e5b49]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[18px] border border-[#cfd8ca] bg-[rgba(255,255,255,0.86)] px-4 py-3 text-sm text-[#1f2a24] outline-none transition focus:border-[#a7b59f] focus:bg-[#f8fbf7]"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option}>
            {option || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#4e5b49]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[18px] border border-[#cfd8ca] bg-[rgba(255,255,255,0.86)] px-4 py-3 text-sm text-[#1f2a24] outline-none transition placeholder:text-[#7d8a77] focus:border-[#a7b59f] focus:bg-[#f8fbf7]"
      />
    </label>
  );
}