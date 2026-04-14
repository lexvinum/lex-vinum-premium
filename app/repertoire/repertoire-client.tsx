"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type WineRecord = {
  id: string;
  slug: string;
  name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  grape: string | null;
  color: string | null;
  style: string | null;
  price: number | null;
  vintage: string | null;
  image: string | null;
  aromas: string[];
  tags: string[];
  description: string | null;
  isQuebec: boolean;
  featured: boolean;
};

const PAGE_SIZE = 8;

function normalizeText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function RepertoireClient({ wines }: { wines: WineRecord[] }) {
  const [search, setSearch] = useState("");
  const [color, setColor] = useState("");
  const [country, setCountry] = useState("");
  const [region, setRegion] = useState("");
  const [grape, setGrape] = useState("");
  const [style, setStyle] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [showOnlyQuebec, setShowOnlyQuebec] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const countries = useMemo(
    () => Array.from(new Set(wines.map((wine) => wine.country).filter(Boolean))) as string[],
    [wines]
  );

  const regions = useMemo(
    () => Array.from(new Set(wines.map((wine) => wine.region).filter(Boolean))) as string[],
    [wines]
  );

  const grapes = useMemo(
    () => Array.from(new Set(wines.map((wine) => wine.grape).filter(Boolean))) as string[],
    [wines]
  );

  const styles = useMemo(
    () => Array.from(new Set(wines.map((wine) => wine.style).filter(Boolean))) as string[],
    [wines]
  );

  const filteredWines = useMemo(() => {
    const q = normalizeText(search);

    let result = wines.filter((wine) => {
      const haystack = normalizeText(
        [
          wine.name,
          wine.producer,
          wine.country,
          wine.region,
          wine.grape,
          wine.style,
          wine.description,
          ...(wine.aromas || []),
          ...(wine.tags || []),
        ]
          .filter(Boolean)
          .join(" ")
      );

      if (q && !haystack.includes(q)) return false;
      if (color && wine.color !== color) return false;
      if (country && wine.country !== country) return false;
      if (region && wine.region !== region) return false;
      if (grape && wine.grape !== grape) return false;
      if (style && wine.style !== style) return false;
      if (showOnlyQuebec && !wine.isQuebec) return false;

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "price-asc") return (a.price || 0) - (b.price || 0);
      if (sortBy === "price-desc") return (b.price || 0) - (a.price || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name, "fr");
      if (sortBy === "quebec") return Number(b.isQuebec) - Number(a.isQuebec);
      if (sortBy === "featured") return Number(b.featured) - Number(a.featured);
      return 0;
    });

    return result;
  }, [wines, search, color, country, region, grape, style, sortBy, showOnlyQuebec]);

  const visibleWines = filteredWines.slice(0, visibleCount);

  function resetFilters() {
    setSearch("");
    setColor("");
    setCountry("");
    setRegion("");
    setGrape("");
    setStyle("");
    setSortBy("featured");
    setShowOnlyQuebec(false);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <main className="page-shell py-10">
      <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Répertoire</p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          Explorer les bouteilles
        </h1>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="glass-card rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm uppercase tracking-[0.25em] text-[var(--muted)]">Filtres</p>
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-[var(--text-soft)] transition hover:text-white"
            >
              Réinitialiser
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <InputField
              label="Recherche"
              value={search}
              onChange={setSearch}
              placeholder="Nom, producteur, cépage, arômes..."
            />

            <SelectField label="Couleur" value={color} onChange={setColor} options={["", "rouge", "blanc", "rosé", "orange"]} />
            <SelectField label="Pays" value={country} onChange={setCountry} options={["", ...countries]} />
            <SelectField label="Région" value={region} onChange={setRegion} options={["", ...regions]} />
            <SelectField label="Cépage" value={grape} onChange={setGrape} options={["", ...grapes]} />
            <SelectField label="Style" value={style} onChange={setStyle} options={["", ...styles]} />
            <SelectField
              label="Tri"
              value={sortBy}
              onChange={setSortBy}
              options={["featured", "name", "price-asc", "price-desc", "quebec"]}
              labels={{
                featured: "Mis en avant",
                name: "Nom",
                "price-asc": "Prix croissant",
                "price-desc": "Prix décroissant",
                quebec: "Québec d’abord",
              }}
            />

            <label className="flex items-center gap-3 rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <input
                type="checkbox"
                checked={showOnlyQuebec}
                onChange={(e) => setShowOnlyQuebec(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-[var(--text-soft)]">Afficher seulement le Québec</span>
            </label>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="glass-card rounded-[28px] p-5">
            <p className="text-sm text-[var(--text-soft)]">
              {filteredWines.length} vin{filteredWines.length > 1 ? "s" : ""} trouvé
              {filteredWines.length > 1 ? "s" : ""}
            </p>
          </div>

          {visibleWines.length === 0 ? (
            <div className="glass-card rounded-[28px] p-8">
              <p className="text-lg font-medium text-white">Aucun vin ne correspond aux filtres.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {visibleWines.map((wine) => (
                <Link
                  key={wine.id}
                  href={`/vins/${wine.slug}`}
                  className="group rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
                >
                  <h2 className="text-xl font-semibold text-white group-hover:text-[#f0d2b0]">
                    {wine.name}
                  </h2>

                  <p className="mt-2 text-sm text-[var(--text-soft)]">
                    {[wine.producer, wine.vintage, wine.region, wine.country].filter(Boolean).join(" • ")}
                  </p>

                  <p className="mt-4 line-clamp-3 text-sm leading-7 text-[var(--text-soft)]">
                    {wine.description}
                  </p>

                  <div className="mt-6 flex items-end justify-between gap-4">
                    <p className="text-2xl font-semibold text-white">
                      {typeof wine.price === "number" ? `${wine.price} $` : "—"}
                    </p>
                    <span className="rounded-full border border-[#6f4b3b] px-4 py-2 text-sm text-[#f0d2b0]">
                      Voir la fiche
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {filteredWines.length > visibleCount && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                className="rounded-full border border-[var(--border-strong)] px-5 py-3 text-sm font-medium text-white transition hover:bg-white hover:text-black"
              >
                Charger plus
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[var(--text-soft)]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white outline-none"
      >
        {options.map((option) => (
          <option key={option || "empty"} value={option} className="bg-[#120d0b]">
            {labels?.[option] || option || "—"}
          </option>
        ))}
      </select>
    </label>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-[var(--text-soft)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white outline-none placeholder:text-[var(--muted)]"
      />
    </label>
  );
}