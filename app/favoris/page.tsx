import Link from "next/link";
import { cookies } from "next/headers";
import FavoriteButton from "@/components/favorites/FavoriteButton";
import { prisma } from "@/lib/prisma";

function parseFavoriteSlugs(raw: string | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) return [];

    return [...new Set(parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0))];
  } catch {
    return [];
  }
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

function getBadgeList(wine: {
  isQuebec?: boolean | null;
  featured?: boolean | null;
  color?: string | null;
  style?: string | null;
}) {
  const badges: string[] = [];

  if (wine.isQuebec) badges.push("Québec");
  if (wine.featured) badges.push("Sélection");
  if (wine.color?.toLowerCase().includes("bulle")) badges.push("Bulles");
  if (wine.style?.toLowerCase().includes("nature")) badges.push("Nature");

  return badges;
}

export default async function FavoritesPage() {
  const cookieStore = await cookies();
  const favoriteSlugs = parseFavoriteSlugs(
    cookieStore.get("lexvinum_favorites")?.value
  );

  const wines =
    favoriteSlugs.length > 0
      ? await prisma.wine.findMany({
          where: {
            slug: {
              in: favoriteSlugs,
            },
          },
          select: {
            id: true,
            slug: true,
            name: true,
            producer: true,
            country: true,
            region: true,
            color: true,
            style: true,
            grape: true,
            vintage: true,
            price: true,
            image: true,
            isQuebec: true,
            featured: true,
          },
        })
      : [];

  const orderedWines = favoriteSlugs
    .map((slug) => wines.find((wine) => wine.slug === slug))
    .filter(
      (wine): wine is NonNullable<(typeof wines)[number]> => Boolean(wine)
    );

  return (
    <main className="min-h-screen bg-[#f3efe6] text-[#223229]">
      <section className="relative overflow-hidden border-b border-[#ddd6c7] bg-[radial-gradient(circle_at_top,rgba(122,139,124,0.16),transparent_42%),linear-gradient(180deg,#f7f3eb_0%,#efe8db_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-multiply premium-page-texture" />

        <div className="mx-auto max-w-7xl px-6 py-12 md:px-8 lg:px-12 lg:py-16">
          <div className="max-w-4xl space-y-6">
            <p className="text-xs uppercase tracking-[0.34em] text-[#8a6a52]">
              Collection personnelle
            </p>

            <h1 className="font-serif text-4xl leading-tight text-[#1d2a22] md:text-5xl lg:text-6xl">
              Mes favoris
            </h1>

            <p className="max-w-3xl text-base leading-8 text-[#324338] md:text-lg">
              Retrouve ici les bouteilles que tu as mises de côté pendant ta
              navigation. Une sélection personnelle, éditoriale et prête à être
              revisitée au fil de tes découvertes.
            </p>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-full border border-[#d7cfbf] bg-[#f7f3eb] px-5 py-2 text-sm text-[#223229]">
                {orderedWines.length} favori{orderedWines.length > 1 ? "s" : ""}
              </div>

              <Link
                href="/repertoire"
                className="inline-flex items-center rounded-full border border-[#223229] bg-[#223229] px-5 py-2 text-sm uppercase tracking-[0.16em] text-[#f5f1e8] transition hover:opacity-90"
              >
                Explorer le répertoire
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 md:px-8 lg:px-12 lg:py-14">
        {orderedWines.length === 0 ? (
          <div className="rounded-[32px] border border-[#ddd6c7] bg-[#f8f4ec] p-8 text-center shadow-[0_18px_50px_rgba(58,48,32,0.06)] md:p-12">
            <p className="text-xs uppercase tracking-[0.28em] text-[#8a6a52]">
              Aucun favori
            </p>

            <h2 className="mt-3 font-serif text-3xl text-[#1d2a22] md:text-4xl">
              Ta sélection est encore vide
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#324338]">
              Ajoute des vins à tes favoris depuis le répertoire ou depuis une
              fiche bouteille pour construire une sélection personnelle, élégante
              et facile à retrouver.
            </p>

            <div className="mt-8">
              <Link
                href="/repertoire"
                className="inline-flex items-center rounded-full border border-[#223229] bg-[#223229] px-6 py-3 text-sm uppercase tracking-[0.18em] text-[#f5f1e8] transition hover:opacity-90"
              >
                Découvrir les vins
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {orderedWines.map((wine) => {
              const badges = getBadgeList(wine);

              return (
                <article
                  key={wine.id}
                  className="group overflow-hidden rounded-[28px] border border-[#ddd6c7] bg-[#f8f4ec] transition hover:-translate-y-0.5 hover:border-[#c7b29b] hover:shadow-[0_18px_40px_rgba(58,48,32,0.08)]"
                >
                  <div className="relative">
                    <Link href={`/vins/${wine.slug}`} className="block">
                      <div className="flex h-[280px] items-center justify-center overflow-hidden bg-[#f1ece2] p-5">
                        {wine.image ? (
                          <img
                            src={wine.image}
                            alt={wine.name}
                            className="max-h-full w-auto object-contain transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-end rounded-[22px] border border-dashed border-[#cfc6b5] bg-[linear-gradient(180deg,#f7f3eb_0%,#ece2d3_100%)] p-4">
                            <div className="rounded-full border border-[#d7cfbf] bg-white/70 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#6d4e39]">
                              Sélection Lex Vinum
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="absolute right-4 top-4">
                      <FavoriteButton slug={wine.slug} size="sm" />
                    </div>
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {wine.color ? (
                          <span className="rounded-full border border-[#d7cfbf] bg-white/70 px-3 py-1 text-xs text-[#223229]">
                            {formatLabel(wine.color)}
                          </span>
                        ) : null}

                        {wine.grape ? (
                          <span className="rounded-full border border-[#d7cfbf] bg-white/70 px-3 py-1 text-xs text-[#223229]">
                            {formatLabel(wine.grape)}
                          </span>
                        ) : null}

                        {badges.map((badge) => (
                          <span
                            key={badge}
                            className="rounded-full border border-[#d8c8b6] bg-[#efe5d8] px-3 py-1 text-xs text-[#6d4e39]"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>

                      <Link href={`/vins/${wine.slug}`} className="block">
                        <h2 className="line-clamp-2 font-serif text-2xl leading-tight text-[#1d2a22] transition group-hover:text-[#314338]">
                          {wine.name}
                        </h2>
                      </Link>

                      <p className="line-clamp-1 text-sm text-[#5f6f62]">
                        {[wine.producer, wine.region, wine.country]
                          .filter(Boolean)
                          .join(" • ") || "—"}
                      </p>
                    </div>

                    <div className="flex items-end justify-between gap-4 border-t border-[#e0d8cb] pt-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#8a6a52]">
                          Millésime
                        </p>
                        <p className="mt-1 text-sm text-[#223229]">
                          {wine.vintage || "—"}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.22em] text-[#8a6a52]">
                          Prix
                        </p>
                        <p className="mt-1 text-base font-semibold text-[#1d2a22]">
                          {formatPrice(wine.price) || "—"}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1">
                      <Link
                        href={`/vins/${wine.slug}`}
                        className="inline-flex items-center text-sm text-[#5f6f62] transition hover:text-[#223229]"
                      >
                        Voir la fiche →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}