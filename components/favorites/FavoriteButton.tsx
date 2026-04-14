"use client";

import { useEffect, useMemo, useState } from "react";

type FavoriteButtonProps = {
  slug: string;
  className?: string;
  size?: "sm" | "md" | "lg";
};

const buttonSizes: Record<NonNullable<FavoriteButtonProps["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const iconSizes: Record<NonNullable<FavoriteButtonProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-5 w-5",
};

function HeartIcon({
  className = "",
  filled = false,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 21s-6.716-4.35-9.193-7.5C.94 11.36 2.09 7.5 5.5 7.5c1.91 0 3.13 1.14 3.5 2 .37-.86 1.59-2 3.5-2 3.41 0 4.56 3.86 2.693 6C18.716 16.65 12 21 12 21z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FavoriteButton({
  slug,
  className = "",
  size = "md",
}: FavoriteButtonProps) {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadFavoriteState() {
      try {
        const response = await fetch(
          `/api/favorites?slug=${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const data = (await response.json()) as {
          active?: boolean;
        };

        if (!cancelled) {
          setActive(Boolean(data.active));
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadFavoriteState();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function toggleFavorite() {
    if (pending) return;

    const previous = active;
    setPending(true);
    setActive(!previous);

    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      if (!response.ok) {
        setActive(previous);
        setPending(false);
        return;
      }

      const data = (await response.json()) as {
        active?: boolean;
      };

      setActive(Boolean(data.active));
      setPending(false);
    } catch {
      setActive(previous);
      setPending(false);
    }
  }

  const disabled = useMemo(() => loading || pending, [loading, pending]);

  return (
    <button
      type="button"
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      aria-pressed={active}
      disabled={disabled}
      onClick={toggleFavorite}
      className={[
        "inline-flex items-center justify-center rounded-full border transition-all duration-300",
        "backdrop-blur-md shadow-[0_10px_30px_rgba(17,24,19,0.10)]",
        buttonSizes[size],
        active
          ? "border-emerald-950/20 bg-emerald-950 text-amber-100"
          : "border-black/10 bg-white/78 text-stone-700 hover:border-emerald-950/20 hover:bg-white hover:text-emerald-950",
        disabled ? "opacity-80" : "",
        className,
      ].join(" ")}
    >
      <HeartIcon
        filled={active}
        className={["transition-all duration-300", iconSizes[size]].join(" ")}
      />
    </button>
  );
}