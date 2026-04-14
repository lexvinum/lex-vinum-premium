"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";
import PremiumPageShell from "../../components/ui/PremiumPageShell";
import {
  PremiumInfoCard,
  PremiumSection,
  PremiumStatCard,
} from "../../components/ui/PremiumSection";

type MapMode = "quebec" | "world";
type Budget = "petit" | "moyen" | "premium";
type Pace = "detente" | "equilibre" | "intensif";
type PointType = "vineyard" | "wine";

type MapPoint = {
  id: string;
  name: string;
  slug?: string | null;
  latitude: number;
  longitude: number;
  type: PointType;
  region?: string | null;
  country?: string | null;
  city?: string | null;
  image?: string | null;
  originLabel?: string | null;
  isQuebec?: boolean;
  featured?: boolean;
  price?: number | null;
  color?: string | null;
  style?: string | null;
  producer?: string | null;
  description?: string | null;
};

type RouteStop = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type?: PointType;
  region?: string | null;
  country?: string | null;
  city?: string | null;
  image?: string | null;
  description?: string | null;
  score?: number | null;
};

type PlannedRoute = {
  title?: string;
  subtitle?: string;
  summary?: string;
  totalDistanceKm?: number;
  totalDurationMinutes?: number;
  estimatedBudgetLabel?: string;
  encodedPolyline?: string;
  polyline?: string;
  path?: Array<{ lat: number; lng: number }>;
  stops?: RouteStop[];
};

type RouteApiResponse = {
  route?: PlannedRoute;
  routes?: PlannedRoute[];
};

type RoutePreferences = {
  days: number;
  budget: Budget;
  styles: string[];
  pace: Pace;
  regionMode: MapMode;
};

declare global {
  interface Window {
    google?: typeof google;
  }
}

