import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing");
}

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

const products = [
  {
    name: "Tire-bouchon Lex Vinum Premium",
    description:
      "Un tire-bouchon élégant et durable, pensé pour une expérience de service raffinée.",
    shortDesc: "Accessoire essentiel, finition premium.",
    priceCents: 4900,
    image: "/shop/tire-bouchon-lex-vinum.jpg",
    category: "Accessoires",
    featured: true,
    inventory: 25,
  },
  {
    name: "Sac tote Lex Vinum",
    description:
      "Un sac sobre et chic pour transporter bouteilles, carnets et essentiels du quotidien.",
    shortDesc: "Pratique, élégant, signature Lex Vinum.",
    priceCents: 3200,
    image: "/shop/sac-lex-vinum.jpg",
    category: "Lifestyle",
    featured: true,
    inventory: 40,
  },
  {
    name: "Verre de dégustation Lex Vinum",
    description:
      "Un verre au profil polyvalent pour mieux apprécier la structure et les arômes.",
    shortDesc: "Design sobre, usage quotidien ou cadeau.",
    priceCents: 2400,
    image: "/shop/verre-lex-vinum.jpg",
    category: "Verres",
    featured: true,
    inventory: 60,
  },
];

async function main() {
  for (const product of products) {
    const slug = slugify(product.name);

    await prisma.shopProduct.upsert({
      where: { slug },
      update: {
        name: product.name,
        description: product.description,
        shortDesc: product.shortDesc,
        priceCents: product.priceCents,
        image: product.image,
        category: product.category,
        featured: product.featured,
        inventory: product.inventory,
        active: true,
      },
      create: {
        slug,
        name: product.name,
        description: product.description,
        shortDesc: product.shortDesc,
        priceCents: product.priceCents,
        image: product.image,
        category: product.category,
        featured: product.featured,
        inventory: product.inventory,
        active: true,
        currency: "cad",
      },
    });

    console.log(`✅ Produit seedé : ${product.name}`);
  }

  console.log("🎉 Seed boutique terminé.");
}

main()
  .catch((error) => {
    console.error("❌ Erreur seed-shop-products:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });