import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

export const revalidate = 60;

export default async function BoutiquePage() {
  const products = await prisma.shopProduct.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      shortDesc: true,
      priceCents: true,
      currency: true,
      image: true,
      category: true,
      featured: true,
      inventory: true,
    },
  });

  const [featuredProduct, ...otherProducts] = products;

  return (
    <main className="min-h-screen bg-[#f4efe6] text-[#221c18]">
      <section className="relative overflow-hidden border-b border-[#d8cfbf]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(111,143,122,0.10),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.58),rgba(244,239,230,0.94))]" />
        <div className="absolute inset-0 opacity-[0.10] mix-blend-soft-light bg-[url('/textures/velvet-olive.jpg')] bg-cover bg-center" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-14 md:px-10 lg:grid-cols-[1.04fr_0.96fr] lg:px-12 lg:py-18">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-xs uppercase tracking-[0.38em] text-[#6f8f7a]">
              Boutique Lex Vinum
            </p>

            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#1f2d24] md:text-6xl">
              Les essentiels du vin dans une sélection sobre, élégante et premium.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#5d544b] md:text-lg">
              Accessoires, verrerie et objets choisis dans le même esprit que le
              reste de Lex Vinum&nbsp;: utiles, raffinés et pensés pour le rituel
              du service et de la dégustation.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/panier"
                className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.10)] px-5 py-2 text-sm text-[#1f2d24] transition hover:bg-[rgba(111,143,122,0.16)]"
              >
                Voir le panier
              </Link>

              <Link
                href="/blog"
                className="rounded-full border border-[#d4caba] px-5 py-2 text-sm text-[#5d544b] transition hover:border-[#8f6242]/50 hover:bg-white/70"
              >
                Lire le journal
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="overflow-hidden rounded-[28px] border border-[#d8cfbf] bg-[#f7f2ea] shadow-[0_24px_70px_rgba(58,42,28,0.10)]">
              <div className="relative h-[220px]">
                <Image
                  src="/images/lifestyle-2.jpeg"
                  alt="Ambiance boutique"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,29,23,0.28),rgba(20,29,23,0.02))]" />
              </div>

              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#6f8f7a]">
                  Sélection maison
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#1f2d24]">
                  Une boutique dans le même langage visuel
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#655c53]">
                  Plus cohérente avec l’accueil, la carte et les autres sections,
                  avec une présence plus claire, plus respirante et plus premium.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {featuredProduct ? (
        <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 lg:px-12">
          <Link
            href={`/boutique/${featuredProduct.slug}`}
            className="group grid overflow-hidden rounded-[32px] border border-[#d8cfbf] bg-[#f8f3eb] shadow-[0_28px_90px_rgba(58,42,28,0.10)] transition md:grid-cols-[1.08fr_0.92fr]"
          >
            <div className="relative min-h-[360px] bg-[#e7ded1]">
              {featuredProduct.image ? (
                <Image
                  src={featuredProduct.image}
                  alt={featuredProduct.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <Image
                  src="/images/editorial-1.jpeg"
                  alt={featuredProduct.name}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  unoptimized
                />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,29,23,0.24),rgba(20,29,23,0.04))]" />
            </div>

            <div className="flex flex-col justify-between p-8 md:p-10">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-[#6f8f7a]">
                  <span className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.10)] px-3 py-1">
                    Produit vedette
                  </span>

                  {featuredProduct.category ? <span>{featuredProduct.category}</span> : null}
                </div>

                <h2 className="text-3xl font-semibold text-[#1f2d24] md:text-4xl">
                  {featuredProduct.name}
                </h2>

                {featuredProduct.shortDesc ? (
                  <p className="mt-5 max-w-xl text-[#5d544b] leading-8">
                    {featuredProduct.shortDesc}
                  </p>
                ) : null}
              </div>

              <div className="mt-8 flex items-center gap-4">
                <span className="text-2xl font-medium text-[#8f6242]">
                  {formatPrice(
                    featuredProduct.priceCents,
                    featuredProduct.currency.toUpperCase()
                  )}
                </span>

                <span className="ml-auto text-sm text-[#1f2d24] transition group-hover:translate-x-1">
                  Voir le produit →
                </span>
              </div>

              <p className="mt-3 text-sm text-[#7a7066]">
                {featuredProduct.inventory > 0
                  ? `${featuredProduct.inventory} en stock`
                  : "Rupture de stock"}
              </p>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6 pb-16 md:px-10 lg:px-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[#6f8f7a]">
              Objets & essentiels
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1f2d24] md:text-3xl">
              Toute la boutique
            </h2>
          </div>

          <div className="hidden rounded-full border border-[#d8cfbf] bg-white/70 px-4 py-2 text-sm text-[#6a6156] md:block">
            {products.length} produit{products.length > 1 ? "s" : ""}
          </div>
        </div>

        {otherProducts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {otherProducts.map((product: (typeof otherProducts)[number]) => (
              <Link
                key={product.id}
                href={`/boutique/${product.slug}`}
                className="group overflow-hidden rounded-[24px] border border-[#d8cfbf] bg-[#f8f3eb] shadow-[0_20px_60px_rgba(58,42,28,0.08)] transition hover:-translate-y-1 hover:border-[#6f8f7a]/60"
              >
                <div className="relative h-72 bg-[#e9dfd2]">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <Image
                      src="/images/lifestyle-1.jpeg"
                      alt={product.name}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  )}

                  <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f8f3eb] via-[#f8f3eb]/35 to-transparent" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    {product.category ? (
                      <p className="text-xs uppercase tracking-[0.2em] text-[#6f8f7a]">
                        {product.category}
                      </p>
                    ) : (
                      <span />
                    )}

                    {product.featured ? (
                      <span className="rounded-full border border-[#8f6242]/40 bg-[rgba(143,98,66,0.08)] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#8f6242]">
                        Sélection
                      </span>
                    ) : null}
                  </div>

                  <h2 className="mt-3 text-2xl font-semibold text-[#1f2d24]">
                    {product.name}
                  </h2>

                  {product.shortDesc ? (
                    <p className="mt-4 text-sm leading-7 text-[#655c53]">
                      {product.shortDesc}
                    </p>
                  ) : null}

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-lg font-medium text-[#8f6242]">
                      {formatPrice(product.priceCents, product.currency.toUpperCase())}
                    </span>

                    <span className="text-sm text-[#1f2d24] transition group-hover:translate-x-1">
                      Voir →
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-[#8a7f73]">
                    {product.inventory > 0
                      ? `${product.inventory} en stock`
                      : "Rupture de stock"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : products.length > 0 ? null : (
          <div className="rounded-[26px] border border-dashed border-[#d8cfbf] bg-white/60 p-10 text-center text-[#6a6156]">
            Aucun produit actif pour le moment.
          </div>
        )}
      </section>
    </main>
  );
}