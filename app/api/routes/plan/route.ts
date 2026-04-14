import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeOptimizedDrivingRoute } from "@/lib/google-routes";

type Budget = "petit" | "moyen" | "premium";
type Pace = "detente" | "equilibre" | "intensif";
type MapMode = "quebec" | "world";

type NewRouteRequest = {
  start?: {
    id?: string;
    lat?: number;
    lng?: number;
    name?: string;
  };
  preferences?: {
    days?: number;
    budget?: Budget;
    styles?: string[];
    pace?: Pace;
    regionMode?: MapMode;
  };
};

type LegacyTripStyle = "luxe" | "nature" | "gastronomie" | "decouverte";

type LegacyRouteRequest = {
  region?: string;
  days?: number;
  startCity?: string;
  maxStopsPerDay?: number;
  tripStyle?: LegacyTripStyle;
  lodgingRequired?: boolean;
  restaurantPreferred?: boolean;
  tastingRequired?: boolean;
};

type UnifiedRequest = {
  start: {
    id?: string;
    lat: number | null;
    lng: number | null;
    name: string;
  };
  preferences: {
    days: number;
    budget: Budget;
    styles: string[];
    pace: Pace;
    regionMode: MapMode;
  };
};

type VineyardLite = {
  id: string;
  slug: string;
  name: string;
  region: string | null;
  city: string | null;
  province: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  image: string | null;
  isQuebec: boolean;
  tastingOffered: boolean;
  lodgingOffered: boolean;
  restaurantOnSite: boolean;
  description?: string | null;
};

type RankedVineyard = VineyardLite & {
  distanceKm: number;
  styleScore: number;
  distanceScore: number;
  budgetScore: number;
  experienceScore: number;
  finalScore: number;
};

type PlannedStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "vineyard";
  region?: string | null;
  country?: string | null;
  city?: string | null;
  image?: string | null;
  description?: string | null;
  score?: number | null;
};

