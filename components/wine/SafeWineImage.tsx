"use client";

import { useEffect, useMemo, useState } from "react";

type SafeWineImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imageClassName?: string;
  bottleMode?: boolean;
};

function hasRealImageUrl(value?: string | null) {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  return /^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed);
}

export default function SafeWineImage({
  src,
  alt,
  className = "",
  imageClassName = "",
  bottleMode = false,
}: SafeWineImageProps) {
  const normalizedSrc = useMemo(() => {
    return hasRealImageUrl(src) ? src!.trim() : null;
  }, [src]);

  const [currentSrc, setCurrentSrc] = useState<string | null>(normalizedSrc);
  const [loaded, setLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
    setLoaded(false);
    setHasFailed(false);
  }, [normalizedSrc]);

  const showPlaceholder = !currentSrc || hasFailed;

  return (
    <div
      className={`relative overflow-hidden bg-[#ece5d8] ${className}`}
      aria-busy={!loaded && !showPlaceholder}
    >
      {!showPlaceholder && !loaded ? (
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgba(255,255,255,0.10),rgba(255,255,255,0.32),rgba(255,255,255,0.10))]" />
      ) : null}

      {showPlaceholder ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[linear-gradient(180deg,#f4eee4_0%,#ece3d4_100%)] px-6 text-center">
          <div className="mb-4 rounded-full border border-[#d8cbb8] bg-white/50 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#8a7761]">
            Image indisponible
          </div>

          <div className="max-w-[220px]">
            <p className="line-clamp-3 font-serif text-2xl leading-tight text-[#3f352c]">
              {alt}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#7a6c5c]">
              Visuel produit non disponible pour le moment.
            </p>
          </div>
        </div>
      ) : (
        <img
          src={currentSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            setHasFailed(true);
            setLoaded(true);
            setCurrentSrc(null);
          }}
          className={`h-full w-full transition duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${
            bottleMode
              ? "object-contain bg-[#f4eee4] p-7"
              : "object-contain bg-[#f4eee4] p-6"
          } ${imageClassName}`}
        />
      )}
    </div>
  );
}