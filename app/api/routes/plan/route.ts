import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MapMode = "quebec" | "world";

type MapPoint = {
  id: string;
  slug: string | null;
  type: "vineyard" | "wine";
  name: string;
  subtitle: string | null;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  image: string | null;
  website: string | null;
  isQuebec: boolean;
  tastingOffered: boolean;
  lodgingOffered: boolean;
  restaurantOnSite: boolean;
};

type VineyardRow = {
  id: string;
  slug: string | null;
  name: string;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  website: string | null;
  isQuebec: boolean | null;
  tastingOffered: boolean | null;
  lodgingOffered: boolean | null;
  restaurantOnSite: boolean | null;
};

type VineyardRowWithCoords = VineyardRow & {
  latitude: number;
  longitude: number;
};

type WineRow = {
  id: string;
  slug: string | null;
  name: string;
  producer: string | null;
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  image: string | null;
  isQuebec: boolean | null;
  dataSource?: string | null;
};

function getMode(searchParams: URLSearchParams): MapMode {
  const mode = searchParams.get("mode");
  return mode === "world" ? "world" : "quebec";
}

function hasRealImage(image: string | null | undefined): boolean {
  if (!image) return false;

  const value = image.trim().toLowerCase();

  if (!value) return false;
  if (value.includes("placeholder")) return false;
  if (value.includes("logo")) return false;

  return true;
}

