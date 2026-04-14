"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type WineRecommendation = {
  id: string;
  slug: string | null;
  name: string | null;
  producer: string | null;
  country: string | null;
  region: string | null;
  color: string | null;
  style: string | null;
  price: number | null;
  description: string | null;
  featured: boolean;
  isQuebec: boolean;
  grape: string | null;
  body: number | null;
  acidity: number | null;
  tannin: number | null;
  minerality: number | null;
};

type Props = {
  wines?: WineRecommendation[];
};

function formatPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(value);
}

function normalize(value: string | null | undefined) {
  return (value || "").toLowerCase().trim();
}

function scoreWine(
  wine: WineRecommendation,
  filters: {
    dish: string;
    budget: string;
    color: string;
    style: string;
  }
) {
  let score = 70;
  const reasons: string[] = [];

  if (filters.color && normalize(wine.color) === normalize(filters.color)) {
    score += 10;
    reasons.push(`Correspond à la couleur recherchée (${filters.color}).`);
  }

  if (
    filters.style &&
    (normalize(wine.style).includes(normalize(filters.style)) ||
      normalize(filters.style).includes(normalize(wine.style)))
  ) {
    score += 8;
    reasons.push(`Le style du vin rejoint bien la recherche (${filters.style}).`);
  }

  if (filters.budget) {
    const maxBudget = Number(filters.budget);
    if (!Number.isNaN(maxBudget) && typeof wine.price === "number") {
      if (wine.price <= maxBudget) {
        score += 8;
        reasons.push("Respecte bien le budget fixé.");
      } else if (wine.price <= maxBudget + 10) {
        score += 2;
        reasons.push("Légèrement au-dessus du budget, mais reste défendable.");
      } else {
        score -= 8;
      }
    }
  }

  if (filters.dish) {
    const dish = normalize(filters.dish);

    if (dish === "boeuf") {
      if (normalize(wine.color) === "rouge") {
        score += 10;
        reasons.push("Le profil rouge fonctionne bien avec le bœuf.");
      }
      if ((wine.tannin ?? 0) >= 2) {
        score += 4;
        reasons.push("La structure soutient bien un plat plus riche.");
      }
    }

    if (dish === "poisson") {
      if (normalize(wine.color) === "blanc") {
        score += 10;
        reasons.push("Le blanc est une option très cohérente avec le poisson.");
      }
      if ((wine.acidity ?? 0) >= 2) {
        score += 4;
        reasons.push("La fraîcheur aide beaucoup à table.");
      }
    }

    if (dish === "volaille") {
      score += 6;
      reasons.push("Profil polyvalent qui peut bien accompagner la volaille.");
    }

    if (dish === "pates") {
      score += 5;
      reasons.push("Le vin reste assez flexible pour accompagner des pâtes.");
    }
  }

  if (wine.featured) {
    score += 4;
    reasons.push("Fait partie des sélections mises en avant.");
  }

  if (wine.isQuebec) {
    score += 2;
    reasons.push("Belle option locale dans l’univers Lex Vinum.");
  }

  if (reasons.length === 0) {
    reasons.push("Profil globalement cohérent pour une recommandation premium.");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}

export default function RecommandationClient({ wines = [] }: Props) {
  const safeWines = Array.isArray(wines) ? wines : [];

  const [dish, setDish] = useState("");
  const [budget, setBudget] = useState("");
  const [color, setColor] = useState("");
  const [style, setStyle] = useState("");

  const recommendations = useMemo(() => {
    return safeWines
      .map((wine) => {
        const scored = scoreWine(wine, { dish, budget, color, style });

        const reasons: string[] = [];

        if (color && normalize(wine.color) === normalize(color)) {
          reasons.push(`Correspond à la couleur recherchée (${color}).`);
        }

        if (
          style &&
          (normalize(wine.style).includes(normalize(style)) ||
            normalize(style).includes(normalize(wine.style)))
        ) {
          reasons.push(`Le style rejoint bien la recherche (${style}).`);
        }

        if (budget && typeof wine.price === "number" && wine.price <= Number(budget)) {
          reasons.push("Respecte bien le budget fixé.");
        }

        if (dish === "boeuf" && normalize(wine.color) === "rouge") {
          reasons.push("Très bon réflexe pour un plat de bœuf.");
        }

        if (dish === "poisson" && normalize(wine.color) === "blanc") {
          reasons.push("Très bon réflexe pour un plat de poisson.");
        }

        if (wine.featured) {
          reasons.push("Sélection mise en avant dans Lex Vinum.");
        }

        return {
          ...wine,
          score: scored.score,
          reasons: (reasons.length ? reasons : scored.reasons).slice(0, 3),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [safeWines, dish, budget, color, style]);

  const topWine = recommendations[0];
  const safeWine = recommendations[1] ?? recommendations[0];
  const valueWine =
    [...recommendations]
      .filter((wine) => typeof wine.price === "number")
      .sort((a, b) => {
        const aRatio = a.score / (a.price || 1);
        const bRatio = b.score / (b.price || 1);
        return bRatio - aRatio;
      })[0] ?? recommendations[0];

  const handleReset = () => {
    setDish("");
    setBudget("");
    setColor("");
    setStyle("");
  };

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="overflow-hidden rounded-[30px] border border-[#495646] bg-[#233126] shadow-[0_28px_90px_rgba(16,18,14,0.28)]">
        <div className="grid xl:grid-cols-[0.44fr_0.56fr]">
          <div className="border-b border-[#3f4a3d] p-6 md:p-8 xl:border-b-0 xl:border-r">
            <p className="text-[11px] uppercase tracking-[0.34em] text-[#cbbfae]">
              Paramètres de recommandation
            </p>

            <h2 className="mt-4 font-serif text-4xl leading-[0.94] text-[#f4ede3] md:text-5xl">
              Une lecture
              <span className="block italic font-light text-[#decfb5]">
                country club.
              </span>
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-8 text-[#ddd4c8]">
              Ajuste les critères pour faire remonter une sélection plus
              statutaire, plus nette, plus club privé.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Field label="Type de plat">
                <select
                  className="club-select"
                  value={dish}
                  onChange={(e) => setDish(e.target.value)}
                >
                  <option value="">Choisir</option>
                  <option value="boeuf">Bœuf</option>
                  <option value="poisson">Poisson</option>
                  <option value="volaille">Volaille</option>
                  <option value="pates">Pâtes</option>
                </select>
              </Field>

              <Field label="Budget">
                <select
                  className="club-select"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                >
                  <option value="">Choisir</option>
                  <option value="25">Moins de 25 $</option>
                  <option value="40">Moins de 40 $</option>
                  <option value="60">Moins de 60 $</option>
                </select>
              </Field>

              <Field label="Couleur">
                <select
                  className="club-select"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                >
                  <option value="">Choisir</option>
                  <option value="Rouge">Rouge</option>
                  <option value="Blanc">Blanc</option>
                  <option value="Rosé">Rosé</option>
                </select>
              </Field>

              <Field label="Style">
                <select
                  className="club-select"
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  <option value="">Choisir</option>
                  <option value="leger">Léger</option>
                  <option value="ample">Ample</option>
                  <option value="vif">Vif</option>
                  <option value="boise">Boisé</option>
                </select>
              </Field>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center rounded-full bg-[#e4d5bc] px-6 py-3 text-sm font-medium text-[#1d1712] transition hover:bg-[#ecdec7]"
                type="button"
              >
                Lancer la recommandation
              </button>

              <button
                className="inline-flex items-center rounded-full border border-[#70806a] bg-[rgba(255,255,255,0.05)] px-6 py-3 text-sm font-medium text-[#f3ece1] transition hover:bg-[rgba(255,255,255,0.10)]"
                type="button"
                onClick={handleReset}
              >
                Réinitialiser
              </button>
            </div>
          </div>

          <div className="bg-[linear-gradient(180deg,#2e3d31_0%,#233126_100%)] p-6 md:p-8">
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DarkStatCard
                    label="Meilleur choix"
                    value={topWine?.score ? `${topWine.score}/100` : "—"}
                  />
                  <DarkStatCard
                    label="Valeur sûre"
                    value={safeWine?.score ? `${safeWine.score}/100` : "—"}
                  />
                  <DarkStatCard
                    label="Meilleure valeur"
                    value={valueWine?.price ? formatPrice(valueWine.price) : "—"}
                  />
                </div>

                {topWine ? (
                  <>
                    <p className="mt-8 text-[11px] uppercase tracking-[0.34em] text-[#cfc3ac]">
                      Recommandation principale
                    </p>

                    <h3 className="mt-4 font-serif text-4xl leading-[0.94] text-[#f4ede3] md:text-5xl">
                      {topWine.name || "Vin sans nom"}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-[#ddd4c8]">
                      {[
                        topWine.producer || "Sélection Lex Vinum",
                        topWine.country,
                        topWine.region,
                        topWine.color,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-8 text-[11px] uppercase tracking-[0.34em] text-[#cfc3ac]">
                      Recommandation principale
                    </p>
                    <h3 className="mt-4 font-serif text-4xl leading-[0.94] text-[#f4ede3]">
                      Aucune recommandation disponible
                    </h3>
                  </>
                )}
              </div>

              {topWine ? (
                <>
                  <div className="mt-8 grid gap-3 md:grid-cols-3">
                    {topWine.reasons.map((reason) => (
                      <div
                        key={reason}
                        className="rounded-[20px] border border-[rgba(228,213,188,0.14)] bg-[rgba(255,255,255,0.05)] p-4"
                      >
                        <p className="text-sm leading-7 text-[#e4dbcf]">{reason}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Link
                      href={`/vins/${topWine.slug || topWine.id}`}
                      className="inline-flex items-center rounded-full bg-[#e4d5bc] px-6 py-3 text-sm font-medium text-[#1d1712] transition hover:bg-[#ecdec7]"
                    >
                      Ouvrir la fiche complète
                    </Link>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <ClubStatCard
          label="Candidats retenus"
          value={recommendations.length}
          hint="Vins réellement issus de ta base actuelle."
        />
        <ClubStatCard
          label="Meilleur score"
          value={topWine?.score ? `${topWine.score}/100` : "—"}
          hint="La recommandation la plus cohérente du moment."
        />
        <ClubStatCard
          label="Option sûre"
          value={safeWine?.name || "—"}
          hint="Une bouteille simple à assumer avec élégance."
        />
        <ClubStatCard
          label="Meilleure valeur"
          value={valueWine?.price ? formatPrice(valueWine.price) : "—"}
          hint="Le bon équilibre entre prix et plaisir."
        />
      </section>

      <section className="overflow-hidden rounded-[30px] border border-[#d7cfc2] bg-[#f6f2eb] shadow-[0_18px_60px_rgba(31,26,23,0.05)]">
        <div className="border-b border-[#ddd5c9] px-6 py-6 md:px-8">
          <p className="text-[11px] uppercase tracking-[0.34em] text-[#7a7165]">
            Classement recommandé
          </p>
          <h2 className="mt-3 font-serif text-4xl leading-[0.96] text-[#221c18] md:text-5xl">
            Une sélection plus statutaire,
            <span className="block italic font-light text-[#5f6d55]">
              plus club, plus maison privée.
            </span>
          </h2>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2 md:p-8 xl:grid-cols-3">
          {recommendations.map((wine) => (
            <article
              key={wine.id}
              className="group flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-[#d8d0c4] bg-[#fbf8f2] shadow-[0_12px_34px_rgba(31,26,23,0.05)] transition hover:-translate-y-[2px] hover:shadow-[0_20px_50px_rgba(31,26,23,0.08)]"
            >
              <div className="border-b border-[#ebe3d7] bg-[#f2ede4] px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  {wine.country ? <Chip>{wine.country}</Chip> : null}
                  {wine.region ? <Chip>{wine.region}</Chip> : null}
                  {wine.color ? <Chip>{wine.color}</Chip> : null}
                  <ScoreChip>{wine.score}/100</ScoreChip>
                </div>
              </div>

              <div className="flex h-full flex-col justify-between p-5">
                <div>
                  <h3 className="font-serif text-2xl leading-tight text-[#221c18]">
                    {wine.name || "Vin sans nom"}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-[#5d544b]">
                    {wine.producer || "Sélection privée"}
                  </p>

                  <div className="mt-5 space-y-2">
                    {wine.reasons.map((reason) => (
                      <p key={reason} className="text-sm leading-7 text-[#564d45]">
                        • {reason}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-end justify-between gap-4 border-t border-[#ece4d8] pt-5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#7a7165]">
                      Prix
                    </p>
                    <p className="mt-2 font-serif text-2xl text-[#1f2a24]">
                      {formatPrice(wine.price)}
                    </p>
                  </div>

                  <Link
                    href={`/vins/${wine.slug || wine.id}`}
                    className="inline-flex items-center rounded-full border border-[#cfc6b7] bg-white px-5 py-2.5 text-sm font-medium text-[#2a221d] transition hover:bg-[#eee7dc]"
                  >
                    Voir la fiche
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[#ddd4c8]">{label}</span>
      {children}
    </label>
  );
}

function DarkStatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-[rgba(228,213,188,0.14)] bg-[rgba(255,255,255,0.05)] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.24em] text-[#cbbfae]">
        {label}
      </p>
      <p className="mt-2 font-serif text-2xl text-[#f4ede3]">{value}</p>
    </div>
  );
}

function ClubStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#d6cebf] bg-[#f4efe6] p-5 shadow-[0_10px_28px_rgba(31,26,23,0.04)]">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[#7c7368]">
        {label}
      </p>
      <p className="mt-3 font-serif text-3xl leading-none text-[#231d19]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-7 text-[#6c6359]">{hint}</p>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#ddd4c7] bg-[#faf6ef] px-3 py-1 text-[11px] text-[#685f56]">
      {children}
    </span>
  );
}

function ScoreChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#bdcab8] bg-[#edf2ea] px-3 py-1 text-[11px] text-[#2d3a2d]">
      {children}
    </span>
  );
}