type PlannedRoute = {
  title: string;
  subtitle: string;
  summary: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  estimatedBudgetLabel: Budget;
  encodedPolyline?: string;
  polyline?: string;
  path?: Array<{ lat: number; lng: number }>;
  stops: PlannedStop[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeBudget(value: unknown): Budget {
  if (value === "petit" || value === "moyen" || value === "premium") {
    return value;
  }
  return "moyen";
}

function normalizePace(value: unknown): Pace {
  if (value === "detente" || value === "equilibre" || value === "intensif") {
    return value;
  }
  return "equilibre";
}

function normalizeRegionMode(value: unknown): MapMode {
  if (value === "quebec" || value === "world") {
    return value;
  }
  return "quebec";
}

function mapLegacyTripStyleToBudget(style?: LegacyTripStyle): Budget {
  if (style === "luxe") return "premium";
  if (style === "gastronomie") return "premium";
  return "moyen";
}

function mapLegacyTripStyleToStyles(style?: LegacyTripStyle): string[] {
  switch (style) {
    case "nature":
      return ["Nature"];
    case "gastronomie":
      return ["Premium"];
    case "luxe":
      return ["Premium"];
    case "decouverte":
    default:
      return [];
  }
}

function mapLegacyRequest(body: LegacyRouteRequest): UnifiedRequest {
  return {
    start: {
      lat: null,
      lng: null,
      name: body.startCity || "Montréal",
    },
    preferences: {
      days: clamp(Math.round(body.days || 2), 1, 7),
      budget: mapLegacyTripStyleToBudget(body.tripStyle),
      styles: mapLegacyTripStyleToStyles(body.tripStyle),
      pace: "equilibre",
      regionMode: "quebec",
    },
  };
}

function mapNewRequest(body: NewRouteRequest): UnifiedRequest {
  return {
    start: {
      id: body.start?.id,
      lat:
        typeof body.start?.lat === "number" && Number.isFinite(body.start.lat)
          ? body.start.lat
          : null,
      lng:
        typeof body.start?.lng === "number" && Number.isFinite(body.start.lng)
          ? body.start.lng
          : null,
      name: body.start?.name || "Point de départ",
    },
    preferences: {
      days: clamp(Math.round(body.preferences?.days || 2), 1, 7),
      budget: normalizeBudget(body.preferences?.budget),
      styles: Array.isArray(body.preferences?.styles)
        ? body.preferences.styles.filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0
          )
        : [],
      pace: normalizePace(body.preferences?.pace),
      regionMode: normalizeRegionMode(body.preferences?.regionMode),
    },
  };
}

function isNewRequest(body: unknown): body is NewRouteRequest {
  if (!body || typeof body !== "object") return false;
  return "start" in body || "preferences" in body;
}

function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateComfortDistanceKm(days: number, pace: Pace) {
  const dayBase =
    pace === "detente" ? 120 : pace === "equilibre" ? 180 : 260;

  return Math.max(dayBase, dayBase * days);
}

function computeDistanceScore(distanceKm: number, days: number, pace: Pace) {
  const comfort = estimateComfortDistanceKm(days, pace);

  if (distanceKm <= comfort * 0.35) return 100;
  if (distanceKm <= comfort * 0.6) return 88;
  if (distanceKm <= comfort) return 72;
  if (distanceKm <= comfort * 1.2) return 50;
  if (distanceKm <= comfort * 1.5) return 30;
  return 12;
}

function computeBudgetScore(vineyard: VineyardLite, budget: Budget) {
  let inferredLevel = 40;

  if (vineyard.lodgingOffered) inferredLevel += 20;
  if (vineyard.restaurantOnSite) inferredLevel += 18;
  if (vineyard.tastingOffered) inferredLevel += 10;
  if (vineyard.image) inferredLevel += 4;

  if (budget === "petit") {
    if (inferredLevel <= 48) return 100;
    if (inferredLevel <= 62) return 78;
    return 42;
  }

  if (budget === "moyen") {
    if (inferredLevel >= 45 && inferredLevel <= 75) return 100;
    if (inferredLevel <= 85) return 80;
    return 58;
  }

  if (inferredLevel >= 75) return 100;
  if (inferredLevel >= 60) return 80;
  return 52;
}

function computeExperienceScore(vineyard: VineyardLite) {
  let score = 45;

  if (vineyard.image) score += 10;
  if (vineyard.website) score += 8;
  if (vineyard.description) score += 8;
  if (vineyard.tastingOffered) score += 8;
  if (vineyard.restaurantOnSite) score += 8;
  if (vineyard.lodgingOffered) score += 10;

  return clamp(score);
}

function computeStyleScore(vineyard: VineyardLite, selectedStyles: string[]) {
  if (!selectedStyles.length) return 60;

  const haystack = normalizeText(
    [vineyard.name, vineyard.region, vineyard.city, vineyard.description]
      .filter(Boolean)
      .join(" ")
  );

  const normalizedStyles = selectedStyles.map(normalizeText);
  let matches = 0;

  for (const style of normalizedStyles) {
    if (!style) continue;

    if (style.includes("premium") || style.includes("luxe")) {
      if (vineyard.lodgingOffered || vineyard.restaurantOnSite) {
        matches += 1;
        continue;
      }
    }

    if (style.includes("nature") || style.includes("biodynam")) {
      if (
        haystack.includes("nature") ||
        haystack.includes("bio") ||
        haystack.includes("biodynam")
      ) {
        matches += 1;
        continue;
      }
    }

    if (
      style.includes("bulles") ||
      style.includes("mousseux") ||
      style.includes("sparkling")
    ) {
      if (
        haystack.includes("bull") ||
        haystack.includes("mousseux") ||
        haystack.includes("effervescent")
      ) {
        matches += 1;
        continue;
      }
    }

    if (
      style.includes("orange") ||
      style.includes("rose") ||
      style.includes("blanc") ||
      style.includes("rouge")
    ) {
      if (haystack.includes(style)) {
        matches += 1;
        continue;
      }
    }

    if (haystack.includes(style)) {
      matches += 1;
    }
  }

  if (matches === 0) return 55;

  return clamp(Math.round((matches / normalizedStyles.length) * 100));
}

function decodeGooglePolyline(
  encoded: string
): Array<{ lat: number; lng: number }> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<{ lat: number; lng: number }> = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({
      lat: lat / 1e5,
      lng: lng / 1e5,
    });
  }

  return coordinates;
}

function extractPolyline(routeData: any): string | undefined {
  return (
    routeData?.polyline?.encodedPolyline ||
    routeData?.overviewPolyline ||
    routeData?.encodedPolyline ||
    routeData?.polyline
  );
}

function extractDistanceKm(routeData: any, fallbackStops: RankedVineyard[]) {
  const meters =
    routeData?.distanceMeters ??
    routeData?.localizedValues?.distance?.meters ??
    null;

  if (typeof meters === "number" && Number.isFinite(meters)) {
    return round(meters / 1000, 1);
  }

  let total = 0;
  for (let i = 1; i < fallbackStops.length; i += 1) {
    const prev = fallbackStops[i - 1];
    const curr = fallbackStops[i];

    total += haversineDistanceKm(
      prev.latitude!,
      prev.longitude!,
      curr.latitude!,
      curr.longitude!
    );
  }

  return round(total, 1);
}

