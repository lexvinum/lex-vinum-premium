"use client";

import { useFavorites } from "@/lib/useFavorites";

export default function FavoriteButton({ id }: { id: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();

  const active = isFavorite(id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); // empêche le Link de s’ouvrir
        toggleFavorite(id);
      }}
      className="absolute right-3 top-3 z-10 rounded-full bg-black/40 p-2 backdrop-blur transition hover:scale-105"
    >
      <span
        className={`text-lg ${
          active ? "text-red-500" : "text-white/70"
        }`}
      >
        {active ? "❤️" : "🤍"}
      </span>
    </button>
  );
}