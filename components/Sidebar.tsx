"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  eyebrow?: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", eyebrow: "Maison" },
  { href: "/repertoire", label: "Répertoire", eyebrow: "Explorer" },
  { href: "/scan", label: "Scan", eyebrow: "OCR" },
  { href: "/recommandation", label: "Recommandation", eyebrow: "Sélection" },
  { href: "/carte", label: "Carte", eyebrow: "Découvrir" },
  { href: "/blog", label: "Blogue", eyebrow: "Éditorial" },
  { href: "/boutique", label: "Boutique", eyebrow: "Objets" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isPublicPage =
    pathname === "/disponible-bientot" || pathname === "/admin-acces";

  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("lexvinum:open-sidebar", handleOpen);

    return () => {
      window.removeEventListener("lexvinum:open-sidebar", handleOpen);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (isPublicPage) {
    return null;
  }

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={[
          "fixed inset-0 z-[60] bg-[rgba(7,10,8,0.34)] backdrop-blur-[10px] transition-all duration-500",
          open ? "visible opacity-100" : "invisible opacity-0",
        ].join(" ")}
      />

      <aside
        aria-hidden={!open}
        className={[
          "fixed left-0 top-0 z-[65] flex h-screen w-full max-w-[460px] flex-col overflow-hidden",
          "border-r border-[rgba(235,223,205,0.10)] text-[#efe6d8]",
          "bg-[linear-gradient(180deg,#10271b_0%,#153323_38%,#11261b_100%)]",
          "shadow-[0_30px_90px_rgba(0,0,0,0.26)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(228,214,190,0.10),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(228,214,190,0.06),transparent_24%)]" />

        <div className="relative z-10 flex h-full flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between px-8 pb-6 pt-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(235,223,205,0.16)] bg-[rgba(255,255,255,0.05)] text-sm tracking-[0.28em] text-[#f0e6d8]">
                LV
              </div>

              <p className="font-[var(--font-display)] text-[2.2rem] text-[#f5ecde]">
                Lex Vinum
              </p>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-[rgba(235,223,205,0.18)] px-4 py-2 text-[11px] uppercase tracking-[0.24em] text-[#e7dbca] transition hover:bg-[rgba(255,255,255,0.08)]"
            >
              Fermer
            </button>
          </div>

          {/* NAV */}
          <nav className="flex-1 overflow-y-auto px-8 pb-8 pt-4">
            <div className="space-y-4">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                const isScan = item.href === "/scan";

                if (isScan) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "group relative block overflow-hidden rounded-[32px] border px-6 py-7 transition-all duration-300",
                        "border-[rgba(235,223,205,0.14)]",
                        isActive
                          ? "bg-[linear-gradient(135deg,rgba(234,218,193,0.20)_0%,rgba(95,109,85,0.28)_100%)]"
                          : "bg-[linear-gradient(135deg,rgba(234,218,193,0.12)_0%,rgba(95,109,85,0.22)_100%)] hover:bg-[linear-gradient(135deg,rgba(234,218,193,0.16)_0%,rgba(95,109,85,0.28)_100%)]",
                      ].join(" ")}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.10),transparent_28%)]" />

                      <div className="relative z-10">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.34em] text-[#d4c4aa]">
                              {item.eyebrow}
                            </p>

                            <p className="mt-2 font-[var(--font-display)] text-[2.15rem] leading-[0.92] tracking-[0.02em] text-[#f7eee2]">
                              {item.label}
                              <span className="block italic font-light text-[#e6d8c2]">
                                instantané.
                              </span>
                            </p>
                          </div>

                          <span className="mt-2 text-[11px] uppercase tracking-[0.26em] text-[#e6d7c0]">
                            Entrer
                          </span>
                        </div>

                        <p className="mt-5 max-w-[310px] text-[14px] leading-7 text-[#e0d5c7]">
                          Photographier une carte, lire l’essentiel, puis
                          transformer l’intuition en vraie recommandation.
                        </p>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group block rounded-[30px] border px-6 py-6 shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-all duration-300",
                      isActive
                        ? "border-[rgba(210,190,160,0.35)] bg-[#f4eee3]"
                        : "border-[rgba(210,190,160,0.18)] bg-[rgba(244,238,227,0.92)] hover:bg-[#f4eee3]",
                    ].join(" ")}
                  >
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p
                          className={[
                            "text-[10px] uppercase tracking-[0.34em]",
                            isActive ? "text-[#6c7b63]" : "text-[#8f877b]",
                          ].join(" ")}
                        >
                          {item.eyebrow}
                        </p>

                        <p
                          className={[
                            "mt-2 font-[var(--font-display)] text-[1.6rem] md:text-[1.7rem] leading-none tracking-[0.04em]",
                            isActive
                              ? "text-[#1c1a17]"
                              : "text-[#1c1a17] group-hover:text-[#2f4f3e]",
                          ].join(" ")}
                        >
                          {item.label}
                        </p>
                      </div>

                      <span
                        className={[
                          "text-[11px] uppercase tracking-[0.26em]",
                          isActive
                            ? "text-[#6f7d65]"
                            : "text-[#9c9387] group-hover:text-[#6f7d65]",
                        ].join(" ")}
                      >
                        Entrer
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* FOOTER CARD */}
          <div className="px-8 pb-8">
            <div className="overflow-hidden rounded-[32px] border border-[rgba(235,223,205,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))]">
              <div className="border-b border-[rgba(235,223,205,0.08)] px-7 py-5">
                <p className="text-[10px] uppercase tracking-[0.34em] text-[#cbbfae]">
                  Espace personnel
                </p>
                <p className="mt-3 font-[var(--font-display)] text-[2.3rem] leading-none text-[#f5ecde]">
                  Ma cave
                </p>
              </div>

              <div className="px-7 py-6">
                <p className="max-w-[290px] text-[15px] leading-8 text-[#d7ccbc]">
                  Votre collection privée et vos bouteilles favorites, réunies
                  dans un espace personnel plus intime et raffiné.
                </p>

                <Link
                  href="/cellar"
                  className="mt-6 inline-flex rounded-full border border-[rgba(235,223,205,0.18)] bg-[rgba(255,255,255,0.05)] px-5 py-2.5 text-[11px] uppercase tracking-[0.26em] text-[#efe3d3] transition hover:bg-[rgba(255,255,255,0.10)]"
                >
                  Ouvrir ma cave
                </Link>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}