import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import FavoriteButton from "@/components/favorites/FavoriteButton";

export const revalidate = 300;

const PAGE_SIZE = 12;

function formatPrice(price?: number | null) {
  if (price === null || price === undefined) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(price);
}

function hasRealImageUrl(value?: string | null) {
  if (!value) return false;
  const v = value.trim().toLowerCase();

  return (
    /^https?:\/\//i.test(v) &&
    v.includes("/media/catalog/product/") &&
    !v.includes("placeholder") &&
    !v.includes("logo")
  );
}

function getWineImageSrc(image?: string | null) {
  if (!image || !hasRealImageUrl(image)) return null;
  return `/api/image?url=${encodeURIComponent(image)}`;
}

function buildQueryString(params: {
  q: string;
  pays: string;
  couleur: string;
  region: string;
  prixMax: string;
  quebecOnly: boolean;
  page: number;
}) {
  const search = new URLSearchParams();

  if (params.q) search.set("q", params.q);
  if (params.pays) search.set("pays", params.pays);
  if (params.couleur) search.set("couleur", params.couleur);
  if (params.region) search.set("region", params.region);
  if (params.prixMax) search.set("prixMax", params.prixMax);
  if (params.quebecOnly) search.set("quebec", "1");
  search.set("page", String(params.page));

  return `?${search.toString()}`;
}

type RepertoireSearchParams = Promise<{
  q?: string;
  pays?: string;
  couleur?: string;
  region?: string;
  prixMax?: string;
  quebec?: string;
  page?: string;
}>;

function buildBaseWhere(): Prisma.WineWhereInput {
  return {
    dataSource: "SAQ",
  };
}

