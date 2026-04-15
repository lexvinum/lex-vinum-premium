import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET() {
  try {
    const [vineyards, wines] = await Promise.all([
      prisma.vineyard.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        orderBy: { name: "asc" },
        take: 200,
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
      }),
      prisma.wine.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        orderBy: { name: "asc" },
        take: 200,
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
        },
      }),
    ]);

    const vineyardPoints: MapPoint[] = vineyards
      .filter((v) => v.latitude !== null && v.longitude !== null)
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
        latitude: Number(v.latitude),
        longitude: Number(v.longitude),
        image: v.image ?? null,
        website: v.website ?? null,
        isQuebec: Boolean(v.isQuebec),
        tastingOffered: Boolean(v.tastingOffered),
        lodgingOffered: Boolean(v.lodgingOffered),
        restaurantOnSite: Boolean(v.restaurantOnSite),
      }));

    const winePoints: MapPoint[] = wines
      .filter((w) => w.latitude !== null && w.longitude !== null)
      .map((w) => ({
        id: w.id,
        slug: w.slug ?? null,
        type: "wine",
        name: w.name,
        subtitle: w.producer ?? null,
        country: w.country ?? null,
        region: w.region ?? null,
        province: null,
        city: null,
        latitude: Number(w.latitude),
        longitude: Number(w.longitude),
        image: w.image ?? null,
        website: null,
        isQuebec: Boolean(w.isQuebec),
        tastingOffered: false,
        lodgingOffered: false,
        restaurantOnSite: false,
      }));

    const points = [...vineyardPoints, ...winePoints];

    return NextResponse.json({
      ok: true,
      count: points.length,
      vineyardsCount: vineyardPoints.length,
      winesCount: winePoints.length,
      points,
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