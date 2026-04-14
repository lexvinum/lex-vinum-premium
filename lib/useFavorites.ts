"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "lexvinum_favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  function toggleFavorite(id: string) {
    let updated: string[];

    if (favorites.includes(id)) {
      updated = favorites.filter((f) => f !== id);
    } else {
      updated = [...favorites, id];
    }

    setFavorites(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function isFavorite(id: string) {
    return favorites.includes(id);
  }

  return {
    favorites,
    toggleFavorite,
    isFavorite,
  };
}