export default async function RepertoirePage({
  searchParams,
}: {
  searchParams: RepertoireSearchParams;
}) {
  const params = await searchParams;

  const q = params.q?.trim() ?? "";
  const pays = params.pays?.trim() ?? "";
  const couleur = params.couleur?.trim() ?? "";
  const region = params.region?.trim() ?? "";
  const prixMax = params.prixMax?.trim() ?? "";
  const quebecOnly = params.quebec === "1";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const parsedPrixMax =
    prixMax && !Number.isNaN(Number(prixMax)) ? Number(prixMax) : null;

  const baseWhere = buildBaseWhere();

  const searchFilter: Prisma.WineWhereInput | null = q
    ? {
        OR: [
          { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { producer: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { country: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { region: { contains: q, mode: Prisma.QueryMode.insensitive } },
          { grape: { contains: q, mode: Prisma.QueryMode.insensitive } },
          {
            appellationOrigine: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
          {
            designationReglementee: {
              contains: q,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }
    : null;

  const where: Prisma.WineWhereInput = {
    AND: [
      baseWhere,
      ...(searchFilter ? [searchFilter] : []),
      ...(pays ? [{ country: pays }] : []),
      ...(couleur ? [{ color: couleur }] : []),
      ...(region ? [{ region }] : []),
      ...(parsedPrixMax !== null
        ? [
            {
              price: {
                lte: parsedPrixMax,
              },
            },
          ]
        : []),
      ...(quebecOnly ? [{ isQuebec: true }] : []),
    ],
  };

  const realImageWhere: Prisma.WineWhereInput = {
    AND: [
      {
        image: {
          startsWith: "http",
        },
      },
      {
        image: {
          contains: "/media/catalog/product/",
        },
      },
      {
        NOT: [
          { image: { contains: "placeholder" } },
          { image: { contains: "logo" } },
        ],
      },
    ],
  };

  const [
    total,
    wines,
    countries,
    colors,
    regions,
    totalQuebec,
    totalWithImages,
    featuredWithImages,
  ] = await Promise.all([
    prisma.wine.count({ where }),
    prisma.wine.findMany({
      where,
      orderBy: [
        { featured: "desc" },
        { isQuebec: "desc" },
        { price: "asc" },
        { name: "asc" },
      ],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        slug: true,
        name: true,
        producer: true,
        country: true,
        region: true,
        color: true,
        vintage: true,
        price: true,
        image: true,
        featured: true,
        isQuebec: true,
        saqUrl: true,
        grape: true,
        appellationOrigine: true,
        designationReglementee: true,
      },
    }),
    prisma.wine.findMany({
      where: {
        AND: [baseWhere, { country: { not: null } }],
      },
      distinct: ["country"],
      orderBy: { country: "asc" },
      select: { country: true },
    }),
    prisma.wine.findMany({
      where: {
        AND: [baseWhere, { color: { not: null } }],
      },
      distinct: ["color"],
      orderBy: { color: "asc" },
      select: { color: true },
    }),
    prisma.wine.findMany({
      where: {
        AND: [baseWhere, { region: { not: null } }],
      },
      distinct: ["region"],
      orderBy: { region: "asc" },
      select: { region: true },
    }),
    prisma.wine.count({
      where: {
        AND: [baseWhere, { isQuebec: true }],
      },
    }),
    prisma.wine.count({
      where: {
        AND: [baseWhere, realImageWhere],
      },
    }),
    prisma.wine.findMany({
      where: {
        AND: [baseWhere, realImageWhere],
      },
      orderBy: [{ featured: "desc" }, { isQuebec: "desc" }, { name: "asc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        name: true,
        producer: true,
        country: true,
        region: true,
        color: true,
        price: true,
        image: true,
        vintage: true,
        featured: true,
        isQuebec: true,
      },
    }),
  ]);

  const heroWine = featuredWithImages[0] ?? null;
  const sideWines = featuredWithImages.slice(1);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const previousPageHref = buildQueryString({
    q,
    pays,
    couleur,
    region,
    prixMax,
    quebecOnly,
    page: Math.max(1, page - 1),
  });

  const nextPageHref = buildQueryString({
    q,
    pays,
    couleur,
    region,
    prixMax,
    quebecOnly,
    page: Math.min(totalPages, page + 1),
  });

  return (
    <main className="bg-[#efe9dd] text-[#221c18]">
      <section className="px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6">
        <div className="relative overflow-hidden rounded-[34px] border border-[#d7cfc2] bg-[#e3dccf]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(95,109,85,0.20),transparent_30%),linear-gradient(180deg,rgba(255,252,248,0.40),rgba(239,233,221,0.94))]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light premium-page-texture" />

          <div className="relative mx-auto max-w-7xl px-6 py-10 md:px-10 lg:px-12 lg:py-14">
            <div className="max-w-4xl">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#6f8f7a]">
                Répertoire Lex Vinum
              </p>

              <h1 className="mt-5 font-serif text-5xl leading-[0.92] text-[#231d19] md:text-7xl">
                Un catalogue
                <span className="block italic font-light text-[#5f6d55]">
                  fidèle à la base SAQ enrichie.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-[15px] leading-8 text-[#5a534b] md:text-base">
                Le catalogue reste volontairement large, avec priorité aux visuels
                réels des produits lorsqu’ils sont disponibles.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              {heroWine ? (
                <Link
                  href={`/vins/${heroWine.slug}`}
                  prefetch={false}
                  className="group relative block overflow-hidden rounded-[30px] border border-[#d4cbbb] bg-[#efe7da] shadow-[0_28px_80px_rgba(58,42,28,0.14)]"
                >
                  <div className="relative h-[560px]">
                    {getWineImageSrc(heroWine.image) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getWineImageSrc(heroWine.image)!}
                        alt={heroWine.name}
                        className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.02]"
                        loading="eager"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#efe7da] to-[#ddd4c6]">
                        <div className="px-6 text-center">
                          <p className="font-serif text-3xl italic text-[#5f6d55]">
                            {heroWine.name}
                          </p>
                          <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#8a7f73]">
                            Image indisponible
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#ddd2c2] bg-[#f7f2ea] p-7 md:p-8">
                    <div className="mb-4 flex flex-wrap gap-2">
                      {getWineImageSrc(heroWine.image) ? (
                        <span className="rounded-full border border-[#cdc0ac]/40 bg-[rgba(255,255,255,0.82)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#5f6d55]">
                          Image SAQ
                        </span>
                      ) : (
                        <span className="rounded-full border border-[#d8cbb8] bg-white/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8a7761]">
                          Image indisponible
                        </span>
                      )}

                      {heroWine.color ? (
                        <span className="rounded-full border border-[#d7cfbf] bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#6c6258]">
                          {heroWine.color}
                        </span>
                      ) : null}
                    </div>

                    <p className="max-w-3xl font-serif text-4xl leading-tight text-[#231d19] md:text-5xl">
                      {heroWine.name}
                    </p>

                    <p className="mt-3 text-sm text-[#6e655c]">
                      {[
                        heroWine.producer,
                        heroWine.region,
                        heroWine.country,
                        heroWine.vintage,
                      ]
                        .filter(Boolean)
                        .join(" • ") || "—"}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <span className="text-lg font-semibold text-[#8f6242]">
                        {formatPrice(heroWine.price)}
                      </span>

                      <span className="text-sm uppercase tracking-[0.16em] text-[#5f6e61]">
                        Voir la fiche →
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="rounded-[30px] border border-[#d7cfc2] bg-[#f7f2ea] p-8 shadow-[0_18px_60px_rgba(58,42,28,0.08)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#7b8e7c]">
                    Éditorial
                  </p>
                  <p className="mt-4 font-serif text-4xl leading-tight text-[#231d19]">
                    Le catalogue visuel
                    <span className="block italic font-light text-[#5f6d55]">
                      continue de s’enrichir.
                    </span>
                  </p>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-[#665d53]">
                    Les visuels produits sont affichés dès qu’ils existent. Sinon,
                    un placeholder neutre prend le relais.
                  </p>
                </div>
              )}

              <div className="grid gap-6">
                <div className="rounded-[28px] border border-[#d7cfc2] bg-[#f7f2ea] p-6 shadow-[0_18px_50px_rgba(58,42,28,0.06)]">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#7b8e7c]">
                    Chiffres
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                    <div className="rounded-[20px] border border-[#ddd5c8] bg-white/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8e7c]">
                        Produits visibles
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-[#231d19]">
                        {total}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-[#ddd5c8] bg-white/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8e7c]">
                        Images
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-[#231d19]">
                        {totalWithImages}
                      </p>
                    </div>

                    <div className="rounded-[20px] border border-[#ddd5c8] bg-white/70 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#7b8e7c]">
                        Québec
                      </p>
                      <p className="mt-2 text-3xl font-semibold text-[#231d19]">
                        {totalQuebec}
                      </p>
                    </div>
                  </div>
                </div>

                {sideWines.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
                    {sideWines.map((wine) => {
                      const imageSrc = getWineImageSrc(wine.image);

                      return (
                        <Link
                          key={wine.id}
                          href={`/vins/${wine.slug}`}
                          prefetch={false}
                          className="group overflow-hidden rounded-[28px] border border-[#d6cfc2] bg-[#f7f2ea] shadow-[0_18px_50px_rgba(58,42,28,0.08)]"
                        >
                          <div className="relative h-[250px] overflow-hidden bg-[#efe7da]">
                            {imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageSrc}
                                alt={wine.name}
                                className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.02]"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3ede4] to-[#e7dfd1] px-4 text-center">
                                <div>
                                  <p className="font-serif text-2xl italic text-[#5f6d55]">
                                    {wine.name}
                                  </p>
                                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-[#8a7f73]">
                                    Image indisponible
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="border-t border-[#e3d8ca] p-5">
                            <p className="font-serif text-2xl text-[#231d19]">
                              {wine.name}
                            </p>
                            <p className="mt-2 text-sm text-[#6e655c]">
                              {[wine.region, wine.country]
                                .filter(Boolean)
                                .join(" • ") || "—"}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-10 lg:px-12">
        <div className="rounded-[30px] border border-[#d7cfc2] bg-[#f7f2ea] p-6 shadow-[0_18px_50px_rgba(58,42,28,0.06)]">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#7c7468]">
                Recherche & filtres
              </p>
              <h2 className="mt-3 font-serif text-3xl text-[#231d19] md:text-4xl">
                Filtrer le catalogue
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[#655c53]">
              Le catalogue reste volontairement large. Tu peux filtrer, puis faire
              ton tri métier ensuite, sans perdre l’accès aux produits ni aux visuels.
            </p>
          </div>

          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.7fr_auto]">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Recherche par nom, producteur, région, pays, cépage..."
              className="rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#221c18] outline-none transition focus:border-[#6f8f7a]"
            />

            <select
              name="pays"
              defaultValue={pays}
              className="rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#221c18] outline-none transition focus:border-[#6f8f7a]"
            >
              <option value="">Tous les pays</option>
              {countries.map((item) =>
                item.country ? (
                  <option key={item.country} value={item.country}>
                    {item.country}
                  </option>
                ) : null
              )}
            </select>

            <select
              name="couleur"
              defaultValue={couleur}
              className="rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#221c18] outline-none transition focus:border-[#6f8f7a]"
            >
              <option value="">Toutes les couleurs</option>
              {colors.map((item) =>
                item.color ? (
                  <option key={item.color} value={item.color}>
                    {item.color}
                  </option>
                ) : null
              )}
            </select>

            <select
              name="region"
              defaultValue={region}
              className="rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#221c18] outline-none transition focus:border-[#6f8f7a]"
            >
              <option value="">Toutes les régions</option>
              {regions.map((item) =>
                item.region ? (
                  <option key={item.region} value={item.region}>
                    {item.region}
                  </option>
                ) : null
              )}
            </select>

            <input
              type="number"
              name="prixMax"
              min="0"
              step="0.01"
              defaultValue={prixMax}
              placeholder="Prix max"
              className="rounded-2xl border border-[#d8cfbf] bg-white px-4 py-3 text-sm text-[#221c18] outline-none transition focus:border-[#6f8f7a]"
            />

            <button
              type="submit"
              className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.10)] px-5 py-3 text-sm font-medium text-[#1f2d24] transition hover:bg-[rgba(111,143,122,0.16)]"
            >
              Filtrer
            </button>

            <label className="flex items-center gap-3 text-sm text-[#4f473f] md:col-span-2 xl:col-span-6">
              <input
                type="checkbox"
                name="quebec"
                value="1"
                defaultChecked={quebecOnly}
                className="h-4 w-4 rounded border-[#cfc6b8] text-[#6f8f7a] focus:ring-[#6f8f7a]"
              />
              Afficher seulement les produits québécois
            </label>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 md:px-10 lg:px-12">
        {wines.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {wines.map((wine) => {
              const imageSrc = getWineImageSrc(wine.image);
              const hasSaqImage = Boolean(imageSrc);

              return (
                <article
                  key={wine.id}
                  className="group overflow-hidden rounded-[26px] border border-[#d7cfc2] bg-[#f6f2eb] shadow-[0_20px_60px_rgba(58,42,28,0.08)] transition hover:-translate-y-1 hover:border-[#c8b7a1]"
                >
                  <div className="relative h-[390px] overflow-hidden bg-[#efe7da]">
                    <Link
                      href={`/vins/${wine.slug}`}
                      prefetch={false}
                      className="block h-full"
                    >
                      {imageSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageSrc}
                          alt={wine.name}
                          className="h-full w-full object-contain transition duration-700 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f3ede4] to-[#e7dfd1]">
                          <div className="px-4 text-center">
                            <p className="font-serif text-lg italic text-[#5f6d55]">
                              {wine.name}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[#8a7f73]">
                              Visuel indisponible
                            </p>
                          </div>
                        </div>
                      )}
                    </Link>

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      {wine.isQuebec ? (
                        <span className="rounded-full border border-[#6f8f7a]/30 bg-[rgba(244,239,230,0.92)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#1f2d24]">
                          Québec
                        </span>
                      ) : null}

                      {wine.featured ? (
                        <span className="rounded-full border border-[#8f6242]/25 bg-[rgba(244,239,230,0.92)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#8f6242]">
                          Sélection
                        </span>
                      ) : null}

                      {hasSaqImage ? (
                        <span className="rounded-full border border-[#cdc0ac]/40 bg-[rgba(255,255,255,0.82)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#5f6d55]">
                          SAQ
                        </span>
                      ) : null}
                    </div>

                    <div className="absolute right-4 top-4 z-10">
                      <FavoriteButton slug={wine.slug} size="sm" />
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="space-y-2">
                      <Link
                        href={`/vins/${wine.slug}`}
                        prefetch={false}
                        className="block"
                      >
                        <h3 className="line-clamp-2 font-serif text-3xl leading-tight text-[#231d19]">
                          {wine.name}
                        </h3>
                      </Link>

                      <p className="line-clamp-1 text-sm text-[#6b6258]">
                        {wine.producer || "Producteur inconnu"}
                      </p>

                      <p className="line-clamp-1 text-sm text-[#857b70]">
                        {[wine.region, wine.country].filter(Boolean).join(" • ") ||
                          "—"}
                      </p>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {wine.color ? (
                        <span className="rounded-full border border-[#6f8f7a]/25 bg-[rgba(111,143,122,0.10)] px-3 py-1 text-xs text-[#1f2d24]">
                          {wine.color}
                        </span>
                      ) : null}

                      {wine.vintage ? (
                        <span className="rounded-full border border-[#ddd5c9] bg-white/70 px-3 py-1 text-xs text-[#6a6156]">
                          {wine.vintage}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-[#e1d8cb] pt-5">
                      <span className="text-lg font-semibold text-[#8f6242]">
                        {formatPrice(wine.price)}
                      </span>

                      <Link
                        href={`/vins/${wine.slug}`}
                        prefetch={false}
                        className="text-sm uppercase tracking-[0.14em] text-[#5f6e61]"
                      >
                        Voir la fiche →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-[#d8cfbf] bg-white/60 p-10 text-center text-[#6a6156]">
            Aucun produit trouvé pour ces critères.
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-[#d8cfbf] bg-[#f7f2ea] px-6 py-4">
          <p className="text-sm text-[#655c53]">
            Page {page} sur {totalPages}
          </p>

          <div className="flex gap-3">
            <Link
              href={previousPageHref}
              prefetch={false}
              className={`rounded-full px-4 py-2 text-sm transition ${
                page <= 1
                  ? "pointer-events-none border border-[#e3dbcf] bg-[#f3ede4] text-[#b6aba0]"
                  : "border border-[#6f8f7a] bg-[rgba(111,143,122,0.10)] text-[#1f2d24] hover:bg-[rgba(111,143,122,0.16)]"
              }`}
            >
              Précédent
            </Link>

            <Link
              href={nextPageHref}
              prefetch={false}
              className={`rounded-full px-4 py-2 text-sm transition ${
                page >= totalPages
                  ? "pointer-events-none border border-[#e3dbcf] bg-[#f3ede4] text-[#b6aba0]"
                  : "border border-[#6f8f7a] bg-[rgba(111,143,122,0.10)] text-[#1f2d24] hover:bg-[rgba(111,143,122,0.16)]"
              }`}
            >
              Suivant
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}