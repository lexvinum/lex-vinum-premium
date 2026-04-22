import Link from "next/link";

export default function DisponibleBientotPage() {
  return (
    <main className="min-h-screen bg-[#efe9dd] text-[#221c18]">
      <section className="px-4 pb-4 pt-4 md:px-6 md:pb-6 md:pt-6">
        <div className="relative min-h-[92vh] overflow-hidden rounded-[28px] border border-[#d8d1c5] bg-[radial-gradient(circle_at_top,rgba(95,109,85,0.18),transparent_30%),linear-gradient(180deg,#e7e0d4_0%,#efe9dd_55%,#f5f1ea_100%)]">
          
          {/* texture */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light premium-page-texture" />
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,252,248,0.40),rgba(239,233,221,0.88))]" />

          {/* header */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-6 py-6 md:px-10">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#5f6d55]">
              Lex Vinum Premium
            </p>
            <p className="hidden text-[11px] uppercase tracking-[0.28em] text-[#8a7f73] md:block">
              Disponible bientôt
            </p>
          </div>

          {/* contenu principal */}
          <div className="relative z-10 flex min-h-[92vh] items-center justify-center px-6 py-16 md:px-10">
            <div className="max-w-4xl text-center">
              
              <p className="text-[11px] uppercase tracking-[0.34em] text-[#6f8f7a]">
                Édition numérique du vin
              </p>

              <h1 className="mt-5 font-serif text-5xl leading-[0.95] text-[#231d19] md:text-7xl xl:text-[7.2rem]">
                Disponible
                <span className="block italic font-light text-[#5f6d55]">
                  bientôt.
                </span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-sm leading-8 text-[#5a534b] md:text-base">
                Une expérience éditoriale et premium autour du vin est en préparation.
                Scan de cartes, recommandations raffinées, répertoire intelligent et
                découverte du Québec dans une esthétique calme, élégante et assumée.
              </p>

              {/* tags */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <span className="rounded-full border border-[#d4cbbb] bg-white/60 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#6c6258]">
                  Scan
                </span>
                <span className="rounded-full border border-[#d4cbbb] bg-white/60 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#6c6258]">
                  Répertoire
                </span>
                <span className="rounded-full border border-[#d4cbbb] bg-white/60 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#6c6258]">
                  Recommandation
                </span>
              </div>

              {/* actions */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                
                <Link
                  href="mailto:bonjour@lexvinum.com"
                  className="inline-flex items-center rounded-full bg-[#1f1a17] px-6 py-3 text-sm font-medium text-[#f6efe7] transition hover:opacity-90"
                >
                  Être informé du lancement
                </Link>

                <Link
                  href="/admin-acces"
                  className="inline-flex items-center rounded-full border border-[#b79a72]/30 bg-white/40 px-6 py-3 text-xs uppercase tracking-[0.24em] text-[#6c5a47] transition hover:bg-white/60"
                >
                  Accès privé
                </Link>

              </div>

            </div>
          </div>
        </div>
      </section>
    </main>
  );
}