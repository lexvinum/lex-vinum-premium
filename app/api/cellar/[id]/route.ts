import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const updated = await prisma.cellarBottle.update({
    where: { id },
    data: {
      quantity: body?.quantity !== undefined ? Number(body.quantity) : undefined,
      purchasePrice:
        body?.purchasePrice !== undefined && body?.purchasePrice !== ""
          ? Number(body.purchasePrice)
          : body?.purchasePrice === ""
            ? null
            : undefined,
      purchaseDate:
        body?.purchaseDate !== undefined
          ? body.purchaseDate
            ? new Date(body.purchaseDate)
            : null
          : undefined,
      location: body?.location !== undefined ? body.location || null : undefined,
      drinkingWindow:
        body?.drinkingWindow !== undefined ? body.drinkingWindow || null : undefined,
      personalNote: body?.personalNote !== undefined ? body.personalNote || null : undefined,
      rating:
        body?.rating !== undefined && body?.rating !== ""
          ? Number(body.rating)
          : body?.rating === ""
            ? null
            : undefined,
    },
    include: { wine: true },
  });

  return NextResponse.json({ success: true, item: updated });
}

export async function DELETE(_: NextRequest, { params }: Params) {
  const { id } = await params;

  await prisma.cellarBottle.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}