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

export default async function RecommandationPage() {
  const rawWines = await prisma.wine.findMany({
    orderBy: [{ featured: "desc" }, { name: "asc" }],
    take: 120,
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

  const wines = rawWines.map((wine: any) => ({
    ...wine,
    featured: wine.featured ?? false,
    isQuebec: wine.isQuebec ?? false,
    body: toNullableNumber(wine.body),
    acidity: toNullableNumber(wine.acidity),
    tannin: toNullableNumber(wine.tannin),
    minerality: toNullableNumber(wine.minerality),
  }));

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
                Une lecture plus contrastée, plus assurée, plus country club :
                filtres, sélection principale et classement raffiné à partir de
                ta vraie base Lex Vinum.
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
              value={`${wines.length} vins`}
              text="Base réelle branchée sur Prisma et Neon."
            />
            <TopInfoCard
              label="Ambiance"
              value="Country club"
              text="Plus de contraste, plus de profondeur, plus de tenue."
            />
            <TopInfoCard
              label="Logique"
              value="Conservée"
              text="Aucune rupture dans le scoring ou les données."
            />
          </div>

          <RecommandationClient wines={wines} />
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