const MAP_ID = "lex-vinum-premium-map";
const DEFAULT_CENTER_QUEBEC = { lat: 45.3151, lng: -72.9046 };
const DEFAULT_CENTER_WORLD = { lat: 46.8139, lng: -71.208 };
const STYLE_OPTIONS = [
  "Rouge",
  "Blanc",
  "Rosé",
  "Bulles",
  "Nature",
  "Orange",
  "Biodynamie",
  "Premium",
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDuration(minutes?: number) {
  if (!minutes || Number.isNaN(minutes)) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);

  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatDistance(distanceKm?: number) {
  if (!distanceKm || Number.isNaN(distanceKm)) return "—";
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km`;
  return `${Math.round(distanceKm)} km`;
}

function markerGlyph(point: MapPoint) {
  if (point.type === "vineyard") return "V";
  return point.isQuebec ? "Q" : "M";
}

function resolvePointImage(point?: { image?: string | null; type?: PointType; isQuebec?: boolean }) {
  if (point?.image && point.image.trim().length > 0) {
    return point.image;
  }

  if (point?.type === "vineyard") {
    return "/images/terroir-1.jpeg";
  }

  if (point?.isQuebec) {
    return "/images/lifestyle-1.jpeg";
  }

  return "/images/editorial-1.jpeg";
}

export default function CartePage() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  const [mapsReady, setMapsReady] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("quebec");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [selectedStart, setSelectedStart] = useState<MapPoint | null>(null);

  const [days, setDays] = useState(2);
  const [budget, setBudget] = useState<Budget>("moyen");
  const [styles, setStyles] = useState<string[]>(["Rouge"]);
  const [pace, setPace] = useState<Pace>("equilibre");

  const [planning, setPlanning] = useState(false);
  const [planningError, setPlanningError] = useState<string | null>(null);
  const [plannedRoutes, setPlannedRoutes] = useState<PlannedRoute[]>([]);
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);

  const activeRoute = plannedRoutes[activeRouteIndex] ?? null;

  const visiblePoints = useMemo(() => {
    if (mapMode === "quebec") {
      return points.filter((point) => point.isQuebec || point.country === "Canada");
    }
    return points;
  }, [points, mapMode]);

  const editorialGallery = useMemo(
    () => [
      {
        src: "/images/lifestyle-1.jpeg",
        title: "Paysage & dégustation",
        text: "Une lecture plus sensible du territoire, entre vignobles, routes et provenance.",
      },
      {
        src: "/images/editorial-1.jpeg",
        title: "Origines sélectionnées",
        text: "Les points affichés sur la carte prennent une présence plus éditoriale et plus incarnée.",
      },
      {
        src: "/images/terroir-1.jpeg",
        title: "Terroir vivant",
        text: "Chaque itinéraire relie un lieu, une matière et une signature gustative.",
      },
    ],
    []
  );

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || mapInstanceRef.current) return;

    const google = window.google;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: DEFAULT_CENTER_QUEBEC,
      zoom: 7,
      minZoom: 2,
      mapId: MAP_ID,
      disableDefaultUI: true,
      zoomControl: true,
      fullscreenControl: false,
      streetViewControl: false,
      mapTypeControl: false,
      gestureHandling: "greedy",
    });

    infoWindowRef.current = new google.maps.InfoWindow();
  }, []);

  const fitMapToPoints = useCallback(
    (pts: MapPoint[]) => {
      const map = mapInstanceRef.current;
      const google = window.google;
      if (!map || !google || pts.length === 0) return;

      if (pts.length === 1) {
        map.panTo({ lat: pts[0].latitude, lng: pts[0].longitude });
        map.setZoom(mapMode === "quebec" ? 10 : 5);
        return;
      }

      const bounds = new google.maps.LatLngBounds();
      pts.forEach((point) => {
        bounds.extend({ lat: point.latitude, lng: point.longitude });
      });
      map.fitBounds(bounds, 80);
    },
    [mapMode]
  );

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((marker) => {
      marker.map = null;
    });
    markersRef.current = [];
  }, []);

  const clearRouteLine = useCallback(() => {
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
  }, []);

  const renderMarkers = useCallback(
    (pts: MapPoint[]) => {
      const map = mapInstanceRef.current;
      const google = window.google;
      const infoWindow = infoWindowRef.current;

      if (!map || !google) return;

      clearMarkers();

      markersRef.current = pts.map((point) => {
        const el = document.createElement("div");
        el.className =
          "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-[11px] font-semibold text-white shadow-[0_12px_35px_rgba(0,0,0,0.35)]";

        el.style.background =
          point.type === "vineyard"
            ? "linear-gradient(135deg, #c59a67 0%, #8c5f3d 100%)"
            : point.isQuebec
              ? "linear-gradient(135deg, #d8b48a 0%, #6f4b3b 100%)"
              : "linear-gradient(135deg, #8a7465 0%, #4a362d 100%)";

        el.innerText = markerGlyph(point);

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: point.latitude, lng: point.longitude },
          title: point.name,
          content: el,
        });

        marker.addListener("click", () => {
          setSelectedPoint(point);

          const html = `
            <div style="min-width:220px;max-width:260px;padding:6px 2px 4px 2px;">
              <div style="font-size:13px;color:#8b6b57;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">
                ${point.type === "vineyard" ? "Vignoble" : "Vin"}
              </div>
              <div style="font-weight:700;font-size:16px;color:#221a17;line-height:1.2;margin-bottom:6px;">
                ${point.name}
              </div>
              <div style="font-size:13px;color:#5b4c43;line-height:1.4;">
                ${[point.city, point.region, point.country].filter(Boolean).join(", ")}
              </div>
              ${
                point.originLabel
                  ? `<div style="font-size:12px;color:#7a6658;margin-top:6px;">${point.originLabel}</div>`
                  : ""
              }
            </div>
          `;

          infoWindow?.setContent(html);
          infoWindow?.open({
            anchor: marker,
            map,
          });

          map.panTo({ lat: point.latitude, lng: point.longitude });
        });

        return marker;
      });
    },
    [clearMarkers]
  );

  const fetchPoints = useCallback(async (mode: MapMode) => {
    setLoadingPoints(true);
    setPointsError(null);

    try {
      const res = await fetch(`/api/map/points?mode=${mode}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`Impossible de charger les points (${res.status})`);
      }

      const data = await res.json();
      const nextPoints: MapPoint[] = Array.isArray(data?.points) ? data.points : [];

      setPoints(nextPoints);
      setSelectedPoint(null);
      setSelectedStart((current) => {
        if (!current) return null;
        const stillExists = nextPoints.find((p) => p.id === current.id);
        return stillExists ?? null;
      });
    } catch (error) {
      setPointsError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du chargement des points."
      );
    } finally {
      setLoadingPoints(false);
    }
  }, []);

  const drawRoute = useCallback(
    (route: PlannedRoute | null) => {
      const map = mapInstanceRef.current;
      const google = window.google;

      clearRouteLine();

      if (!map || !google || !route) return;

      let path: Array<{ lat: number; lng: number }> = [];

      if (Array.isArray(route.path) && route.path.length > 0) {
        path = route.path;
      } else {
        const encoded = route.encodedPolyline || route.polyline;
        if (
          encoded &&
          google.maps.geometry &&
          google.maps.geometry.encoding &&
          typeof google.maps.geometry.encoding.decodePath === "function"
        ) {
          path = google.maps.geometry.encoding.decodePath(encoded).map((p) => ({
            lat: p.lat(),
            lng: p.lng(),
          }));
        }
      }

      if (path.length === 0) return;

      routePolylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: "#d6b692",
        strokeOpacity: 0.95,
        strokeWeight: 5,
      });

      routePolylineRef.current.setMap(map);

      const bounds = new google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 120);
    },
    [clearRouteLine]
  );

  const handleToggleStyle = (style: string) => {
    setStyles((current) =>
      current.includes(style)
        ? current.filter((item) => item !== style)
        : [...current, style]
    );
  };

  const handleChooseStart = (point: MapPoint) => {
    setSelectedStart(point);
    setSelectedPoint(point);

    const map = mapInstanceRef.current;
    if (map) {
      map.panTo({ lat: point.latitude, lng: point.longitude });
      map.setZoom(Math.max(map.getZoom() ?? 8, 9));
    }
  };

  const handlePlanRoute = async () => {
    if (!selectedStart) {
      setPlanningError("Choisis d’abord un point de départ sur la carte ou dans la liste.");
      return;
    }

    setPlanning(true);
    setPlanningError(null);

    try {
      const payload = {
        start: {
          id: selectedStart.id,
          lat: selectedStart.latitude,
          lng: selectedStart.longitude,
          name: selectedStart.name,
        },
        preferences: {
          days,
          budget,
          styles,
          pace,
          regionMode: mapMode,
        } satisfies RoutePreferences,
      };

      const res = await fetch("/api/routes/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Impossible de planifier l’itinéraire (${res.status})`);
      }

      const data: RouteApiResponse = await res.json();

      const nextRoutes =
        Array.isArray(data.routes) && data.routes.length > 0
          ? data.routes
          : data.route
            ? [data.route]
            : [];

      setPlannedRoutes(nextRoutes);
      setActiveRouteIndex(0);

      if (nextRoutes[0]) {
        drawRoute(nextRoutes[0]);
      } else {
        clearRouteLine();
      }
    } catch (error) {
      setPlanningError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue pendant la planification."
      );
    } finally {
      setPlanning(false);
    }
  };

  useEffect(() => {
    if (!mapsReady) return;
    initializeMap();
  }, [mapsReady, initializeMap]);

  useEffect(() => {
    fetchPoints(mapMode);
  }, [fetchPoints, mapMode]);

  useEffect(() => {
    if (!mapsReady || !mapInstanceRef.current) return;

    renderMarkers(visiblePoints);
    fitMapToPoints(visiblePoints);
  }, [mapsReady, visiblePoints, renderMarkers, fitMapToPoints]);

  useEffect(() => {
    drawRoute(activeRoute);
  }, [activeRoute, drawRoute]);

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=marker,geometry`}
        strategy="afterInteractive"
        onLoad={() => setMapsReady(true)}
      />

      <PremiumPageShell
        eyebrow="Carte"
        title="Routes & vignobles"
        subtitle="Explore les vignobles du Québec, visualise les vins du monde et génère un itinéraire intelligent dans une lecture plus éditoriale du territoire."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setMapMode("quebec")}
              className={cx(
                "inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition",
                mapMode === "quebec"
                  ? "bg-[#e4d5bc] text-[#1d1712]"
                  : "border border-[#6c7a65] bg-[rgba(255,255,255,0.05)] text-[#f3ece1] hover:bg-[rgba(255,255,255,0.10)]"
              )}
            >
              Québec
            </button>

            <button
              type="button"
              onClick={() => setMapMode("world")}
              className={cx(
                "inline-flex items-center rounded-full px-5 py-2.5 text-sm font-medium transition",
                mapMode === "world"
                  ? "bg-[#e4d5bc] text-[#1d1712]"
                  : "border border-[#6c7a65] bg-[rgba(255,255,255,0.05)] text-[#f3ece1] hover:bg-[rgba(255,255,255,0.10)]"
              )}
            >
              Monde
            </button>
          </div>
        }
      >
        <section className="relative overflow-hidden rounded-[28px] border border-[#465344] bg-[#233126] shadow-[0_24px_80px_rgba(16,18,14,0.24)]">
          <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,14,12,0.18),rgba(18,14,12,0.66))]" />

          <div
            ref={mapRef}
            className="relative z-0 h-[65vh] min-h-[640px] w-full"
          />

          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute right-0 top-0 h-full w-[34%]">
              <Image
                src="/images/editorial-1.jpeg"
                alt="Ambiance éditoriale du territoire"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-[linear-gradient(to_left,rgba(20,15,12,0.72),rgba(20,15,12,0.12))]" />
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[#120d0b]/85 via-[#120d0b]/35 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#120d0b]/90 via-[#120d0b]/35 to-transparent" />

          <div className="absolute left-6 top-6 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(18,13,11,0.82)] p-1 backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setMapMode("quebec")}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                mapMode === "quebec"
                  ? "bg-[#d6b692] text-[#2b1d18]"
                  : "text-[#e7d7c9] hover:bg-white/5"
              )}
            >
              Québec
            </button>
            <button
              type="button"
              onClick={() => setMapMode("world")}
              className={cx(
                "rounded-full px-4 py-2 text-sm font-medium transition",
                mapMode === "world"
                  ? "bg-[#d6b692] text-[#2b1d18]"
                  : "text-[#e7d7c9] hover:bg-white/5"
              )}
            >
              Monde
            </button>
          </div>

          <div className="absolute bottom-6 left-6 z-20 max-w-xl rounded-[22px] border border-white/10 bg-[rgba(18,13,11,0.78)] p-4 backdrop-blur-xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[#b89f8e]">
              Lex Vinum Premium
            </p>
            <h2 className="mt-2 font-serif text-3xl text-white">
              Exploration du territoire
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#d9c6b7]">
              Sélectionne un départ, explore les points visibles et laisse
              Lex Vinum proposer un parcours cohérent selon le style, le
              budget et le rythme souhaité.
            </p>
          </div>

          {loadingPoints && (
            <div className="absolute right-4 top-4 z-20 rounded-full border border-white/10 bg-[rgba(18,13,11,0.82)] px-4 py-2 text-sm text-[#e7d7c9] backdrop-blur-xl">
              Chargement des points…
            </div>
          )}

          {pointsError && (
            <div className="absolute bottom-4 right-4 z-20 max-w-sm rounded-[18px] border border-[#7f3d3d] bg-[rgba(61,18,18,0.85)] px-4 py-3 text-sm text-[#ffd4d4] backdrop-blur-xl">
              {pointsError}
            </div>
          )}
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <PremiumStatCard
            label="Points visibles"
            value={visiblePoints.length}
            hint="Vignobles et vins actuellement affichés."
          />
          <PremiumStatCard
            label="Mode"
            value={mapMode === "quebec" ? "Québec" : "Monde"}
            hint="Focus local ou lecture globale."
          />
          <PremiumStatCard
            label="Départ"
            value={selectedStart ? selectedStart.name : "À choisir"}
            hint="Point utilisé pour générer la route."
          />
          <PremiumStatCard
            label="Itinéraires"
            value={plannedRoutes.length}
            hint="Parcours intelligents proposés."
          />
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="group relative overflow-hidden rounded-[26px] border border-[#d8d0c4] bg-[#eae2d6] shadow-[0_18px_50px_rgba(58,42,28,0.10)]">
              <div className="relative h-[280px] w-full">
                <Image
                  src="/images/lifestyle-1.jpeg"
                  alt="Paysage de vignoble"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.02]"
                  unoptimized
                />
              </div>
              <div className="border-t border-[#d8d0c4] bg-[#f7f1e8] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#7c7268]">
                  Regard éditorial
                </p>
                <h3 className="mt-2 font-serif text-2xl text-[#221c18]">
                  Le territoire avant la route
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#655c53]">
                  Une approche plus sensible de la carte, où l’origine, la
                  matière et le paysage enrichissent la lecture des points.
                </p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-[26px] border border-[#d8d0c4] bg-[#e8ddd0] shadow-[0_18px_50px_rgba(58,42,28,0.10)]">
              <div className="relative h-[280px] w-full">
                <Image
                  src="/images/terroir-1.jpeg"
                  alt="Terroir"
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.02]"
                  unoptimized
                />
              </div>
              <div className="border-t border-[#d8d0c4] bg-[#f7f1e8] p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#7c7268]">
                  Signature
                </p>
                <h3 className="mt-2 font-serif text-2xl text-[#221c18]">
                  Chaque point raconte un lieu
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#655c53]">
                  Les vignobles et les vins gagnent ici une présence plus
                  incarnée, plus premium et plus alignée avec la DA du site.
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-[#d7cfc2] bg-[#1f2a24] shadow-[0_24px_70px_rgba(21,25,20,0.18)]">
            <div className="absolute inset-0">
              <Image
                src="/images/editorial-1.jpeg"
                alt="Atmosphère vignoble"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(21,30,24,0.82),rgba(31,42,36,0.58),rgba(23,20,18,0.70))]" />
            </div>

            <div className="relative z-10 flex h-full min-h-[320px] flex-col justify-end p-8">
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#d6c1ab]">
                Itinéraires intelligents
              </p>
              <h3 className="mt-3 max-w-md font-serif text-3xl text-[#f6efe7]">
                Une carte plus habitée, sans toucher à la logique métier
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-7 text-[#e1d1c2]">
                Les fonctions, hooks, états et appels API restent inchangés.
                On enrichit seulement la présence visuelle avec davantage de
                photographie et de respiration.
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.94fr_1.06fr]">
          <PremiumSection
            title="Planificateur"
            subtitle="Construire un parcours cohérent selon le rythme, le budget et les styles recherchés."
          >
            <div className="space-y-6">
              <div>
                <p className="mb-3 text-sm font-medium text-[#221c18]">Durée</p>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDays(value)}
                      className={cx(
                        "rounded-2xl border px-3 py-3 text-sm font-medium transition",
                        days === value
                          ? "border-[#d6b692] bg-[#d6b692] text-[#2b1d18]"
                          : "border-[#d7cfc2] bg-white text-[#5d544b] hover:bg-[#f1ebe2]"
                      )}
                    >
                      {value} jour{value > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[#221c18]">Budget</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["petit", "moyen", "premium"] as Budget[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setBudget(value)}
                      className={cx(
                        "rounded-2xl border px-3 py-3 text-sm font-medium capitalize transition",
                        budget === value
                          ? "border-[#d6b692] bg-[#d6b692] text-[#2b1d18]"
                          : "border-[#d7cfc2] bg-white text-[#5d544b] hover:bg-[#f1ebe2]"
                      )}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[#221c18]">Rythme</p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["detente", "Détente"],
                      ["equilibre", "Équilibré"],
                      ["intensif", "Intensif"],
                    ] as Array<[Pace, string]>
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPace(value)}
                      className={cx(
                        "rounded-2xl border px-3 py-3 text-sm font-medium transition",
                        pace === value
                          ? "border-[#d6b692] bg-[#d6b692] text-[#2b1d18]"
                          : "border-[#d7cfc2] bg-white text-[#5d544b] hover:bg-[#f1ebe2]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-[#221c18]">
                  Styles recherchés
                </p>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map((style) => {
                    const active = styles.includes(style);
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleToggleStyle(style)}
                        className={cx(
                          "rounded-full border px-3 py-2 text-sm transition",
                          active
                            ? "border-[#d6b692] bg-[#d6b692] text-[#2b1d18]"
                            : "border-[#d7cfc2] bg-white text-[#5d544b] hover:bg-[#f1ebe2]"
                        )}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>

              <PremiumInfoCard className="p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8b7d71]">
                  Point de départ
                </p>
                <p className="mt-2 text-base font-semibold text-[#221c18]">
                  {selectedStart ? selectedStart.name : "Aucun point sélectionné"}
                </p>
                <p className="mt-1 text-sm text-[#6b6156]">
                  {selectedStart
                    ? [selectedStart.city, selectedStart.region, selectedStart.country]
                        .filter(Boolean)
                        .join(", ")
                    : "Clique sur un point de la carte ou choisis-le dans la liste ci-dessous."}
                </p>
              </PremiumInfoCard>

              <button
                type="button"
                onClick={handlePlanRoute}
                disabled={planning || !selectedStart}
                className="inline-flex w-full items-center justify-center rounded-full bg-[#1f2a24] px-6 py-3 text-sm font-medium text-[#f3ece1] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {planning ? "Planification en cours…" : "Générer l’itinéraire intelligent"}
              </button>

              {planningError && (
                <div className="rounded-[18px] border border-[#b46a5f] bg-[rgba(180,74,54,0.08)] px-4 py-3 text-sm text-[#8d3f33]">
                  {planningError}
                </div>
              )}
            </div>
          </PremiumSection>

          <PremiumSection
            title="Itinéraires"
            subtitle="Résultats générés selon les préférences sélectionnées."
            rightSlot={
              plannedRoutes.length > 1 ? (
                <div className="flex items-center gap-2">
                  {plannedRoutes.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setActiveRouteIndex(index)}
                      className={cx(
                        "h-2.5 w-2.5 rounded-full transition",
                        activeRouteIndex === index ? "bg-[#d6b692]" : "bg-[#d5ccbe]"
                      )}
                      aria-label={`Voir itinéraire ${index + 1}`}
                    />
                  ))}
                </div>
              ) : undefined
            }
          >
            {!activeRoute ? (
              <div className="rounded-[22px] border border-dashed border-[#d7cfc2] bg-white p-5 text-sm leading-6 text-[#6a6156]">
                Ton itinéraire apparaîtra ici après la planification.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[24px] border border-[#d7cfc2] bg-[#f6f2eb] p-5">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#8b7d71]">
                    Route recommandée
                  </p>
                  <h3 className="mt-2 font-serif text-3xl text-[#221c18]">
                    {activeRoute.title || "Escapade Lex Vinum"}
                  </h3>

                  {activeRoute.subtitle && (
                    <p className="mt-2 text-sm text-[#6b6156]">
                      {activeRoute.subtitle}
                    </p>
                  )}

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-[18px] border border-[#ddd5c9] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8a7f73]">
                        Durée
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#221c18]">
                        {formatDuration(activeRoute.totalDurationMinutes)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#ddd5c9] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8a7f73]">
                        Distance
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#221c18]">
                        {formatDistance(activeRoute.totalDistanceKm)}
                      </p>
                    </div>

                    <div className="rounded-[18px] border border-[#ddd5c9] bg-white p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#8a7f73]">
                        Budget
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[#221c18]">
                        {activeRoute.estimatedBudgetLabel || budget}
                      </p>
                    </div>
                  </div>

                  {activeRoute.summary && (
                    <p className="mt-4 text-sm leading-6 text-[#5d544b]">
                      {activeRoute.summary}
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium text-[#221c18]">
                    Étapes du parcours
                  </p>

                  <div className="space-y-3">
                    {(activeRoute.stops ?? []).map((stop, index) => (
                      <div
                        key={`${stop.id}-${index}`}
                        className="overflow-hidden rounded-[22px] border border-[#ddd5c9] bg-white"
                      >
                        <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                          <div className="relative min-h-[180px] bg-[#efe7dc]">
                            <Image
                              src={resolvePointImage(stop)}
                              alt={stop.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          <div className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d6b692_0%,#8f6242_100%)] text-sm font-semibold text-[#2a1b16]">
                                {index + 1}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="text-base font-semibold text-[#221c18]">
                                  {stop.name}
                                </p>
                                <p className="mt-1 text-sm text-[#6b6156]">
                                  {[stop.city, stop.region, stop.country].filter(Boolean).join(", ")}
                                </p>

                                {stop.description && (
                                  <p className="mt-2 text-sm leading-6 text-[#5d544b]">
                                    {stop.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!activeRoute.stops || activeRoute.stops.length === 0) && (
                      <div className="rounded-[22px] border border-[#ddd5c9] bg-white p-4 text-sm text-[#6b6156]">
                        Aucun arrêt détaillé n’a été retourné par l’API, mais la route a bien été tracée sur la carte.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </PremiumSection>
        </div>

        <section className="grid gap-6 md:grid-cols-3">
          {editorialGallery.map((item) => (
            <article
              key={item.src}
              className="group overflow-hidden rounded-[24px] border border-[#d7cfc2] bg-white shadow-[0_18px_45px_rgba(58,42,28,0.08)]"
            >
              <div className="relative h-[240px]">
                <Image
                  src={item.src}
                  alt={item.title}
                  fill
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  unoptimized
                />
              </div>
              <div className="p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[#8b7d71]">
                  Carte éditoriale
                </p>
                <h3 className="mt-2 font-serif text-2xl text-[#221c18]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#665d54]">
                  {item.text}
                </p>
              </div>
            </article>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <PremiumSection
            title="Départs suggérés"
            subtitle="Les points visibles sur la carte sont repris ici dans une lecture plus claire et plus éditoriale."
            rightSlot={<div className="rounded-full border border-[#d7cfc2] bg-white px-4 py-2 text-sm text-[#6a6156]">{visiblePoints.length} points</div>}
          >
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {visiblePoints.slice(0, 16).map((point) => {
                const isActive = selectedStart?.id === point.id;

                return (
                  <button
                    key={point.id}
                    type="button"
                    onClick={() => handleChooseStart(point)}
                    className={cx(
                      "w-full overflow-hidden rounded-[22px] border text-left transition",
                      isActive
                        ? "border-[#d6b692] bg-[#f1e7d8]"
                        : "border-[#ddd5c9] bg-white hover:bg-[#f5f0e7]"
                    )}
                  >
                    <div className="grid gap-0 sm:grid-cols-[126px_1fr]">
                      <div className="relative min-h-[126px] bg-[#ede4d7]">
                        <Image
                          src={resolvePointImage(point)}
                          alt={point.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-[#221c18]">
                              {point.name}
                            </p>
                            <p className="mt-1 text-sm text-[#6b6156]">
                              {[point.city, point.region, point.country].filter(Boolean).join(", ")}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8a7f73]">
                              {point.type === "vineyard" ? "Vignoble" : "Vin"}
                            </p>
                          </div>

                          <div
                            className={cx(
                              "rounded-full px-3 py-1 text-xs font-medium",
                              point.type === "vineyard"
                                ? "bg-[#6f4b3b] text-[#f2dfd1]"
                                : "bg-[#e8e0d4] text-[#5c544b]"
                            )}
                          >
                            {point.type === "vineyard" ? "Visite" : "Origine"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {visiblePoints.length === 0 && !loadingPoints && (
                <div className="rounded-[22px] border border-[#ddd5c9] bg-white p-4 text-sm text-[#6b6156]">
                  Aucun point disponible pour ce mode.
                </div>
              )}
            </div>
          </PremiumSection>

          {selectedPoint ? (
            <PremiumSection
              title="Point sélectionné"
              subtitle="Résumé du point actuellement sélectionné sur la carte."
            >
              <PremiumInfoCard className="overflow-hidden p-0">
                <div className="relative h-[280px] w-full">
                  <Image
                    src={resolvePointImage(selectedPoint)}
                    alt={selectedPoint.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(22,18,15,0.72),rgba(22,18,15,0.12))]" />
                </div>

                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#ddd4c7] bg-[#faf6ef] px-3 py-1 text-[11px] text-[#685f56]">
                      {selectedPoint.type === "vineyard" ? "Vignoble" : "Vin"}
                    </span>
                    {selectedPoint.region ? (
                      <span className="rounded-full border border-[#ddd4c7] bg-[#faf6ef] px-3 py-1 text-[11px] text-[#685f56]">
                        {selectedPoint.region}
                      </span>
                    ) : null}
                    {selectedPoint.country ? (
                      <span className="rounded-full border border-[#ddd4c7] bg-[#faf6ef] px-3 py-1 text-[11px] text-[#685f56]">
                        {selectedPoint.country}
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="font-serif text-2xl text-[#221c18]">
                      {selectedPoint.name}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-[#6b6156]">
                      {[selectedPoint.city, selectedPoint.region, selectedPoint.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>

                  {selectedPoint.description ? (
                    <p className="text-sm leading-7 text-[#5d544b]">
                      {selectedPoint.description}
                    </p>
                  ) : selectedPoint.originLabel ? (
                    <p className="text-sm leading-7 text-[#5d544b]">
                      {selectedPoint.originLabel}
                    </p>
                  ) : null}
                </div>
              </PremiumInfoCard>
            </PremiumSection>
          ) : (
            <PremiumSection
              title="Point sélectionné"
              subtitle="Le détail du point apparaîtra ici lorsque tu cliqueras sur la carte."
            >
              <div className="overflow-hidden rounded-[22px] border border-dashed border-[#d7cfc2] bg-white">
                <div className="relative h-[220px] w-full">
                  <Image
                    src="/images/editorial-1.jpeg"
                    alt="Sélection à venir"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(22,18,15,0.65),rgba(22,18,15,0.12))]" />
                </div>
                <div className="p-5 text-sm leading-6 text-[#6a6156]">
                  Sélectionne un point sur la carte ou dans la liste pour afficher son résumé ici.
                </div>
              </div>
            </PremiumSection>
          )}
        </div>
      </PremiumPageShell>
    </>
  );
}