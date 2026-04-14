"use client";

import { useMemo, useState } from "react";

type Wine = {
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
  description: string | null;
  aromas: string[];
  tags: string[];
  isQuebec: boolean;
};

type CellarItem = {
  id: string;
  wineId: string;
  quantity: number;
  purchasePrice: number | null;
  purchaseDate: string | Date | null;
  location: string | null;
  drinkingWindow: string | null;
  personalNote: string | null;
  rating: number | null;
  wine: Wine;
};

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("fr-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function MaCaveClient({
  initialItems,
  wines,
}: {
  initialItems: CellarItem[];
  wines: Wine[];
}) {
  const [items, setItems] = useState<CellarItem[]>(initialItems);
  const [form, setForm] = useState({
    wineId: "",
    quantity: "1",
    purchasePrice: "",
    purchaseDate: "",
    location: "",
    drinkingWindow: "",
    personalNote: "",
    rating: "",
  });
  const [saving, setSaving] = useState(false);

  const stats = useMemo(() => {
    const totalBottles = items.reduce((sum, item) => sum + item.quantity, 0);
    return { totalBottles, totalRefs: items.length };
  }, [items]);

  async function addBottle() {
    if (!form.wineId) return;

    setSaving(true);

    try {
      const res = await fetch("/api/cellar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wineId: form.wineId,
          quantity: Number(form.quantity || 1),
          purchasePrice: form.purchasePrice,
          purchaseDate: form.purchaseDate,
          location: form.location,
          drinkingWindow: form.drinkingWindow,
          personalNote: form.personalNote,
          rating: form.rating,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data?.error || "Erreur ajout cave");
      }

      setItems((prev) => [data.item, ...prev]);
      setForm({
        wineId: "",
        quantity: "1",
        purchasePrice: "",
        purchaseDate: "",
        location: "",
        drinkingWindow: "",
        personalNote: "",
        rating: "",
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/cellar/${id}`, {
      method: "DELETE",
    });

    const data = await res.json();

    if (!res.ok || !data.success) return;

    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  async function changeQuantity(id: string, quantity: number) {
    const res = await fetch(`/api/cellar/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) return;

    setItems((prev) => prev.map((item) => (item.id === id ? data.item : item)));
  }

  return (
    <main className="page-shell py-10">
      <section className="rounded-[32px] border border-[var(--border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-8 md:p-10">
        <p className="text-sm uppercase tracking-[0.32em] text-[var(--muted)]">Ma cave</p>
        <h1 className="mt-3 text-4xl font-semibold text-white md:text-5xl">
          Cave interactive
        </h1>
        <p className="mt-4 text-[var(--text-soft)]">
          {stats.totalRefs} références • {stats.totalBottles} bouteilles
        </p>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="glass-card rounded-[28px] p-5">
          <p className="text-sm uppercase tracking-[0.25em] text-[var(--muted)]">
            Ajouter une bouteille
          </p>

          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-[var(--text-soft)]">Vin</span>
              <select
                value={form.wineId}
                onChange={(e) => setForm((prev) => ({ ...prev, wineId: e.target.value }))}
                className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white outline-none"
              >
                <option value="">—</option>
                {wines.map((wine) => (
                  <option key={wine.id} value={wine.id}>
                    {wine.name}
                  </option>
                ))}
              </select>
            </label>

            <input
              value={form.quantity}
              onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
              placeholder="Quantité"
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            />

            <input
              value={form.purchasePrice}
              onChange={(e) => setForm((prev) => ({ ...prev, purchasePrice: e.target.value }))}
              placeholder="Prix d’achat"
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            />

            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm((prev) => ({ ...prev, purchaseDate: e.target.value }))}
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            />

            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder="Emplacement"
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            />

            <select
              value={form.drinkingWindow}
              onChange={(e) => setForm((prev) => ({ ...prev, drinkingWindow: e.target.value }))}
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            >
              <option value="">Moment idéal</option>
              <option value="à boire maintenant">à boire maintenant</option>
              <option value="apogée">apogée</option>
              <option value="à garder">à garder</option>
            </select>

            <textarea
              value={form.personalNote}
              onChange={(e) => setForm((prev) => ({ ...prev, personalNote: e.target.value }))}
              placeholder="Note perso"
              className="min-h-[120px] w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            />

            <input
              value={form.rating}
              onChange={(e) => setForm((prev) => ({ ...prev, rating: e.target.value }))}
              placeholder="Note /100"
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-white"
            />

            <button
              type="button"
              onClick={addBottle}
              disabled={saving || !form.wineId}
              className="w-full rounded-full border border-[var(--border-strong)] bg-white px-5 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Ajout..." : "Ajouter à ma cave"}
            </button>
          </div>
        </aside>

        <div className="space-y-4">
          {items.length === 0 ? (
            <div className="glass-card rounded-[28px] p-8">
              <p className="text-white">Aucune bouteille pour l’instant.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="glass-card rounded-[28px] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">{item.wine.name}</h2>
                    <p className="mt-2 text-sm text-[var(--text-soft)]">
                      {[item.wine.producer, item.wine.region, item.wine.country].filter(Boolean).join(" • ")}
                    </p>
                    {item.personalNote && (
                      <p className="mt-4 text-sm leading-7 text-[var(--text-soft)]">
                        {item.personalNote}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:w-[340px]">
                    <MetricCard label="Quantité" value={String(item.quantity)} />
                    <MetricCard
                      label="Prix"
                      value={item.purchasePrice ? `${item.purchasePrice} $` : "—"}
                    />
                    <MetricCard label="Date" value={formatDate(item.purchaseDate)} />
                    <MetricCard label="Emplacement" value={item.location || "—"} />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => changeQuantity(item.id, Math.max(1, item.quantity - 1))}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-white"
                  >
                    -1
                  </button>

                  <button
                    type="button"
                    onClick={() => changeQuantity(item.id, item.quantity + 1)}
                    className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-white"
                  >
                    +1
                  </button>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-200"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}