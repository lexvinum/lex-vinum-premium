import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isImageAlive(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";

    return response.ok && contentType.startsWith("image/");
  } catch {
    return false;
  }
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 200;

  const dryRun = process.argv.includes("--dry-run");

  const wines = await prisma.wine.findMany({
    where: {
      dataSource: "SAQ",
      image: {
        startsWith: "http",
      },
    },
    take: limit,
    select: {
      id: true,
      name: true,
      image: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  let checked = 0;
  let valid = 0;
  let invalid = 0;
  let updated = 0;

  for (const wine of wines) {
    checked += 1;

    const image = wine.image;
    if (!image) continue;

    const alive = await isImageAlive(image);

    if (alive) {
      valid += 1;
      console.log(`[${checked}/${wines.length}] OK → ${wine.name}`);
    } else {
      invalid += 1;
      console.log(`[${checked}/${wines.length}] BROKEN → ${wine.name}`);
      console.log(image);

      if (!dryRun) {
        await prisma.wine.update({
          where: { id: wine.id },
          data: { image: null },
        });
        updated += 1;
      }
    }

    await sleep(150);
  }

  console.log("");
  console.log("────────── RÉSUMÉ ──────────");
  console.log(`Vérifiées          : ${checked}`);
  console.log(`Valides            : ${valid}`);
  console.log(`Cassées            : ${invalid}`);
  console.log(`Mises à null       : ${updated}`);
  console.log(`Dry run            : ${dryRun ? "oui" : "non"}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });