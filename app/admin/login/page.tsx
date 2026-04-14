"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Connexion impossible");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#120d0b] px-6 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#1a120f] p-8">
        <h1 className="text-2xl font-semibold">Connexion admin</h1>
        <p className="mt-2 text-sm text-[#d7c2b5]">
          Accès réservé à l’administration Lex Vinum.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
          />

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full border border-[#6f4b3b] bg-[#a56a43] px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Entrer"}
          </button>
        </form>
      </div>
    </main>
  );
}