function extractDurationMinutes(routeData: any, stopCount: number) {
  const durationValue =
    routeData?.duration ||
    routeData?.staticDuration ||
    routeData?.localizedValues?.duration?.text ||
    null;

  if (typeof durationValue === "string") {
    const match = durationValue.match(/(\d+(?:\.\d+)?)s$/);
    if (match) {
      return Math.round(Number(match[1]) / 60);
    }
  }

  if (typeof routeData?.durationSeconds === "number") {
    return Math.round(routeData.durationSeconds / 60);
  }

  return Math.max(40, stopCount * 45);
}

function buildFallbackPath(stops: RankedVineyard[]) {
  return stops.map((stop) => ({
    lat: stop.latitude!,
    lng: stop.longitude!,
  }));
}

function buildRouteTitle(day: number, totalDays: number, budget: Budget) {
  const budgetLabel =
    budget === "petit"
      ? "accessible"
      : budget === "premium"
        ? "premium"
        : "signature";

  if (totalDays === 1) {
    return `Escapade ${budgetLabel} Lex Vinum`;
  }

  return `Jour ${day} · Parcours ${budgetLabel}`;
}

function buildRouteSubtitle(stops: RankedVineyard[], days: number, pace: Pace) {
  const regions = Array.from(
    new Set(stops.map((stop) => stop.region).filter(Boolean))
  ) as string[];

  const paceLabel =
    pace === "detente"
      ? "rythme détente"
      : pace === "intensif"
        ? "rythme intensif"
        : "rythme équilibré";

  return `${days} jour${days > 1 ? "s" : ""} · ${paceLabel}${
    regions.length ? ` · ${regions.join(" · ")}` : ""
  }`;
}

function buildRouteSummary(stops: RankedVineyard[]) {
  if (!stops.length) {
    return "Parcours généré selon tes préférences.";
  }

  const top = stops[0];
  const restaurantCount = stops.filter((s) => s.restaurantOnSite).length;
  const tastingCount = stops.filter((s) => s.tastingOffered).length;
  const lodgingCount = stops.filter((s) => s.lodgingOffered).length;

  const pieces = [
    `${stops.length} arrêt${stops.length > 1 ? "s" : ""} sélectionné${stops.length > 1 ? "s" : ""}`,
    tastingCount > 0
      ? `${tastingCount} dégustation${tastingCount > 1 ? "s" : ""}`
      : null,
    restaurantCount > 0
      ? `${restaurantCount} option${restaurantCount > 1 ? "s" : ""} gastronomique${restaurantCount > 1 ? "s" : ""}`
      : null,
    lodgingCount > 0
      ? `${lodgingCount} halte${lodgingCount > 1 ? "s" : ""} avec hébergement`
      : null,
  ].filter(Boolean);

  return `Itinéraire optimisé autour de ${top.name}, avec ${pieces.join(", ")}.`;
}

function rankVineyard(
  vineyard: VineyardLite,
  request: UnifiedRequest
): RankedVineyard | null {
  if (vineyard.latitude == null || vineyard.longitude == null) return null;
  if (request.start.lat == null || request.start.lng == null) return null;
  if (request.start.id && vineyard.id === request.start.id) return null;

  const distanceKm = haversineDistanceKm(
    request.start.lat,
    request.start.lng,
    vineyard.latitude,
    vineyard.longitude
  );

  const styleScore = computeStyleScore(vineyard, request.preferences.styles);
  const distanceScore = computeDistanceScore(
    distanceKm,
    request.preferences.days,
    request.preferences.pace
  );
  const budgetScore = computeBudgetScore(vineyard, request.preferences.budget);
  const experienceScore = computeExperienceScore(vineyard);

  const finalScore =
    styleScore * 0.35 +
    distanceScore * 0.25 +
    budgetScore * 0.2 +
    experienceScore * 0.2;

  return {
    ...vineyard,
    distanceKm: round(distanceKm, 1),
    styleScore,
    distanceScore,
    budgetScore,
    experienceScore,
    finalScore: round(finalScore, 1),
  };
}

function getStopsPerDay(days: number, pace: Pace) {
  if (days <= 1) {
    if (pace === "detente") return 2;
    if (pace === "intensif") return 4;
    return 3;
  }

  if (pace === "detente") return 2;
  if (pace === "intensif") return 4;
  return 3;
}

