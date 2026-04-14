import "dotenv/config";
import { prisma } from "./prisma-script";

const API_KEY = process.env.GOOGLE_MAPS_SERVER_API_KEY!;

const vineyards = [
  { name: "Domaine Pinnacle", city: "Frelighsburg", region: "Cantons-de-l'Est" },
  { name: "Vignoble de l'Orpailleur", city: "Dunham", region: "Cantons-de-l'Est" },
  { name: "Domaine Les Brome", city: "Lac-Brome", region: "Cantons-de-l'Est" },
  { name: "Vignoble Rivière du Chêne", city: "Saint-Eustache", region: "Laurentides" },
  { name: "Domaine Labranche", city: "Saint-Isidore", region: "Montérégie" },
  { name: "Vignoble Coteau Rougemont", city: "Rougemont", region: "Montérégie" },
  { name: "Vignoble Saint-Gabriel", city: "Saint-Gabriel-de-Brandon", region: "Lanaudière" },
  { name: "Vignoble Le Chat Botté", city: "Hemmingford", region: "Montérégie" },
];

async function geocode(address: string) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${API_KEY}&region=ca&language=fr`;

  const res = await fetch(url);
  const data = await res.json();

  console.log("Geocode status:", data.status, data.error_message || "");

  if (data.status !== "OK" || !data.results?.length) {
    return null;
  }

  const result = data.results[0];

  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    placeId: result.place_id,
    formattedAddress: result.formatted_address,
  };
}

async function main() {
  for (const v of vineyards) {
    const query = `${v.name}, ${v.city}, Quebec, Canada`;

    console.log("📍 Geocoding:", query);

    const geo = await geocode(query);

    if (!geo) {
      console.log("❌ Not found:", v.name);
      continue;
    }

    await prisma.vineyard.upsert({
      where: {
        slug: v.name.toLowerCase().replace(/\s+/g, "-"),
      },
      update: {},
      create: {
        slug: v.name.toLowerCase().replace(/\s+/g, "-"),
        name: v.name,
        city: v.city,
        region: v.region,
        province: "Québec",
        country: "Canada",
        latitude: geo.lat,
        longitude: geo.lng,
        placeId: geo.placeId,
        isQuebec: true,
        tastingOffered: true,
      },
    });

    console.log("✅ Added:", v.name);
  }

  console.log("🎉 Done");
}

main().then(() => process.exit());