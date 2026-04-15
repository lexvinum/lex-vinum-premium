import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import SafeWineImage from "@/components/wine/SafeWineImage";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const VALID_WINE_COLORS = [
  "Rouge",
  "Blanc",
  "Rosé",
  "Rose",
  "Mousseux",
  "Effervescent",
  "Orange",
] as const;

const EXCLUDED_NAME_TERMS = [
  "amaretto",
  "bière",
  "biere",
  "ipa",
  "lager",
  "stout",
  "porter",
  "ale",
  "cidre",
  "hydromel",
  "cooler",
  "limonade",
  "sour",
  "gin",
  "vodka",
  "rhum",
  "rum",
  "whisky",
  "whiskey",
  "liqueur",
  "crème",
  "creme",
  "tequila",
  "mezcal",
  "brandy",
  "cognac",
  "armagnac",
  "aperitif",
  "apéritif",
  "cocktail",
  "hard seltzer",
  "microbrasserie",
  "clamato",
  "caesar",
  "saké",
  "sake",
  "boisson",
  "prêt-à-boire",
  "pret a boire",
  "prêt a boire",
  "miel",
  "miellerie",
  "crème artisanale",
  "cream",
  "liqueur de",
  "spiritueux",
  "soju",
  "baijiu",
  "grappa",
  "amaro",
  "pastis",
  "ouzo",
];

const POSITIVE_WINE_TERMS = [
  "vin",
  "wine",
  "rouge",
  "blanc",
  "rosé",
  "rose",
  "orange",
  "mousseux",
  "effervescent",
  "champagne",
  "cava",
  "prosecco",
  "porto",
  "port",
  "madere",
  "madère",
  "sherry",
  "jerez",
  "riesling",
  "chardonnay",
  "pinot",
  "pinot noir",
  "pinot grigio",
  "pinot gris",
  "sauvignon",
  "sauvignon blanc",
  "cabernet",
  "cabernet sauvignon",
  "cabernet franc",
  "merlot",
  "syrah",
  "grenache",
  "malbec",
  "tempranillo",
  "sangiovese",
  "nebbiolo",
  "chenin",
  "viognier",
  "gewurztraminer",
  "gewürztraminer",
  "muscadet",
  "albarino",
  "albariño",
  "chablis",
  "bourgogne",
  "bordeaux",
  "chianti",
  "barolo",
  "rioja",
  "sancerre",
  "cotes du rhone",
  "côtes du rhône",
  "aoc",
  "aop",
  "doc",
  "docg",
  "igt",
  "igp",
  "appellation",
];