function buildPlannedStops(stops: RankedVineyard[]): PlannedStop[] {
  return stops.map((stop) => ({
    id: stop.id,
    name: stop.name,
    latitude: stop.latitude!,
    longitude: stop.longitude!,
    type: "vineyard",
    region: stop.region,
    country: stop.isQuebec ? "Canada" : null,
    city: stop.city,
    image: stop.image,
    description:
      stop.description ||
      `Score global ${stop.finalScore}/100 · style ${stop.styleScore}/100 · distance ${stop.distanceScore}/100 · budget ${stop.budgetScore}/100.`,
    score: stop.finalScore,
  }));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const request: UnifiedRequest = isNewRequest(body)
      ? mapNewRequest(body as NewRouteRequest)
      : mapLegacyRequest(body as LegacyRouteRequest);

    if (request.start.lat == null || request.start.lng == null) {
      return NextResponse.json(
        {
          success: false,
          error: "Le point de départ est requis pour planifier l’itinéraire.",
        },
        { status: 400 }
      );
    }

    const days = request.preferences.days;
    const stopsPerDay = getStopsPerDay(days, request.preferences.pace);
    const totalStopsWanted = Math.max(2, days * stopsPerDay);

    const vineyards = await prisma.vineyard.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
        ...(request.preferences.regionMode === "quebec"
          ? { isQuebec: true }
          : {}),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        region: true,
        city: true,
        province: true,
        latitude: true,
        longitude: true,
        website: true,
        image: true,
        isQuebec: true,
        tastingOffered: true,
        lodgingOffered: true,
        restaurantOnSite: true,
        description: true,
      },
      orderBy: [{ name: "asc" }],
    });

    const ranked = vineyards
      .map((vineyard: VineyardLite) => rankVineyard(vineyard, request))
      .filter((item): item is RankedVineyard => Boolean(item))
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, totalStopsWanted);

    if (!ranked.length) {
      return NextResponse.json({
        success: true,
        routes: [],
        summary: {
          vineyardCountConsidered: vineyards.length,
          selectedStops: 0,
        },
      });
    }

    const routes: PlannedRoute[] = [];

    for (let dayIndex = 0; dayIndex < days; dayIndex += 1) {
      const startIndex = dayIndex * stopsPerDay;
      const endIndex = startIndex + stopsPerDay;
      const dayStops = ranked.slice(startIndex, endIndex);

      if (!dayStops.length) continue;

      const originPoint =
        dayIndex === 0
          ? {
              label: request.start.name,
              latitude: request.start.lat!,
              longitude: request.start.lng!,
            }
          : {
              label: dayStops[0].city || dayStops[0].name,
              latitude: dayStops[0].latitude!,
              longitude: dayStops[0].longitude!,
            };

      const destinationPoint = {
        label:
          dayStops[dayStops.length - 1].city ||
          dayStops[dayStops.length - 1].name,
        latitude: dayStops[dayStops.length - 1].latitude!,
        longitude: dayStops[dayStops.length - 1].longitude!,
      };

      const intermediates = dayStops.slice(0, -1).map((stop) => ({
        label: stop.name,
        latitude: stop.latitude!,
        longitude: stop.longitude!,
      }));

      let routeData: any = null;

      try {
        routeData = await computeOptimizedDrivingRoute({
          origin: originPoint,
          destination: destinationPoint,
          intermediates,
        });
      } catch (error) {
        console.error(`ROUTES API DAY ${dayIndex + 1} ERROR`, error);
      }

      const googleRoute = routeData?.routes?.[0] ?? routeData ?? null;
      const encodedPolyline = extractPolyline(googleRoute);
      const decodedPath = encodedPolyline
        ? decodeGooglePolyline(encodedPolyline)
        : buildFallbackPath(dayStops);

      routes.push({
        title: buildRouteTitle(dayIndex + 1, days, request.preferences.budget),
        subtitle: buildRouteSubtitle(
          dayStops,
          request.preferences.days,
          request.preferences.pace
        ),
        summary: buildRouteSummary(dayStops),
        totalDistanceKm: extractDistanceKm(googleRoute, dayStops),
        totalDurationMinutes: extractDurationMinutes(
          googleRoute,
          dayStops.length
        ),
        estimatedBudgetLabel: request.preferences.budget,
        encodedPolyline,
        polyline: encodedPolyline,
        path: decodedPath,
        stops: buildPlannedStops(dayStops),
      });
    }

    const bestRoute = routes[0] ?? null;

    return NextResponse.json({
      success: true,
      route: bestRoute,
      routes,
      input: request,
      summary: {
        vineyardCountConsidered: vineyards.length,
        selectedStops: ranked.length,
      },
      debug: ranked.map((item) => ({
        id: item.id,
        name: item.name,
        distanceKm: item.distanceKm,
        styleScore: item.styleScore,
        distanceScore: item.distanceScore,
        budgetScore: item.budgetScore,
        experienceScore: item.experienceScore,
        finalScore: item.finalScore,
      })),
    });
  } catch (error) {
    console.error("ROUTE PLAN ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: "Impossible de générer l’itinéraire intelligent.",
      },
      { status: 500 }
    );
  }
}