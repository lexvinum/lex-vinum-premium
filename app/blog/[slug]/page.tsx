import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDate(date: Date | null) {
  if (!date) return null;

  return new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function parseTags(tagsJson: string | null) {
  if (!tagsJson) return [];

  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function renderContent(content: string) {
  return content
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      published: true,
    },
  });

  if (!post || !post.published) {
    return {
      title: "Article introuvable | Lex Vinum",
      description: "Cet article est introuvable ou non publié.",
    };
  }

  return {
    title: post.seoTitle || `${post.title} | Lex Vinum`,
    description: post.seoDescription || post.excerpt || "Article Lex Vinum",
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      content: true,
      category: true,
      coverImage: true,
      author: true,
      tagsJson: true,
      published: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  if (!post || !post.published) {
    notFound();
  }

  const relatedPosts = await prisma.blogPost.findMany({
    where: {
      published: true,
      NOT: { id: post.id },
      ...(post.category ? { category: post.category } : {}),
    },
    orderBy: [{ featured: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: 3,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      category: true,
      coverImage: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  const tags = parseTags(post.tagsJson);
  const paragraphs = renderContent(post.content);
  const publicationDate = formatDate(post.publishedAt ?? post.createdAt);

  return (
    <main className="min-h-screen bg-[#0f1713] text-[#f6efe8]">
      <article>
        <section className="relative overflow-hidden border-b border-[rgba(111,143,122,0.22)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,150,120,0.18),transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.025),rgba(0,0,0,0.20))]" />
          <div className="absolute inset-0 opacity-[0.09] mix-blend-soft-light bg-[url('/textures/velvet-olive.jpg')] bg-cover bg-center" />
          <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_18%,rgba(255,255,255,0.02)_36%,transparent_54%,rgba(255,255,255,0.03)_72%,transparent_100%)]" />

          <div className="relative mx-auto max-w-6xl px-6 py-14 md:px-10 lg:px-12">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-[#d8c2b2] transition hover:text-[#dff1e5]"
            >
              <span aria-hidden>←</span>
              Retour au blog
            </Link>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-[#9ab3a1]">
                  {post.category ? (
                    <span className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.12)] px-3 py-1">
                      {post.category}
                    </span>
                  ) : null}

                  {publicationDate ? <span>{publicationDate}</span> : null}

                  {post.author ? <span>• {post.author}</span> : null}
                </div>

                <h1 className="max-w-4xl text-4xl font-semibold leading-tight text-[#fff8f1] md:text-6xl">
                  {post.title}
                </h1>

                {post.excerpt ? (
                  <p className="mt-6 max-w-3xl text-lg leading-8 text-[#d7c2b5]">
                    {post.excerpt}
                  </p>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.02))] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
                <div className="relative h-[280px]">
                  <Image
                    src={post.coverImage || "/images/editorial-2.jpeg"}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority={!post.coverImage}
                    unoptimized={!post.coverImage}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,25,20,0.78),rgba(15,25,20,0.18))]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-10 md:px-10 lg:px-12">
          <div className="overflow-hidden rounded-[32px] border border-[rgba(111,143,122,0.22)] bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.015))] shadow-[0_28px_90px_rgba(0,0,0,0.34)] backdrop-blur">
            <div className="grid gap-10 p-8 md:grid-cols-[minmax(0,1fr)_300px] md:p-10">
              <div className="min-w-0">
                <div className="mb-8 overflow-hidden rounded-[26px] border border-white/10">
                  <div className="relative h-[280px] md:h-[460px] bg-[#1a221d]">
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover"
                        priority
                      />
                    ) : (
                      <Image
                        src="/images/editorial-1.jpeg"
                        alt={post.title}
                        fill
                        className="object-cover"
                        priority
                        unoptimized
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#101613] via-transparent to-transparent" />
                  </div>
                </div>

                <div className="max-w-none">
                  {paragraphs.map((paragraph, index) => (
                    <p
                      key={`${post.id}-${index}`}
                      className="mb-6 text-[1.03rem] leading-8 text-[#eadfd6]"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.02))]">
                  <div className="relative h-[180px]">
                    <Image
                      src="/images/lifestyle-2.jpeg"
                      alt="Lecture lounge"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,25,20,0.72),rgba(15,25,20,0.10))]" />
                  </div>

                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#9ab3a1]">
                      Fiche article
                    </p>

                    <div className="mt-5 space-y-4 text-sm text-[#d9c5b7]">
                      <div>
                        <p className="text-[#8fae9b]">Catégorie</p>
                        <p className="mt-1 text-[#fff4ea]">{post.category || "Journal"}</p>
                      </div>

                      <div>
                        <p className="text-[#8fae9b]">Publication</p>
                        <p className="mt-1 text-[#fff4ea]">{publicationDate || "À venir"}</p>
                      </div>

                      {post.author ? (
                        <div>
                          <p className="text-[#8fae9b]">Auteur</p>
                          <p className="mt-1 text-[#fff4ea]">{post.author}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {tags.length > 0 ? (
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.02))] p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#9ab3a1]">
                      Thèmes
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.12)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#e1eee5]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(120,150,120,0.10),rgba(255,255,255,0.03))]">
                  <div className="relative h-[180px]">
                    <Image
                      src="/images/editorial-2.jpeg"
                      alt="Découvrir ensuite"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,25,20,0.78),rgba(15,25,20,0.16))]" />
                  </div>

                  <div className="p-6">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#9ab3a1]">
                      À découvrir ensuite
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#dbc8bb]">
                      Continue l’exploration du vin avec d’autres repères
                      éditoriaux, pensés pour t’aider à mieux lire une carte et
                      choisir avec confiance.
                    </p>

                    <div className="mt-5 flex flex-col gap-3">
                      <Link
                        href="/recommandation"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#6f8f7a] bg-[rgba(111,143,122,0.12)] px-4 py-2 text-sm font-medium text-[#e6efe7] transition hover:bg-[rgba(111,143,122,0.18)]"
                      >
                        Ouvrir la recommandation
                        <span aria-hidden>→</span>
                      </Link>

                      <Link
                        href="/scan"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[#e7d6c9] transition hover:border-[#6f8f7a]/70 hover:bg-white/5"
                      >
                        Scanner une carte des vins
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-16 md:px-10 lg:px-12">
          <div className="mb-6">
            <p className="text-xs uppercase tracking-[0.32em] text-[#90aa98]">
              Lecture suivante
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#fff8f1] md:text-3xl">
              Articles connexes
            </h2>
          </div>

          {relatedPosts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {relatedPosts.map((related: (typeof relatedPosts)[number]) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="group overflow-hidden rounded-[26px] border border-[rgba(111,143,122,0.18)] bg-[linear-gradient(180deg,rgba(120,150,120,0.08),rgba(255,255,255,0.02))] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-[#6f8f7a]/70"
                >
                  <div className="relative h-56 bg-[#1a221d]">
                    {related.coverImage ? (
                      <Image
                        src={related.coverImage}
                        alt={related.title}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <Image
                        src="/images/lifestyle-1.jpeg"
                        alt={related.title}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-[1.03]"
                        unoptimized
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#101613] via-transparent to-transparent" />
                  </div>

                  <div className="p-6">
                    <div className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-[#90aa98]">
                      {related.category ? <span>{related.category}</span> : null}
                    </div>

                    <h3 className="text-xl font-semibold leading-snug text-[#fff8f1]">
                      {related.title}
                    </h3>

                    {related.excerpt ? (
                      <p className="mt-4 line-clamp-3 text-sm leading-7 text-[#d5c0b3]">
                        {related.excerpt}
                      </p>
                    ) : null}

                    <div className="mt-6 flex items-center justify-between text-sm text-[#cab4a5]">
                      <span>{formatDate(related.publishedAt ?? related.createdAt)}</span>
                      <span className="inline-flex items-center gap-2 font-medium text-[#d8eadf] transition group-hover:translate-x-1">
                        Lire
                        <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-[26px] border border-dashed border-white/10 bg-white/5 p-10 text-center text-[#d7c2b5]">
              Aucun autre article publié pour le moment.
            </div>
          )}
        </section>
      </article>
    </main>
  );
}