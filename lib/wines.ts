import { prisma } from "@/lib/prisma";

export async function getAllWines() {
  return prisma.wine.findMany({
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
}

export async function getWineBySlug(slug: string) {
  return prisma.wine.findUnique({
    where: { slug },
  });
}

export async function getRelatedWines(slug: string) {
  const wine = await prisma.wine.findUnique({
    where: { slug },
  });

  if (!wine) return [];

  return prisma.wine.findMany({
    where: {
      NOT: { slug },
      OR: [
        { color: wine.color || undefined },
        { country: wine.country || undefined },
        { grape: wine.grape || undefined },
      ],
    },
    take: 3,
    orderBy: [{ featured: "desc" }, { name: "asc" }],
  });
}

export async function getCellarItems() {
  return prisma.cellarBottle.findMany({
    include: {
      wine: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });
}