import Link from "next/link";
import { notFound } from "next/navigation";
import { getRelatedWines, getWineBySlug } from "@/lib/wines";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function WineDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const wine = await getWineBySlug(slug);

  if (!wine) {
    notFound();
  }

  const relatedWines = await getRelatedWines(slug);

  return (
    <main className="page-shell py-10">
      <div className="mb-6">
        <Link href="/repertoire" className="text-sm text-[var(--text-soft)] transition hover:text-white">
          ← Retour au répertoire
        </Link>
      </div>

      <section className="glass-card rounded-[32px] p-8">
        <h1 className="text-4xl font-semibold text-white">{wine.name}</h1>
        <p className="mt-3 text-[var(--text-soft)]">
          {[wine.producer, wine.vintage, wine.region, wine.country, wine.grape].filter(Boolean).join(" • ")}
        </p>
        <p className="mt-6 leading-8 text-[var(--text-soft)]">{wine.description}</p>
      </section>

      <section className="mt-6 glass-card rounded-[32px] p-8">
        <h2 className="text-2xl font-semibold text-white">Vins similaires</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {relatedWines.map((item: any) => (
            <Link key={item.id} href={`/vins/${item.slug}`} className="rounded-[22px] border border-[var(--border)] p-4">
              <p className="font-medium text-white">{item.name}</p>
              <p className="mt-2 text-sm text-[var(--text-soft)]">
                {[item.region, item.country].filter(Boolean).join(" • ")}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}