"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminAccessPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data?.error || "Impossible de valider le code.");
        setLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Réessaie.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0b09] px-6 text-[#f4ede3]">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.03] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <p className="text-[10px] uppercase tracking-[0.38em] text-[#8f8372]">
          Accès privé
        </p>

        <h1 className="mt-3 font-[var(--font-display)] text-4xl leading-tight text-[#f6efe6]">
          Lex Vinum Premium
        </h1>

        <p className="mt-4 text-sm leading-7 text-[#bcae9b]">
          Entrez votre code administrateur pour accéder à l’intégralité du site
          avant son ouverture publique.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Code d’accès"
            className="w-full rounded-full border border-white/10 bg-[#17120f] px-5 py-3 text-sm text-[#f4ede3] outline-none placeholder:text-[#7d7368] focus:border-[#b79a72]/35"
          />

          {error ? <p className="text-sm text-[#d7a48d]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full border border-[#b79a72]/28 bg-[#1c1611] px-5 py-3 text-xs uppercase tracking-[0.24em] text-[#ead8bc] transition hover:border-[#c9ad86]/40 hover:bg-[#241c16] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Vérification..." : "Entrer"}
          </button>
        </form>
      </div>
    </main>
  );
}