function normalizeValue(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isNumericCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasCoordinates(v: VineyardRow): v is VineyardRowWithCoords {
  return isNumericCoordinate(v.latitude) && isNumericCoordinate(v.longitude);
}

function isQuebecPlace(
  country: string | null | undefined,
  region: string | null | undefined,
  province: string | null | undefined,
  city: string | null | undefined
): boolean {
  const values = [
    normalizeValue(country),
    normalizeValue(region),
    normalizeValue(province),
    normalizeValue(city),
  ];

  return values.some(
    (value) =>
      value === "quebec" ||
      value.includes("quebec") ||
      value === "monteregie" ||
      value === "estrie" ||
      value === "lanaudiere" ||
      value === "laurentides" ||
      value === "cantons de l est" ||
      value === "eastern townships" ||
      value === "ile d orleans"
  );
}

function isNonQuebecWine(
  country: string | null | undefined,
  region: string | null | undefined,
  isQuebec: boolean | null | undefined
): boolean {
  if (Boolean(isQuebec)) return false;
  return !isQuebecPlace(country, region, null, null);
}

function getRegionFallback(
  country: string | null | undefined,
  region: string | null | undefined
): { lat: number; lng: number } {
  const normalizedCountry = normalizeValue(country);
  const normalizedRegion = normalizeValue(region);

  const regionMap: Record<string, { lat: number; lng: number }> = {
    bordeaux: { lat: 44.8378, lng: -0.5792 },
    bourgogne: { lat: 47.0525, lng: 4.3837 },
    burgundy: { lat: 47.0525, lng: 4.3837 },
    champagne: { lat: 49.0536, lng: 3.959 },
    alsace: { lat: 48.3182, lng: 7.4416 },
    loire: { lat: 47.3833, lng: 0.6833 },
    "vallee du rhone": { lat: 44.0, lng: 4.8 },
    rhone: { lat: 44.0, lng: 4.8 },
    provence: { lat: 43.9352, lng: 6.0679 },
    languedoc: { lat: 43.5912, lng: 3.2584 },
    beaujolais: { lat: 46.1872, lng: 4.6396 },

    toscane: { lat: 43.7711, lng: 11.2486 },
    toscana: { lat: 43.7711, lng: 11.2486 },
    piemonte: { lat: 45.0703, lng: 7.6869 },
    piedmont: { lat: 45.0703, lng: 7.6869 },
    veneto: { lat: 45.4408, lng: 12.3155 },
    sicile: { lat: 37.5999, lng: 14.0154 },
    sicilia: { lat: 37.5999, lng: 14.0154 },
    puglia: { lat: 41.1256, lng: 16.8667 },

    rioja: { lat: 42.4627, lng: -2.4449 },
    "ribera del duero": { lat: 41.6406, lng: -3.6892 },
    priorat: { lat: 41.15, lng: 0.85 },
    penedes: { lat: 41.3462, lng: 1.6999 },
    rueda: { lat: 41.4125, lng: -4.9608 },

    douro: { lat: 41.16, lng: -7.79 },
    alentejo: { lat: 38.5667, lng: -7.9 },
    dao: { lat: 40.7167, lng: -7.9167 },

    california: { lat: 36.7783, lng: -119.4179 },
    "napa valley": { lat: 38.5025, lng: -122.2654 },
    sonoma: { lat: 38.2919, lng: -122.458 },
    oregon: { lat: 43.8041, lng: -120.5542 },
    washington: { lat: 47.7511, lng: -120.7401 },

    mendoza: { lat: -32.8895, lng: -68.8458 },
    maipo: { lat: -33.65, lng: -70.75 },
    colchagua: { lat: -34.6389, lng: -71.3592 },

    barossa: { lat: -34.5333, lng: 138.95 },
    "margaret river": { lat: -33.9536, lng: 115.0739 },
    marlborough: { lat: -41.5134, lng: 173.9612 },
    stellenbosch: { lat: -33.9321, lng: 18.8602 },
  };

  const countryMap: Record<string, { lat: number; lng: number }> = {
    france: { lat: 46.2276, lng: 2.2137 },
    italie: { lat: 41.8719, lng: 12.5674 },
    italy: { lat: 41.8719, lng: 12.5674 },
    espagne: { lat: 40.4637, lng: -3.7492 },
    spain: { lat: 40.4637, lng: -3.7492 },
    portugal: { lat: 39.3999, lng: -8.2245 },
    "etats unis": { lat: 37.0902, lng: -95.7129 },
    usa: { lat: 37.0902, lng: -95.7129 },
    "united states": { lat: 37.0902, lng: -95.7129 },
    argentine: { lat: -38.4161, lng: -63.6167 },
    argentina: { lat: -38.4161, lng: -63.6167 },
    chili: { lat: -35.6751, lng: -71.543 },
    chile: { lat: -35.6751, lng: -71.543 },
    australie: { lat: -25.2744, lng: 133.7751 },
    australia: { lat: -25.2744, lng: 133.7751 },
    "nouvelle zelande": { lat: -40.9006, lng: 174.886 },
    "new zealand": { lat: -40.9006, lng: 174.886 },
    "afrique du sud": { lat: -30.5595, lng: 22.9375 },
    "south africa": { lat: -30.5595, lng: 22.9375 },
    allemagne: { lat: 51.1657, lng: 10.4515 },
    germany: { lat: 51.1657, lng: 10.4515 },
    autriche: { lat: 47.5162, lng: 14.5501 },
    austria: { lat: 47.5162, lng: 14.5501 },
    canada: { lat: 56.1304, lng: -106.3468 },
  };

  if (normalizedRegion && regionMap[normalizedRegion]) {
    return regionMap[normalizedRegion];
  }

  if (normalizedCountry && countryMap[normalizedCountry]) {
    return countryMap[normalizedCountry];
  }

  return { lat: 20, lng: 0 };
}

function hasWorldOrigin(
  country: string | null | undefined,
  region: string | null | undefined,
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  if (isNumericCoordinate(latitude) && isNumericCoordinate(longitude)) {
    return true;
  }

  const normalizedCountry = normalizeValue(country);
  const normalizedRegion = normalizeValue(region);

  return Boolean(normalizedCountry || normalizedRegion);
}

function sortPoints(points: MapPoint[]): MapPoint[] {
  return [...points].sort((a, b) => {
    const aImage = hasRealImage(a.image) ? 1 : 0;
    const bImage = hasRealImage(b.image) ? 1 : 0;

    if (bImage !== aImage) return bImage - aImage;

    const regionCompare = (a.region ?? "").localeCompare(b.region ?? "", "fr", {
      sensitivity: "base",
    });

    if (regionCompare !== 0) return regionCompare;

    return a.name.localeCompare(b.name, "fr", { sensitivity: "base" });
  });
}

export async function GET(request: NextRequest) {
  try {
    const mode = getMode(request.nextUrl.searchParams);

    if (mode === "quebec") {
      const vineyards = await prisma.vineyard.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          isQuebec: true,
        },
        orderBy: [{ name: "asc" }],
        take: 2000,
        select: {
          id: true,
          slug: true,
          name: true,
          country: true,
          region: true,
          province: true,
          city: true,
          latitude: true,
          longitude: true,
          image: true,
          website: true,
          isQuebec: true,
          tastingOffered: true,
          lodgingOffered: true,
          restaurantOnSite: true,
        },
      });

      const points: MapPoint[] = (vineyards as VineyardRow[])
        .filter(hasCoordinates)
        .map((v) => ({
          id: v.id,
          slug: v.slug ?? null,
          type: "vineyard",
          name: v.name,
          subtitle: null,
          country: v.country ?? null,
          region: v.region ?? null,
          province: v.province ?? null,
          city: v.city ?? null,
          latitude: v.latitude,
          longitude: v.longitude,
          image: v.image ?? null,
          website: v.website ?? null,
          isQuebec: true,
          tastingOffered: Boolean(v.tastingOffered),
          lodgingOffered: Boolean(v.lodgingOffered),
          restaurantOnSite: Boolean(v.restaurantOnSite),
        }));

      const sorted = sortPoints(points);

      return NextResponse.json({
        ok: true,
        mode,
        count: sorted.length,
        vineyardsCount: sorted.length,
        winesCount: 0,
        points: sorted,
      });
    }

    const wines = await prisma.wine.findMany({
      where: {
        OR: [{ dataSource: "SAQ" }, { saqUrl: { not: null } }],
      },
      orderBy: [{ name: "asc" }],
      take: 10000,
      select: {
        id: true,
        slug: true,
        name: true,
        producer: true,
        country: true,
        region: true,
        latitude: true,
        longitude: true,
        image: true,
        isQuebec: true,
        dataSource: true,
      },
    });

    const points: MapPoint[] = (wines as WineRow[])
      .filter((w) => isNonQuebecWine(w.country, w.region, w.isQuebec))
      .filter((w) =>
        hasWorldOrigin(w.country, w.region, w.latitude, w.longitude)
      )
      .map((w) => {
        const coords =
          isNumericCoordinate(w.latitude) && isNumericCoordinate(w.longitude)
            ? { lat: w.latitude, lng: w.longitude }
            : getRegionFallback(w.country, w.region);

        return {
          id: w.id,
          slug: w.slug ?? null,
          type: "wine",
          name: w.name,
          subtitle: w.producer ?? null,
          country: w.country ?? null,
          region: w.region ?? null,
          province: null,
          city: null,
          latitude: coords.lat,
          longitude: coords.lng,
          image: w.image ?? null,
          website: null,
          isQuebec: false,
          tastingOffered: false,
          lodgingOffered: false,
          restaurantOnSite: false,
        };
      });

    const sorted = sortPoints(points);

    return NextResponse.json({
      ok: true,
      mode,
      count: sorted.length,
      vineyardsCount: 0,
      winesCount: sorted.length,
      points: sorted,
    });
  } catch (error) {
    console.error("GET /api/map/points failed:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Impossible de charger les points de la carte.",
      },
      { status: 500 }
    );
  }
}