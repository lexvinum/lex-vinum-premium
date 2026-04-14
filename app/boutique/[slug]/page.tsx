import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import AddToCartButton from "@/components/shop/AddToCartButton";

export const revalidate = 60;

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.shopProduct.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      shortDesc: true,
      priceCents: true,
      currency: true,
      image: true,
      category: true,
      inventory: true,
      active: true,
    },
  });

  if (!product || !product.active) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f4efe6] text-[#221c18]">
      <div className="mx-auto max-w-7xl px-6 py-8 md:px-10 lg:px-12">
        <Link
          href="/boutique"
          className="inline-flex text-sm text-[#6a6156] transition hover:text-[#1f2d24]"
        >
          ← Retour à la boutique
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="overflow-hidden rounded-[30px] border border-[#d8cfbf] bg-[#f8f3eb] shadow-[0_24px_70px_rgba(58,42,28,0.08)]">
            <div className="relative min-h-[520px] bg-[#e7ded1]">
              {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <Image
                  src="/images/editorial-1.jpeg"
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              )}

              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f8f3eb] via-[#f8f3eb]/35 to-transparent" />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            {product.category ? (
              <p className="text-xs uppercase tracking-[0.32em] text-[#6f8f7a]">
                {product.category}
              </p>
            ) : null}

            <h1 className="mt-4 text-4xl font-semibold leading-tight text-[#1f2d24] md:text-5xl">
              {product.name}
            </h1>

            <p className="mt-6 text-2xl text-[#8f6242]">
              {formatPrice(product.priceCents, product.currency.toUpperCase())}
            </p>

            {product.shortDesc ? (
              <p className="mt-6 text-lg leading-8 text-[#5d544b]">
                {product.shortDesc}
              </p>
            ) : null}

            <div className="mt-6 rounded-[24px] border border-[#d8cfbf] bg-white/60 p-6 shadow-[0_18px_50px_rgba(58,42,28,0.05)]">
              <p className="leading-8 text-[#655c53]">{product.description}</p>

              <p className="mt-6 text-sm text-[#7a7066]">
                {product.inventory > 0
                  ? `${product.inventory} unités en stock`
                  : "Rupture de stock"}
              </p>
            </div>

            <div className="mt-8">
              <AddToCartButton
                product={{
                  id: product.id,
                  slug: product.slug,
                  name: product.name,
                  priceCents: product.priceCents,
                  currency: product.currency,
                  image: product.image,
                }}
              />
            </div>
          </div>
        </div>

        <section className="mt-14 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="overflow-hidden rounded-[28px] border border-[#d8cfbf] bg-[#f8f3eb] shadow-[0_22px_60px_rgba(58,42,28,0.08)]">
            <div className="relative h-[260px]">
              <Image
                src="/images/lifestyle-2.jpeg"
                alt="Ambiance de dégustation"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,29,23,0.20),rgba(20,29,23,0.02))]" />
            </div>

            <div className="p-7">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6f8f7a]">
                Esprit Lex Vinum
              </p>
              <h2 className="mt-2 font-serif text-3xl text-[#1f2d24]">
                Une boutique alignée avec le reste du site
              </h2>
              <p className="mt-3 text-sm leading-7 text-[#655c53]">
                Même exigence visuelle, même palette, même élégance respirante.
                La boutique s’intègre désormais naturellement à l’univers Lex Vinum Premium.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-[#d8cfbf] bg-white/60 p-7 shadow-[0_18px_50px_rgba(58,42,28,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6f8f7a]">
                Matière
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#1f2d24]">
                Objets choisis avec retenue
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#655c53]">
                Des produits pensés pour accompagner la dégustation sans surcharge,
                dans un esprit sobre, utile et premium.
              </p>
            </div>

            <div className="rounded-[28px] border border-[#d8cfbf] bg-white/60 p-7 shadow-[0_18px_50px_rgba(58,42,28,0.05)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#6f8f7a]">
                Usage
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#1f2d24]">
                Servir, offrir, déguster
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#655c53]">
                Une sélection pensée pour le quotidien comme pour le cadeau,
                avec une présence plus éditoriale et mieux harmonisée.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}