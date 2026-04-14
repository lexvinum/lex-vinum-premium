import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const FAVORITES_COOKIE = "lexvinum_favorites";

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return [...new Set(input.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
}

async function readFavoriteSlugs(): Promise<string[]> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(FAVORITES_COOKIE)?.value;

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return normalizeStringArray(parsed);
  } catch {
    return [];
  }
}

async function writeFavoriteSlugs(slugs: string[]) {
  const cookieStore = await cookies();

  cookieStore.set(FAVORITES_COOKIE, JSON.stringify(slugs), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  const favorites = await readFavoriteSlugs();

  if (slug) {
    return Response.json({
      ok: true,
      active: favorites.includes(slug),
      favorites,
      count: favorites.length,
    });
  }

  return Response.json({
    ok: true,
    favorites,
    count: favorites.length,
  });
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return Response.json(
      { ok: false, error: "Body JSON invalide." },
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null) {
    return Response.json(
      { ok: false, error: "Body JSON invalide." },
      { status: 400 }
    );
  }

  const payload = body as {
    ids?: unknown;
    slug?: unknown;
  };

  // --- Compatibilité avec ton route actuel ---
  if (Array.isArray(payload.ids)) {
    const ids = normalizeStringArray(payload.ids);

    const wines = await prisma.wine.findMany({
      where: {
        id: { in: ids },
      },
    });

    return Response.json(wines);
  }

  // --- Nouveau comportement : toggle favori par slug ---
  const slug =
    typeof payload.slug === "string" ? payload.slug.trim() : "";

  if (!slug) {
    return Response.json(
      { ok: false, error: "Le slug du vin est requis." },
      { status: 400 }
    );
  }

  const existingWine = await prisma.wine.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!existingWine) {
    return Response.json(
      { ok: false, error: "Vin introuvable." },
      { status: 404 }
    );
  }

  const favorites = await readFavoriteSlugs();
  const isActive = favorites.includes(slug);

  const nextFavorites = isActive
    ? favorites.filter((item) => item !== slug)
    : [slug, ...favorites];

  await writeFavoriteSlugs(nextFavorites);

  return Response.json({
    ok: true,
    active: !isActive,
    favorites: nextFavorites,
    count: nextFavorites.length,
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return Response.json(
      { ok: false, error: "Le slug du vin est requis." },
      { status: 400 }
    );
  }

  const favorites = await readFavoriteSlugs();
  const nextFavorites = favorites.filter((item) => item !== slug);

  await writeFavoriteSlugs(nextFavorites);

  return Response.json({
    ok: true,
    active: false,
    favorites: nextFavorites,
    count: nextFavorites.length,
  });
}