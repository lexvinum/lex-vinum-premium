import Image from "next/image";
import { prisma } from "@/lib/prisma";
import RecommandationClient from "@/components/recommandation/RecommandationClient";

function toNullableNumber(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isNaN(value) ? null : value;

  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  const direct = Number(normalized);
  if (!Number.isNaN(direct)) return direct;

  const map: Record<string, number> = {
    leger: 1,
    léger: 1,
    light: 1,
    moyen: 2,
    medium: 2,
    modere: 2,
    modéré: 2,
    corse: 3,
    corsé: 3,
    full: 3,
    puissant: 3,
    intense: 3,
    faible: 1,
    bas: 1,
    low: 1,
    eleve: 3,
    élevé: 3,
    haute: 3,
    high: 3,
  };

  return map[normalized] ?? null;
}

type RecommendationWine = {
  id: string;
  slug: string | null;
  name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  color: string | null;
  style: string | null;
  price: number | null;
  vintage: number | null;
  image: string | null;
  description: string | null;
  featured: boolean;
  isQuebec: boolean;
  body: number | null;
  acidity: number | null;
  tannin: number | null;
  minerality: number | null;
};

function normalizeWineRecord(wine: any): RecommendationWine {
  return {
    ...wine,
    featured: wine.featured ?? false,
    isQuebec: wine.isQuebec ?? false,
    body: toNullableNumber(wine.body),
    acidity: toNullableNumber(wine.acidity),
    tannin: toNullableNumber(wine.tannin),
    minerality: toNullableNumber(wine.minerality),
  };
}

async function getRecommendationWines(): Promise<{
  wines: RecommendationWine[];
  databaseUnavailable: boolean;
  databaseErrorMessage: string | null;
}> {
  try {
    const rawWines = await prisma.wine.findMany({
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 48,
      select: {
        id: true,
        slug: true,
        name: true,
        producer: true,
        country: true,
        region: true,
        grape: true,
        color: true,
        style: true,
        price: true,
        vintage: true,
        image: true,
        description: true,
        featured: true,
        isQuebec: true,
        body: true,
        acidity: true,
        tannin: true,
        minerality: true,
      },
    });

    return {
      wines: rawWines.map(normalizeWineRecord),
      databaseUnavailable: false,
      databaseErrorMessage: null,
    };
  } catch (error) {
    console.error("[recommendation/page] DB ERROR", error);

    return {
      wines: [],
      databaseUnavailable: true,
      databaseErrorMessage:
        error instanceof Error ? error.message : "Database unavailable",
    };
  }
}

