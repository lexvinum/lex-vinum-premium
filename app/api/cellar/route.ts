import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.cellarBottle.findMany({
    include: { wine: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const wineId = String(body?.wineId || "");
  const quantity = Number(body?.quantity || 1);
  const purchasePrice =
    body?.purchasePrice !== undefined && body?.purchasePrice !== ""
      ? Number(body.purchasePrice)
      : null;
  const purchaseDate = body?.purchaseDate ? new Date(body.purchaseDate) : null;
  const location = body?.location ? String(body.location) : null;
  const drinkingWindow = body?.drinkingWindow ? String(body.drinkingWindow) : null;
  const personalNote = body?.personalNote ? String(body.personalNote) : null;
  const rating =
    body?.rating !== undefined && body?.rating !== "" ? Number(body.rating) : null;

  if (!wineId) {
    return NextResponse.json({ success: false, error: "wineId manquant" }, { status: 400 });
  }

  const created = await prisma.cellarBottle.create({
    data: {
      wineId,
      quantity,
      purchasePrice,
      purchaseDate,
      location,
      drinkingWindow,
      personalNote,
      rating,
    },
    include: { wine: true },
  });

  return NextResponse.json({ success: true, item: created });
}