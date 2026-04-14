import { prisma } from "@/lib/prisma";

export async function GET() {
  const wines = await prisma.wine.findMany({
    select: {
      id: true,
      name: true,
      producer: true,
    },
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });

  return Response.json(wines);
}