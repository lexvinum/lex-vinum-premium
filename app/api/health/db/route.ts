import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const wineCount = await prisma.wine.count();
    const cellarBottleCount = await prisma.cellarBottle.count();

    return NextResponse.json({
      ok: true,
      database: "connected",
      counts: {
        wines: wineCount,
        cellarBottles: cellarBottleCount,
      },
    });
  } catch (error) {
    console.error("DB health check failed:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}