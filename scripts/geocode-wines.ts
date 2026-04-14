import "dotenv/config";
import { prisma } from "./prisma-script";

const API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY!;

async function geocode(address: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${API_KEY}&region=ca`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK" || !data.results?.length) return null;

  const result = data.results[0];

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id,
  };
}

async function main() {
  const wines = await prisma.wine.findMany({
    where: {
      latitude: null,
    },
    take: 300, // pour éviter quota au début
  });

  console.log(`🍷 ${wines.length} vins à géocoder`);

  for (const wine of wines) {
    const query = [
      wine.producer,
      wine.region,
      wine.country,
    ]
      .filter(Boolean)
      .join(", ");

    if (!query) continue;

    console.log("📍", query);

    const geo = await geocode(query);

    if (!geo) {
      console.log("❌ Not found:", wine.name);
      continue;
    }

    await prisma.wine.update({
      where: { id: wine.id },
      data: {
        latitude: geo.lat,
        longitude: geo.lng,
        placeId: geo.placeId,
        originLabel: query,
      },
    });

    console.log("✅", wine.name);
  }

  console.log("🎉 Done");
}

main().then(() => process.exit());