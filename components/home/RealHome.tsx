import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="bg-[#efebe3] text-[#1f1a17]">
      <section className="px-4 pb-4 md:px-6 md:pb-6">
        <div className="relative min-h-[78vh] overflow-hidden rounded-[28px] border border-[#d8d1c5] bg-[#dcd5c8]">
          <Image
            src="/images/hero.jpeg"
            alt="Lex Vinum Premium"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover"
          />

          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(24,20,18,0.12),rgba(24,20,18,0.46))]" />

          <div className="relative z-10 flex min-h-[78vh] items-end px-6 pb-8 md:px-10 md:pb-10">
            <div className="max-w-4xl">
              <p className="mb-4 text-[11px] uppercase tracking-[0.34em] text-[#dfd4c1]">
                Édition numérique du vin
              </p>

              <h1 className="max-w-4xl font-serif text-5xl leading-[0.95] text-[#f8f3ec] md:text-7xl xl:text-[7.5rem]">
                Le vin,
                <span className="block italic font-light text-[#eadcc3]">
                  relu avec goût.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-[#eee4d6] md:text-base">
                Lex Vinum transforme l’exploration du vin en expérience éditoriale :
                scan de cartes, recommandations raffinées, répertoire intelligent et
                découverte du Québec dans une esthétique calme, élégante et assumée.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/scan"
                  className="inline-flex items-center rounded-full bg-[#ede0c4] px-6 py-3 text-sm font-medium text-[#231b15] transition hover:bg-[#f3e7ce]"
                >
                  Scanner une carte
                </Link>

                <Link
                  href="/repertoire"
                  className="inline-flex items-center rounded-full border border-[#e8dcc9] bg-[rgba(255,255,255,0.06)] px-6 py-3 text-sm font-medium text-[#f7f1e7] transition hover:bg-[rgba(255,255,255,0.12)]"
                >
                  Explorer le répertoire
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 xl:px-14">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#7d7468]">
              Une maison de goût
            </p>

            <h2 className="mt-5 font-serif text-4xl leading-tight text-[#221c18] md:text-5xl">
              Une approche plus sensible,
              <span className="block italic font-light text-[#5e6b54]">
                plus lisible, plus juste.
              </span>
            </h2>

            <p className="mt-6 text-[15px] leading-8 text-[#554d45]">
              Ici, le vin n’est pas présenté comme une fiche technique froide.
              Il devient atmosphère, préférence, intuition, mémoire, texture,
              accord, contexte. Chaque section de Lex Vinum est pensée comme une
              pièce différente d’une même maison.
            </p>

            <div className="mt-8 border-t border-[#d4ccbe] pt-6">
              <p className="max-w-md text-sm leading-7 text-[#746b60]">
                Plus qu’un outil, Lex Vinum agit comme une direction artistique du goût :
                sobre, premium, contemporaine, avec un ancrage réel dans l’univers du vin.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="relative min-h-[420px] overflow-hidden rounded-[26px] border border-[#ddd5c9] bg-[#ddd5c9]">
              <Image
                src="/images/editorial-1.jpeg"
                alt="Ambiance éditoriale Lex Vinum"
                fill
                unoptimized
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>

            <div className="flex flex-col gap-5">
              <div className="rounded-[26px] border border-[#d8d0c4] bg-[#f5f1ea] p-7">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[#7f7668]">
                  Signature
                </p>
                <p className="mt-4 font-serif text-2xl leading-snug text-[#231d19]">
                  Une esthétique old money,
                  <span className="block italic font-light text-[#6d5a45]">
                    sans excès.
                  </span>
                </p>
              </div>

              <div className="relative min-h-[260px] overflow-hidden rounded-[26px] border border-[#ddd5c9] bg-[#ddd5c9]">
                <Image
                  src="/images/editorial-2.jpeg"
                  alt="Univers visuel Lex Vinum"
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#e5dfd4] px-5 py-20 md:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#6f675c]">
                Explorer par univers
              </p>
              <h2 className="mt-4 font-serif text-4xl text-[#221c18] md:text-5xl">
                Le Netflix du vin,
                <span className="block italic font-light text-[#59674e]">
                  version maison privée.
                </span>
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-[#625a51]">
              Des entrées visuelles claires, immersives et désirables pour parcourir
              le vin par ambiance, style, accord, territoire et intuition.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Vins du Québec",
                href: "/repertoire?origine=quebec",
                img: "/images/grid-1.jpeg",
              },
              {
                title: "Accords & tables",
                href: "/recommandation",
                img: "/images/grid-2.jpeg",
              },
              {
                title: "Moments & découvertes",
                href: "/repertoire",
                img: "/images/grid-3.jpeg",
              },
              {
                title: "Sélection éditoriale",
                href: "/boutique",
                img: "/images/grid-4.jpeg",
              },
            ].map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group relative block overflow-hidden rounded-[24px] border border-[#d6cfc2] bg-[#d7d0c3]"
              >
                <div className="relative h-[320px]">
                  <Image
                    src={item.img}
                    alt={item.title}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,17,15,0.62),rgba(20,17,15,0.08))]" />
                </div>

                <div className="absolute inset-x-0 bottom-0 p-5">
                  <p className="font-serif text-2xl text-[#f4eee6]">{item.title}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[#ddd1c0]">
                    Découvrir
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#233126] px-5 py-20 text-[#ece4d8] md:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#cfc3ac]">
                Lifestyle & recommandation
              </p>

              <h2 className="mt-5 max-w-3xl font-serif text-4xl leading-tight text-[#f4ede3] md:text-5xl">
                Une direction de goût
                <span className="block italic font-light text-[#d9ccb8]">
                  pensée pour la vraie vie.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-[15px] leading-8 text-[#d5ccbf]">
                Un dîner, une carte des vins, une terrasse, un tête-à-tête,
                une envie d’impressionner, un moment simple entre amis :
                Lex Vinum intervient là où le vin se vit réellement.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/recommandation"
                  className="inline-flex items-center rounded-full bg-[#e4d5bc] px-6 py-3 text-sm font-medium text-[#1d1712] transition hover:bg-[#ecdec7]"
                >
                  Obtenir une recommandation
                </Link>

                <Link
                  href="/scan"
                  className="inline-flex items-center rounded-full border border-[#7f8d77] px-6 py-3 text-sm font-medium text-[#f3ece1] transition hover:bg-[rgba(255,255,255,0.06)]"
                >
                  Utiliser le scan
                </Link>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="relative min-h-[420px] overflow-hidden rounded-[24px] border border-[#435143]">
                <Image
                  src="/images/lifestyle-1.jpeg"
                  alt="Lifestyle vin"
                  fill
                  unoptimized
                  loading="lazy"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col gap-5">
                <div className="rounded-[24px] border border-[#435143] bg-[rgba(255,255,255,0.03)] p-6">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#cbbfae]">
                    Intention
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#ddd4c8]">
                    Plus qu’un choix de bouteille :
                    une façon d’entrer dans une ambiance, une table, un rythme,
                    une scène.
                  </p>
                </div>

                <div className="relative min-h-[250px] overflow-hidden rounded-[24px] border border-[#435143]">
                  <Image
                    src="/images/lifestyle-2.jpeg"
                    alt="Expérience vin"
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-10 xl:px-14">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative min-h-[520px] overflow-hidden rounded-[28px] border border-[#d7cfc2] bg-[#ddd5c9]">
            <Image
              src="/images/terroir-1.jpeg"
              alt="Terroir et vignoble"
              fill
              unoptimized
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(30,25,22,0.22),rgba(30,25,22,0.02))]" />
          </div>

          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#766e62]">
              Québec & territoire
            </p>

            <h2 className="mt-5 font-serif text-4xl leading-tight text-[#221c18] md:text-5xl">
              Garder le lien avec le sol,
              <span className="block italic font-light text-[#5f6d55]">
                pas seulement avec la bouteille.
              </span>
            </h2>

            <p className="mt-6 text-[15px] leading-8 text-[#564f46]">
              Lex Vinum reste ancré dans la matière réelle du vin :
              les vignobles, la récolte, les territoires, les routes, les producteurs,
              et particulièrement le Québec comme terrain vivant de découverte.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-[#d5ccbe] bg-[#f7f3ed] p-5">
                <p className="font-serif text-2xl text-[#241d19]">Scan</p>
                <p className="mt-2 text-sm leading-7 text-[#70685e]">
                  Lire une carte réelle, dans un contexte réel.
                </p>
              </div>

              <div className="rounded-[22px] border border-[#d5ccbe] bg-[#f7f3ed] p-5">
                <p className="font-serif text-2xl text-[#241d19]">Carte</p>
                <p className="mt-2 text-sm leading-7 text-[#70685e]">
                  Découvrir les vignobles et les routes du territoire.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-24 pt-8 md:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-[#d7cfc2] bg-[#f6f2eb]">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="border-b border-[#ddd5c9] p-8 md:p-10 lg:border-b-0 lg:border-r">
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
                Commencer
              </p>
              <h2 className="mt-5 font-serif text-4xl leading-tight text-[#221c18]">
                Entrer dans
                <span className="block italic font-light text-[#6a5844]">
                  l’expérience Lex Vinum.
                </span>
              </h2>
            </div>

            <div className="p-8 md:p-10">
              <p className="max-w-2xl text-[15px] leading-8 text-[#5c544b]">
                Que tu partes d’une carte de restaurant, d’une envie précise,
                d’un accord ou d’une simple curiosité, l’expérience commence ici.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/scan"
                  className="inline-flex items-center rounded-full bg-[#1f1a17] px-6 py-3 text-sm font-medium text-[#f6efe7] transition hover:opacity-92"
                >
                  Scanner une carte des vins
                </Link>

                <Link
                  href="/recommandation"
                  className="inline-flex items-center rounded-full border border-[#cfc6b7] px-6 py-3 text-sm font-medium text-[#2a221d] transition hover:bg-[#eee7dc]"
                >
                  Lancer une recommandation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