function parseArrayField(value: unknown): string[] {
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
      // continue
    }

    return trimmed
      .split(/[;,|]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function formatPrice(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;

  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLabel(value: string | null | undefined) {
  if (!value) return null;
  return value.replace(/_/g, " ").trim();
}

function normalizeText(value?: string | null) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hasRealImageUrl(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  return /^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed);
}

function resolveWineImage(wine: {
  image?: string | null;
  color?: string | null;
  isQuebec?: boolean | null;
}) {
  if (hasRealImageUrl(wine.image)) return wine.image!.trim();

  const color = normalizeText(wine.color);

  if (wine.isQuebec) return "/images/terroir-1.jpeg";
  if (color.includes("rouge")) return "/images/editorial-1.jpeg";
  if (color.includes("blanc")) return "/images/lifestyle-2.jpeg";
  if (color.includes("rose") || color.includes("rosé")) return "/images/editorial-2.jpeg";
  if (
    color.includes("mousseux") ||
    color.includes("bulle") ||
    color.includes("effervescent")
  ) {
    return "/images/grid-2.jpeg";
  }

  return "/images/lifestyle-1.jpeg";
}

function containsAnyTerm(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function isStrictWineCandidate(wine: {
  name?: string | null;
  color?: string | null;
  grape?: string | null;
  appellationOrigine?: string | null;
  designationReglementee?: string | null;
}) {
  const normalizedName = normalizeText(wine.name);
  const normalizedColor = normalizeText(wine.color);
  const normalizedGrape = normalizeText(wine.grape);
  const normalizedAppellation = normalizeText(wine.appellationOrigine);
  const normalizedDesignation = normalizeText(wine.designationReglementee);

  const searchable = [
    normalizedName,
    normalizedColor,
    normalizedGrape,
    normalizedAppellation,
    normalizedDesignation,
  ]
    .filter(Boolean)
    .join(" | ");

  if (!searchable) return false;

  if (containsAnyTerm(searchable, EXCLUDED_NAME_TERMS)) {
    return false;
  }

  const hasValidColor = VALID_WINE_COLORS.some(
    (item) => normalizeText(item) === normalizedColor
  );

  if (!hasValidColor) {
    return false;
  }

  const hasStrongStructuredWineSignal =
    normalizedGrape.length > 0 ||
    normalizedAppellation.length > 0 ||
    normalizedDesignation.length > 0;

  const hasSemanticWineSignal = containsAnyTerm(searchable, POSITIVE_WINE_TERMS);

  return hasStrongStructuredWineSignal || hasSemanticWineSignal;
}

function parseScaleValue(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.max(0, Math.min(5, value));
  }

  if (typeof value === "string") {
    const match = value.match(/(\d+(\.\d+)?)/);
    if (!match) return null;

    const parsed = Number(match[1]);
    if (Number.isNaN(parsed)) return null;

    return Math.max(0, Math.min(5, parsed));
  }

  return null;
}

function getBadgeList(wine: {
  isQuebec?: boolean | null;
  featured?: boolean | null;
  color?: string | null;
  style?: string | null;
  image?: string | null;
}) {
  const badges: string[] = [];

  if (wine.isQuebec) badges.push("Québec");
  if (wine.featured) badges.push("Sélection");
  if (wine.color?.toLowerCase().includes("bulle")) badges.push("Bulles");
  if (wine.style?.toLowerCase().includes("nature")) badges.push("Nature");
  if (hasRealImageUrl(wine.image)) badges.push("Image SAQ");

  return badges;
}

function buildStory(wine: {
  producer?: string | null;
  region?: string | null;
  country?: string | null;
  appellationOrigine?: string | null;
  designationReglementee?: string | null;
  grape?: string | null;
  color?: string | null;
  style?: string | null;
  description?: string | null;
}) {
  if (wine.description?.trim()) return wine.description.trim();

  const originBlock = [
    wine.producer,
    wine.appellationOrigine,
    wine.designationReglementee,
    wine.region,
    wine.country,
  ].filter(Boolean);

  const intro =
    originBlock.length > 0
      ? `${originBlock.join(", ")}.`
      : "Un vin retenu pour son allure, son équilibre et sa capacité à raconter une origine avec élégance.";

  const profile = [
    formatLabel(wine.color ?? undefined),
    formatLabel(wine.style ?? undefined),
    wine.grape,
  ]
    .filter(Boolean)
    .join(" • ");

  if (profile) {
    return `${intro} Cette cuvée présente une expression ${profile.toLowerCase()}, avec une lecture nette du terroir et une présence en bouche pensée pour une dégustation raffinée, lisible et généreuse.`;
  }

  return `${intro} Cette cuvée propose une interprétation précise du terroir, entre finesse, structure et plaisir immédiat à table.`;
}

function buildSommelierLine(wine: {
  color?: string | null;
  grape?: string | null;
  region?: string | null;
  country?: string | null;
  body?: string | number | null;
  acidity?: string | number | null;
}) {
  const body = parseScaleValue(wine.body);
  const acidity = parseScaleValue(wine.acidity);

  const mood =
    body !== null && acidity !== null
      ? body >= 4 && acidity >= 3
        ? "avec de la tenue, de la profondeur et une belle énergie"
        : body <= 2.5 && acidity >= 3
        ? "plus aérien, tendu et très digeste"
        : "équilibré, nuancé et facile à mettre en table"
      : "équilibré et prêt à accompagner un bon repas";

  const parts = [
    formatLabel(wine.color),
    wine.grape,
    [wine.region, wine.country].filter(Boolean).join(", "),
  ].filter(Boolean);

  if (parts.length > 0) {
    return `À demander au serveur : « Je cherche quelque chose comme ${parts.join(" — ")}, ${mood}. »`;
  }

  return `À demander au serveur : « Je cherche un vin ${mood}. »`;
}

function SensorBar({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const safeValue = parseScaleValue(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#5f6f62]">{label}</span>
        <span className="text-[#223229]">
          {safeValue !== null ? `${safeValue}/5` : "—"}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[#d9ddcf]">
        <div
          className="h-full rounded-full bg-[#7a8b7c]"
          style={{ width: `${safeValue !== null ? safeValue * 20 : 0}%` }}
        />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#d7d2c5] pb-3 last:border-b-0 last:pb-0">
      <span className="text-[#6b756c]">{label}</span>
      <span className="text-right text-[#223229]">{value || "—"}</span>
    </div>
  );
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;

  const wine = await prisma.wine.findUnique({
    where: { slug },
    select: {
      name: true,
      producer: true,
      region: true,
      country: true,
      description: true,
      image: true,
      color: true,
      grape: true,
      appellationOrigine: true,
      designationReglementee: true,
      isQuebec: true,
    },
  });

  if (!wine) {
  return {
    title: "Vin introuvable | Lex Vinum",
  };
  }

  const image = resolveWineImage({
    image: wine.image,
    color: wine.color,
    isQuebec: wine.isQuebec,
  });

  return {
    title: `${wine.name} | Lex Vinum`,
    description:
      wine.description ||
      [wine.producer, wine.region, wine.country].filter(Boolean).join(" • "),
    openGraph: {
      title: `${wine.name} | Lex Vinum`,
      description:
        wine.description ||
        [wine.producer, wine.region, wine.country].filter(Boolean).join(" • "),
      images: image ? [image] : [],
    },
  };
}

export default async function WineDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const wine = await prisma.wine.findUnique({
    where: { slug },
  });

  if (!wine) {
  notFound();
  }

  const relatedRaw = await prisma.wine.findMany({
    where: {
      id: { not: wine.id },
      OR: [
        ...(wine.country ? [{ country: wine.country }] : []),
        ...(wine.region ? [{ region: wine.region }] : []),
        ...(wine.color ? [{ color: wine.color }] : []),
        ...(wine.grape ? [{ grape: wine.grape }] : []),
      ],
    },
    take: 12,
    orderBy: [{ featured: "desc" }, { image: "desc" }, { price: "asc" }],
  });

  const relatedWines = relatedRaw
    .filter((item: any) => isStrictWineCandidate(item))
    .slice(0, 4);

  const aromas = parseArrayField(wine.aromasJson);
  const pairingTags = parseArrayField(wine.pairingJson);
  const tags = parseArrayField(wine.tagsJson);
  const badges = getBadgeList(wine);

  const story = buildStory({
    producer: wine.producer,
    region: wine.region,
    country: wine.country,
    appellationOrigine: wine.appellationOrigine,
    designationReglementee: wine.designationReglementee,
    grape: wine.grape,
    color: wine.color,
    style: wine.style,
    description: wine.description,
  });

  const sommelierLine = buildSommelierLine({
    color: wine.color,
    grape: wine.grape,
    region: wine.region,
    country: wine.country,
    body: wine.body,
    acidity: wine.acidity,
  });

  const heroImage = resolveWineImage({
    image: wine.image,
    color: wine.color,
    isQuebec: wine.isQuebec,
  });

  const hasSaqImage = hasRealImageUrl(wine.image);

  return (
    <main className="min-h-screen bg-[#f3efe6] text-[#223229]">
      <section className="relative overflow-hidden border-b border-[#ddd6c7] bg-[radial-gradient(circle_at_top,rgba(122,139,124,0.18),transparent_42%),linear-gradient(180deg,#f7f3eb_0%,#efe8db_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-multiply premium-page-texture" />

        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:py-16">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="/repertoire"
                className="inline-flex items-center gap-2 text-sm text-[#5f6f62] transition hover:text-[#223229]"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Retour au répertoire
              </Link>

              <FavoriteButton slug={wine.slug} size="md" />
            </div>

            <div className="space-y-5">
              <p className="text-xs uppercase tracking-[0.34em] text-[#8a6a52]">
                Fiche vin
              </p>

              <h1 className="max-w-3xl font-serif text-4xl leading-tight text-[#1d2a22] md:text-5xl lg:text-6xl">
                {wine.name}
              </h1>

              <div className="flex flex-wrap gap-3 text-sm text-[#5f6f62]">
                {wine.producer ? <span>{wine.producer}</span> : null}
                {wine.region ? <span>• {wine.region}</span> : null}
                {wine.country ? <span>• {wine.country}</span> : null}
                {wine.vintage ? <span>• {wine.vintage}</span> : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {wine.color ? (
                  <span className="rounded-full border border-[#d7cfbf] bg-[#f7f3eb] px-4 py-2 text-sm text-[#223229]">
                    {formatLabel(wine.color)}
                  </span>
                ) : null}

                {wine.grape ? (
                  <span className="rounded-full border border-[#d7cfbf] bg-[#f7f3eb] px-4 py-2 text-sm text-[#223229]">
                    {formatLabel(wine.grape)}
                  </span>
                ) : null}

                {wine.style ? (
                  <span className="rounded-full border border-[#d7cfbf] bg-[#f7f3eb] px-4 py-2 text-sm text-[#223229]">
                    {formatLabel(wine.style)}
                  </span>
                ) : null}

                {badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-[#c8b9a5] bg-[#ece3d3] px-4 py-2 text-sm text-[#6d4e39]"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-[24px] border border-[#ddd6c7] bg-white/45 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8a6a52]">Prix</p>
                <p className="mt-3 text-3xl font-semibold text-[#1d2a22]">
                  {formatPrice(wine.price) || "—"}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#ddd6c7] bg-white/45 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8a6a52]">
                  Température
                </p>
                <p className="mt-3 text-lg font-medium text-[#223229]">
                  {wine.temperature || "—"}
                </p>
              </div>

              <div className="rounded-[24px] border border-[#ddd6c7] bg-white/45 p-5 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.24em] text-[#8a6a52]">Service</p>
                <p className="mt-3 text-lg font-medium text-[#223229]">
                  {wine.serving || "—"}
                </p>
              </div>
            </div>

            <div className="max-w-3xl space-y-4">
              <p className="text-xs uppercase tracking-[0.3em] text-[#8a6a52]">
                Regard éditorial
              </p>
              <p className="text-base leading-8 text-[#324338]">{story}</p>
            </div>

            <div className="rounded-[24px] border border-[#ddd6c7] bg-[#f8f4ec] p-5 shadow-[0_14px_40px_rgba(58,48,32,0.05)]">
              <p className="text-xs uppercase tracking-[0.24em] text-[#8a6a52]">
                Phrase prête à dire
              </p>
              <p className="mt-3 text-sm leading-7 text-[#324338]">{sommelierLine}</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              {wine.saqUrl ? (
                <a
                  href={wine.saqUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-[#223229] bg-[#223229] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[#f5f1e8] transition hover:opacity-90"
                >
                  Voir sur SAQ
                </a>
              ) : null}

              <Link
                href="/favoris"
                className="inline-flex items-center rounded-full border border-[#d7cfbf] bg-[#f7f3eb] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[#223229] transition hover:bg-white"
              >
                Voir mes favoris
              </Link>
            </div>
          </div>

          <div className="flex items-stretch justify-center">
            <div className="relative flex min-h-[500px] w-full max-w-[620px] items-center justify-center overflow-hidden rounded-[36px] border border-[#ddd6c7] bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.32))] p-6 shadow-[0_30px_80px_rgba(58,48,32,0.12)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.26),transparent_58%)]" />
              <div className="pointer-events-none absolute inset-x-10 bottom-8 h-16 rounded-full bg-[#c9b49a]/25 blur-2xl" />

              <div className="absolute left-5 top-5 z-20 flex flex-wrap gap-2">
                {hasSaqImage ? (
                  <span className="rounded-full border border-[#cdc0ac]/40 bg-[rgba(255,255,255,0.82)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#5f6d55]">
                    Image SAQ
                  </span>
                ) : (
                  <span className="rounded-full border border-[#c8b9a5] bg-[#ece3d3] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#6d4e39]">
                    Visuel éditorial
                  </span>
                )}
              </div>

              <div className="relative z-10 h-full w-full">
                <SafeWineImage
                  src={wine.image}
                  alt={wine.name}
                  className="h-full w-full rounded-[28px]"
                  imageClassName="relative z-10"
                  bottleMode
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-12 lg:py-14">
        <div className="space-y-8">
          <div className="rounded-[30px] border border-[#ddd6c7] bg-[#f8f4ec] p-6 shadow-[0_18px_50px_rgba(58,48,32,0.06)] md:p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-[#8a6a52]">
                  Profil gustatif
                </p>
                <h2 className="mt-2 font-serif text-3xl text-[#1d2a22]">
                  Lecture sensorielle
                </h2>
              </div>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <SensorBar label="Corps" value={wine.body} />
              <SensorBar label="Acidité" value={wine.acidity} />
              <SensorBar label="Tanins" value={wine.tannin} />
              <SensorBar label="Minéralité" value={wine.minerality} />
            </div>
          </div>

          {(aromas.length > 0 || tags.length > 0 || wine.description) && (
            <div className="rounded-[30px] border border-[#ddd6c7] bg-[#f8f4ec] p-6 shadow-[0_18px_50px_rgba(58,48,32,0.06)] md:p-8">
              <p className="text-xs uppercase tracking-[0.28em] text-[#8a6a52]">
                Dégustation
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#1d2a22]">
                Notes & impression
              </h2>

              {wine.description ? (
                <p className="mt-6 leading-8 text-[#324338]">{wine.description}</p>
              ) : null}

              {tags.length > 0 ? (
                <div className="mt-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-[#7a8b7c]">
                    Profil
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[#d7cfbf] bg-white/70 px-4 py-2 text-sm text-[#223229]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {aromas.length > 0 ? (
                <div className="mt-6">
                  <p className="text-sm uppercase tracking-[0.22em] text-[#7a8b7c]">
                    Arômes
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {aromas.map((aroma) => (
                      <span
                        key={aroma}
                        className="rounded-full border border-[#d7cfbf] bg-white/70 px-4 py-2 text-sm text-[#223229]"
                      >
                        {aroma}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {pairingTags.length > 0 ? (
            <div className="rounded-[30px] border border-[#ddd6c7] bg-[#f8f4ec] p-6 shadow-[0_18px_50px_rgba(58,48,32,0.06)] md:p-8">
              <p className="text-xs uppercase tracking-[0.28em] text-[#8a6a52]">
                Table
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#1d2a22]">
                Accords mets-vins
              </h2>

              <div className="mt-6 flex flex-wrap gap-2">
                {pairingTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#d8c8b6] bg-[#efe5d8] px-4 py-2 text-sm text-[#6d4e39]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-8">
          <div className="rounded-[30px] border border-[#ddd6c7] bg-[#f8f4ec] p-6 shadow-[0_18px_50px_rgba(58,48,32,0.06)] md:p-8">
            <p className="text-xs uppercase tracking-[0.28em] text-[#8a6a52]">
              Identité
            </p>
            <h2 className="mt-2 font-serif text-3xl text-[#1d2a22]">
              Informations
            </h2>

            <div className="mt-8 grid gap-4 text-sm">
              <DetailRow label="Producteur" value={wine.producer} />
              <DetailRow label="Pays" value={wine.country} />
              <DetailRow label="Région" value={wine.region} />
              <DetailRow label="Appellation" value={wine.appellationOrigine} />
              <DetailRow
                label="Désignation"
                value={wine.designationReglementee}
              />
              <DetailRow label="Cépage" value={wine.grape} />
              <DetailRow label="Couleur" value={formatLabel(wine.color)} />
              <DetailRow label="Style" value={formatLabel(wine.style)} />
              <DetailRow
                label="Millésime"
                value={wine.vintage ? String(wine.vintage) : "—"}
              />
              <DetailRow
                label="Alcool"
                value={wine.alcohol ? `${wine.alcohol}%` : "—"}
              />
              <DetailRow
                label="Taux de sucre"
                value={wine.tauxSucre ? `${wine.tauxSucre} g/L` : "—"}
              />
              <DetailRow
                label="Format"
                value={wine.formatMl ? `${wine.formatMl} ml` : "—"}
              />
              <DetailRow label="Service" value={wine.serving} />
              <DetailRow label="Température" value={wine.temperature} />
              <DetailRow label="Garde" value={wine.cellar} />
              <DetailRow label="Culture" value={wine.bioType} />
              <DetailRow label="Nature" value={wine.natureType} />
            </div>
          </div>
        </div>
      </section>

      {relatedWines.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8 lg:px-12 lg:pb-20">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#8a6a52]">
                À découvrir
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#1d2a22]">
                Vins similaires
              </h2>
            </div>

            <Link
              href="/repertoire"
              className="text-sm text-[#5f6f62] transition hover:text-[#223229]"
            >
              Voir le répertoire →
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {relatedWines.map((item) => {
              const relatedImage = resolveWineImage({
                image: item.image,
                color: item.color,
                isQuebec: item.isQuebec,
              });

              const relatedHasSaqImage = hasRealImageUrl(item.image);

              return (
                <Link
                  key={item.id}
                  href={`/vins/${item.slug}`}
                  className="group rounded-[28px] border border-[#ddd6c7] bg-[#f8f4ec] p-5 transition hover:-translate-y-0.5 hover:border-[#c7b29b] hover:shadow-[0_18px_40px_rgba(58,48,32,0.08)]"
                >
                  <div className="flex h-[230px] items-center justify-center overflow-hidden rounded-[22px] bg-[#f1ece2] p-4">
                    <SafeWineImage
                      src={wine.image}
                      alt={wine.name}
                      className="h-full w-full rounded-[28px]"
                      imageClassName="relative z-10"
                      bottleMode
                    />
                  </div>

                  <div className="mt-4 space-y-2">
                    <h3 className="line-clamp-2 text-lg font-medium text-[#1d2a22]">
                      {item.name}
                    </h3>

                    <p className="line-clamp-1 text-sm text-[#5f6f62]">
                      {[item.region, item.country].filter(Boolean).join(" • ") || "—"}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-sm text-[#6d4e39]">
                        {item.color ? formatLabel(item.color) : "Vin"}
                      </span>
                      <span className="text-base font-semibold text-[#1d2a22]">
                        {formatPrice(item.price) || "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </main>
  );
}