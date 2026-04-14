"use client";

import { useEffect, useState } from "react";

type Wine = {
  id: string;
  name: string;
  producer?: string | null;
};

export default function AdminPage() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/wines");
      const data = await res.json();
      setWines(data);
      setLoading(false);
    }

    load();
  }, []);

  async function saveWine(id: string, name: string) {
    setSavingId(id);
    setMessage("");

    const res = await fetch("/api/admin/update-wine", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id, name }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data.error || "Erreur pendant la sauvegarde");
      setSavingId(null);
      return;
    }

    setWines((prev) =>
      prev.map((wine) => (wine.id === id ? { ...wine, name: data.name } : wine))
    );

    setMessage("Vin mis à jour avec succès.");
    setSavingId(null);
  }

  function updateLocalName(id: string, name: string) {
    setWines((prev) =>
      prev.map((wine) => (wine.id === id ? { ...wine, name } : wine))
    );
  }

  return (
    <main className="min-h-screen bg-[#120d0b] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold">Admin vins</h1>
        <p className="mt-2 text-[#d7c2b5]">
          Modifie les noms directement depuis l’app, sans Prisma Studio.
        </p>

        {message ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            {message}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-8 text-[#d7c2b5]">Chargement...</p>
        ) : (
          <div className="mt-8 space-y-4">
            {wines.map((wine) => (
              <div
                key={wine.id}
                className="rounded-2xl border border-white/10 bg-[#1a120f] p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <input
                    value={wine.name}
                    onChange={(e) => updateLocalName(wine.id, e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                  />

                  <button
                    onClick={() => saveWine(wine.id, wine.name)}
                    disabled={savingId === wine.id}
                    className="rounded-full border border-[#6f4b3b] bg-[#a56a43] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {savingId === wine.id ? "Sauvegarde..." : "Sauvegarder"}
                  </button>
                </div>

                {wine.producer ? (
                  <p className="mt-3 text-sm text-[#d7c2b5]">{wine.producer}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}