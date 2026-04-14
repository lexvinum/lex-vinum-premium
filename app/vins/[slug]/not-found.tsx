import Link from "next/link";

export default function WineNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#120d0b] px-6 text-[#f6eee8]">
      <div className="max-w-xl rounded-[32px] border border-white/10 bg-[#1a120f] p-10 text-center">
        <p className="text-sm uppercase tracking-[0.28em] text-[#b78a6b]">
          Lex Vinum
        </p>

        <h1 className="mt-4 text-3xl font-semibold text-white">
          Cette fiche vin n’existe pas
        </h1>

        <p className="mt-4 leading-8 text-[#d7c2b5]">
          Le vin demandé est introuvable ou son slug ne correspond pas à une
          bouteille existante.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/repertoire"
            className="rounded-full border border-[#6f4b3b] bg-[#a56a43] px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Retour au répertoire
          </Link>

          <Link
            href="/"
            className="rounded-full border border-white/10 px-6 py-3 text-sm font-medium text-[#f6eee8] transition hover:bg-white/5"
          >
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}