export default async function RecommandationPage() {
  const { wines, databaseUnavailable } = await getRecommendationWines();

  return (
    <main className="bg-[#efebe3] text-[#1f1a17]">
      <section className="px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6">
        <div className="relative min-h-[74vh] overflow-hidden rounded-[28px] border border-[#465344] bg-[#233126]">
          <Image
            src="/images/lifestyle-1.jpeg"
            alt="Recommandation Lex Vinum Premium"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(20,18,15,0.18),rgba(20,18,15,0.62))]" />

          <div className="relative z-10 flex min-h-[74vh] items-end px-6 pb-8 md:px-10 md:pb-10">
            <div className="max-w-4xl">
              <p className="mb-4 text-[11px] uppercase tracking-[0.34em] text-[#dfd4c1]">
                Recommandation privée
              </p>

              <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] text-[#f8f3ec] md:text-7xl xl:text-[7rem]">
                Le bon vin,
                <span className="block italic font-light text-[#eadcc3]">
                  dans le bon ton.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#eee4d6] md:text-base">
                Une lecture plus contrastée, plus assurée, plus éditoriale :
                filtres, sélection principale et classement raffiné dans
                l’univers Lex Vinum Premium.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-10 md:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-5 md:grid-cols-3">
            <TopInfoCard
              label="Répertoire"
              value={
                databaseUnavailable ? "Mode autonome" : `${wines.length} vins`
              }
              text={
                databaseUnavailable
                  ? "La base est temporairement indisponible, mais la page reste accessible."
                  : "Base réelle branchée sur Prisma et Neon."
              }
            />
            <TopInfoCard
              label="Ambiance"
              value="Country club"
              text="Plus de contraste, plus de profondeur, plus de tenue."
            />
            <TopInfoCard
              label="Logique"
              value={databaseUnavailable ? "Fallback actif" : "Conservée"}
              text={
                databaseUnavailable
                  ? "Le crash serveur est évité même si Neon refuse les requêtes."
                  : "Aucune rupture dans le scoring ou les données."
              }
            />
          </div>

          {databaseUnavailable ? (
            <section className="overflow-hidden rounded-[28px] border border-[#d8cfbf] bg-[#f6f1e8] shadow-[0_18px_50px_rgba(31,26,23,0.04)]">
              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="relative min-h-[260px] overflow-hidden">
                  <Image
                    src="/images/editorial-1.jpeg"
                    alt="Recommandation temporairement indisponible"
                    fill
                    unoptimized
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,18,15,0.60),rgba(20,18,15,0.14))]" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                    <p className="text-[11px] uppercase tracking-[0.34em] text-[#dfd4c1]">
                      Indisponibilité temporaire
                    </p>
                    <p className="mt-3 max-w-sm font-serif text-3xl leading-[1.02] text-[#f8f3ec]">
                      La base de recommandations n’est pas accessible pour le
                      moment.
                    </p>
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[#7c7368]">
                    Mode dégradé élégant
                  </p>

                  <h2 className="mt-4 font-serif text-4xl leading-[0.96] text-[#231d19]">
                    La page reste en ligne, sans casser l’expérience.
                  </h2>

                  <p className="mt-5 max-w-2xl text-sm leading-8 text-[#5f564d]">
                    Neon bloque actuellement les transferts vers la base, donc
                    les recommandations issues du répertoire ne peuvent pas être
                    chargées. La bonne nouvelle, c’est que l’interface reste
                    disponible et le crash serveur est neutralisé.
                  </p>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <FallbackInfoCard
                      title="Ce qui se passe"
                      text="La limite gratuite de data transfer a été atteinte temporairement sur Neon."
                    />
                    <FallbackInfoCard
                      title="Ce que ça ne veut pas dire"
                      text="Ton projet n’est pas perdu, ni obligé de passer sur un plan payant."
                    />
                    <FallbackInfoCard
                      title="Ce qu’on a déjà corrigé"
                      text="La page recommendation ne plante plus même si Prisma échoue."
                    />
                    <FallbackInfoCard
                      title="La suite logique"
                      text="On peut maintenant optimiser le rendu premium et réduire encore la dépendance DB."
                    />
                  </div>

                  <div className="mt-6 rounded-[22px] border border-[rgba(173,123,47,0.22)] bg-[rgba(173,123,47,0.08)] p-5 text-sm leading-7 text-[#7b5a21]">
                    Reviens tester cette page plus tard quand le quota Neon sera
                    redevenu disponible, ou continue le développement des autres
                    écrans qui fonctionnent déjà en mode fallback.
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <RecommandationClient wines={wines} />
          )}
        </div>
      </section>
    </main>
  );
}

function TopInfoCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#d6cebf] bg-[#f4efe6] p-5 shadow-[0_12px_34px_rgba(31,26,23,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#7c7368]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl leading-none text-[#231d19]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-[#6c6359]">{text}</p>
    </div>
  );
}

function FallbackInfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[20px] border border-[#e1d7c8] bg-white/72 p-5 shadow-[0_10px_30px_rgba(31,26,23,0.03)]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[#7c7368]">
        {title}
      </p>
      <p className="mt-3 text-sm leading-7 text-[#5f564d]">{text}</p>
    </div>
  );
}