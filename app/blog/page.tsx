import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

function formatDate(date: Date | null) {
  if (!date) return null;

  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: {
      published: true,
    },
    orderBy: [
      { featured: "desc" },
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      featured: true,
      coverImage: true,
      author: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  const [featuredPost, ...otherPosts] = posts;

  return (
    <main className="min-h-screen bg-[#0f1713] text-[#f4ede5]">
      <section className="relative overflow-hidden border-b border-[rgba(111,143,122,0.22)]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,150,120,0.18),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.30))]" />
          <div className="absolute inset-0 opacity-[0.09] mix-blend-soft-light bg-[url('/textures/velvet-olive.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_18%,rgba(255,255,255,0.02)_36%,transparent_54%,rgba(255,255,255,0.03)_72%,transparent_100%)]" />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-12 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="mb-4 text-xs uppercase tracking-[0.38em] text-[#9ab3a1]">
              Journal Lex Vinum
            </p>

            <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#fff8f1] md:text-6xl">
              Un blog pensé comme un lounge feutré, pour lire le vin autrement.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-[#d8c4b7] md:text-lg">
              Conseils au restaurant, lecture de cartes, accords, styles et
              repères premium. Une matière éditoriale plus intime, plus posée,
              plus enveloppante.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/scan"
                className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.12)] px-5 py-2 text-sm text-[#e6efe7] transition hover:bg-[rgba(111,143,122,0.18)]"
              >
                Scanner une carte
              </Link>

              <Link
                href="/recommandation"
                className="rounded-full border border-white/10 px-5 py-2 text-sm text-[#e7d6c9] transition hover:border-[#6f8f7a]/70 hover:bg-white/5"
              >
                Trouver un vin
              </Link>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.015))] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
              <div className="relative h-[240px]">
                <Image
                  src="/images/editorial-2.jpeg"
                  alt="Ambiance lounge éditoriale"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,25,20,0.78),rgba(15,25,20,0.18))]" />
              </div>

              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#9ab3a1]">
                  Lounge feutré
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#fff8f1]">
                  Une lecture plus intime
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#d5c0b3]">
                  Une présence plus chaude, plus silencieuse, plus éditoriale
                  que les autres sections du site.
                </p>
              </div>
            </div>

            <div className="group overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.015))] shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
              <div className="relative h-[240px]">
                <Image
                  src="/images/lifestyle-2.jpeg"
                  alt="Lecture et dégustation"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  unoptimized
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,25,20,0.78),rgba(15,25,20,0.18))]" />
              </div>

              <div className="p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#9ab3a1]">
                  Journal premium
                </p>
                <h2 className="mt-2 font-serif text-2xl text-[#fff8f1]">
                  Lire, choisir, comprendre
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#d5c0b3]">
                  Des articles construits pour t’aider à mieux choisir, avec une
                  esthétique plus douce et plus enveloppante.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 lg:px-12">
        {featuredPost ? (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="group mb-16 grid overflow-hidden rounded-[34px] border border-[rgba(111,143,122,0.22)] bg-[linear-gradient(135deg,rgba(120,150,120,0.08),rgba(255,255,255,0.015))] shadow-[0_34px_100px_rgba(0,0,0,0.34)] backdrop-blur md:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="relative min-h-[360px] bg-[#1a221d]">
              {featuredPost.coverImage ? (
                <Image
                  src={featuredPost.coverImage}
                  alt={featuredPost.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              ) : (
                <Image
                  src="/images/editorial-1.jpeg"
                  alt={featuredPost.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  unoptimized
                />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(12,16,13,0.12),rgba(12,16,13,0.24))]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#101613] via-[#101613]/30 to-transparent" />
            </div>

            <div className="flex flex-col justify-between p-8 md:p-10">
              <div>
                <div className="mb-5 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-[#9ab3a1]">
                  <span className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.10)] px-3 py-1">
                    Article en vedette
                  </span>
                  {featuredPost.category && <span>{featuredPost.category}</span>}
                </div>

                <h2 className="text-3xl font-semibold text-[#fff8f1] md:text-4xl">
                  {featuredPost.title}
                </h2>

                {featuredPost.excerpt && (
                  <p className="mt-5 text-[#dbc7bb] leading-8">
                    {featuredPost.excerpt}
                  </p>
                )}
              </div>

              <div className="mt-8 flex items-center gap-3 text-sm text-[#cdb7aa]">
                <span>
                  {formatDate(featuredPost.publishedAt ?? featuredPost.createdAt)}
                </span>

                <span className="ml-auto text-[#d8eadf] transition group-hover:translate-x-1">
                  Lire →
                </span>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[#90aa98]">
              Bibliothèque éditoriale
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#fff8f1] md:text-3xl">
              Tous les articles
            </h2>
          </div>

          <div className="hidden rounded-full border border-white/10 bg-[rgba(111,143,122,0.08)] px-4 py-2 text-sm text-[#d8c4b7] md:block">
            {posts.length} article{posts.length > 1 ? "s" : ""}
          </div>
        </div>

        {otherPosts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {otherPosts.map((post: (typeof otherPosts)[number]) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-[26px] border border-[rgba(111,143,122,0.18)] bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.24)] transition hover:-translate-y-1 hover:border-[#6f8f7a]/70"
              >
                <div className="relative h-60 bg-[#1a221d]">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <Image
                      src="/images/lifestyle-1.jpeg"
                      alt={post.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                      unoptimized
                    />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#101613] via-transparent to-transparent" />
                </div>

                <div className="p-6">
                  <div className="mb-3 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-[#90aa98]">
                    {post.category ? <span>{post.category}</span> : <span>Journal</span>}
                  </div>

                  <h3 className="text-xl font-semibold text-[#fff8f1]">
                    {post.title}
                  </h3>

                  {post.excerpt && (
                    <p className="mt-4 line-clamp-4 text-sm leading-7 text-[#d5c0b3]">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="mt-6 flex justify-between text-sm text-[#c9b2a4]">
                    <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
                    <span className="text-[#d8eadf] transition group-hover:translate-x-1">
                      Lire →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/5 p-10 text-center text-[#d7c2b5]">
            Aucun article publié pour le moment.
          </div>
        )}

        <section className="mt-16 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.015))] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
            <div className="relative h-[280px]">
              <Image
                src="/images/editorial-1.jpeg"
                alt="Ambiance du journal"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,25,20,0.78),rgba(15,25,20,0.16))]" />
            </div>

            <div className="p-7">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9ab3a1]">
                Atmosphère
              </p>
              <h3 className="mt-2 font-serif text-3xl text-[#fff8f1]">
                Un espace plus feutré que le reste du site
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#d6c2b5]">
                Le blog adopte une présence plus enveloppante, plus calme, plus
                “salon privé”, tout en restant cohérent avec Lex Vinum Premium.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.10),rgba(255,255,255,0.03))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9ab3a1]">
                Lecture
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#fff8f1]">
                Des repères concrets
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#d7c2b5]">
                Chaque article est pensé pour clarifier sans alourdir, avec une
                voix plus éditoriale et plus posée.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.10),rgba(255,255,255,0.03))] p-7 shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#9ab3a1]">
                Style
              </p>
              <h3 className="mt-2 font-serif text-2xl text-[#fff8f1]">
                Une esthétique de revue
              </h3>
              <p className="mt-3 text-sm leading-7 text-[#d7c2b5]">
                Plus chaude, plus dense, plus cinématographique, sans perdre la
                clarté d’usage du site.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}