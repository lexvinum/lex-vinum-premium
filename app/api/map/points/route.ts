import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [vineyards, wines] = await Promise.all([
    prisma.vineyard.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { name: "asc" },
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
      orderBy: [{ isQuebec: "desc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        producer: true,
        country: true,
        region: true,
        color: true,
        image: true,
        isQuebec: true,
        latitude: true,
        longitude: true,
        vineyardId: true,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    vineyards,
    wines,
  });
}