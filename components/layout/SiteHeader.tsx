"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function SiteHeader() {
  const pathname = usePathname();

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  const isCellar = pathname?.startsWith("/cellar");
  const isRecommendation = pathname?.startsWith("/recommandation");

  const isPublicPage =
    pathname === "/disponible-bientot" || pathname === "/admin-acces";

  useEffect(() => {
    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;

      setScrolled(currentY > 16);

      if (currentY > 140 && currentY > lastY) {
        setHidden(true);
      } else {
        setHidden(false);
      }

      lastY = currentY;
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isPublicPage) {
    return null;
  }

  function openSidebar() {
    window.dispatchEvent(new CustomEvent("lexvinum:open-sidebar"));
  }

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        hidden ? "-translate-y-4 opacity-0" : "translate-y-0 opacity-100",
      ].join(" ")}
    >
      <div
        className={[
          "w-full border-b backdrop-blur-xl transition-all duration-500",
          scrolled
            ? "border-[rgba(212,194,167,0.14)] bg-[rgba(14,12,10,0.62)] shadow-[0_12px_30px_rgba(0,0,0,0.18)]"
            : "border-[rgba(212,194,167,0.08)] bg-[rgba(14,12,10,0.22)]",
        ].join(" ")}
      >
        <div className="grid h-[82px] grid-cols-[1fr_auto_1fr] items-center px-6 md:h-[88px] md:px-10">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={openSidebar}
              aria-label="Ouvrir le menu"
              className={[
                "inline-flex items-center gap-3 rounded-full border px-3.5 py-2 text-sm transition-all duration-300",
                scrolled
                  ? "border-[rgba(212,194,167,0.18)] bg-[rgba(255,255,255,0.05)] text-[var(--text)]"
                  : "border-[rgba(212,194,167,0.12)] bg-[rgba(255,255,255,0.03)] text-[var(--text)]",
              ].join(" ")}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(212,194,167,0.18)] bg-[rgba(255,255,255,0.04)] text-[10px] tracking-[0.28em]">
                LV
              </span>
              <span className="uppercase tracking-[0.18em] text-xs text-[var(--muted)]">
                Menu
              </span>
            </button>
          </div>

          <div className="flex items-center justify-center">
            <Link
              href="/"
              aria-label="Retour à l’accueil"
              className="transition-opacity duration-300 hover:opacity-90"
            >
              <Image
                src="/images/logo-lexvinum.png"
                alt="Lex Vinum"
                width={420}
                height={160}
                priority
                className="h-[48px] w-auto object-contain opacity-90 md:h-[56px]"
              />
            </Link>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/cellar"
              className={[
                "text-sm transition-colors duration-300",
                isCellar
                  ? "text-[var(--text)]"
                  : "text-[var(--text-soft)] hover:text-[var(--text)]",
              ].join(" ")}
            >
              Ma cave
            </Link>

            <Link
              href="/recommandation"
              className={[
                "rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300",
                isRecommendation
                  ? "bg-[linear-gradient(135deg,#eadac1_0%,#d7b998_100%)] text-[#1a1713]"
                  : "bg-[linear-gradient(135deg,#eadac1_0%,#d7b998_100%)] text-[#1a1713] hover:-translate-y-[1px] hover:brightness-[1.03]",
              ].join(" ")}
            >
              Trouver un vin
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}