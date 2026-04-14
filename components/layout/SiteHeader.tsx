import Link from "next/link";

const navItems = [
  { href: "/", label: "Accueil" },
  { href: "/repertoire", label: "Répertoire" },
  { href: "/scan", label: "Scan" },
  { href: "/recommandation", label: "Recommandation" },
  { href: "/carte", label: "Carte" },
  { href: "/blog", label: "Blogue" },
  { href: "/boutique", label: "Boutique" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(191,165,145,0.12)] bg-[rgba(20,18,15,0.72)] backdrop-blur-2xl">
      <div className="page-shell">
        <div className="flex items-center justify-between py-4 md:py-5">
          <Link href="/" className="group flex items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[rgba(191,165,145,0.18)] bg-[linear-gradient(145deg,rgba(96,83,49,0.48),rgba(49,22,7,0.68))] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <div className="absolute inset-[1px] rounded-full border border-[rgba(255,255,255,0.06)]" />
              <span className="relative text-[12px] font-semibold tracking-[0.34em] text-[var(--text)]">
                LV
              </span>
            </div>

            <div className="min-w-0">
              <p className="font-[var(--font-display)] text-[1.7rem] leading-none tracking-[0.04em] text-[var(--text)]">
                Lex Vinum
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-px w-8 bg-[rgba(191,165,145,0.28)]" />
                <p className="text-[10px] uppercase tracking-[0.34em] text-[var(--muted)]">
                  Private Cellar Edition
                </p>
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-2 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-[13px] tracking-[0.08em] text-[var(--text-soft)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/favoris"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(191,165,145,0.18)] bg-[rgba(255,255,255,0.02)] px-4 py-2 text-sm text-[var(--text-soft)] transition hover:border-[rgba(191,165,145,0.28)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text)]"
            >
              <span className="text-base leading-none">♡</span>
              <span>Favoris</span>
            </Link>

            <Link
              href="/recommandation"
              className="inline-flex items-center justify-center rounded-full border border-[rgba(191,165,145,0.12)] bg-[linear-gradient(135deg,var(--accent)_0%,#d4bba7_100%)] px-5 py-2.5 text-sm font-semibold text-[#1a1713] shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-[1px] hover:brightness-[1.03]"
            >
              Trouver un vin
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/favoris"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(191,165,145,0.18)] bg-[rgba(255,255,255,0.02)] text-[var(--text-soft)]"
            >
              ♡
            </Link>

            <Link
              href="/recommandation"
              className="inline-flex items-center justify-center rounded-full border border-[rgba(191,165,145,0.14)] bg-[linear-gradient(135deg,var(--accent)_0%,#d4bba7_100%)] px-4 py-2 text-sm font-medium text-[#1a1713]"
            >
              Reco
            </Link>
          </div>
        </div>

        <div className="hidden pb-3 md:block lg:hidden">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {navItems.map((item) => (
              <Link
                key={`mobile-row-${item.href}`}
                href={item.href}
                className="shrink-0 rounded-full border border-[rgba(191,165,145,0.14)] bg-[rgba(255,255,255,0.02)] px-4 py-2 text-[12px] tracking-[0.08em] text-[var(--text-soft)]"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}