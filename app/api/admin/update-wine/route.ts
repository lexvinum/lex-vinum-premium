import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const { id, name } = body as { id?: string; name?: string };

  if (!id || !name?.trim()) {
    return Response.json(
      { error: "id et name sont requis" },
      { status: 400 }
    );
  }

  const updated = await prisma.wine.update({
    where: { id },
    data: { name: name.trim() },
  });

  return Response.json(updated);
}