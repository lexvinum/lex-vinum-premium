import { prisma } from "./prisma";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SeedPost = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  featured?: boolean;
  image?: string | null;
};

const posts: SeedPost[] = [
  {
    title: "Comment choisir un vin au restaurant sans se tromper",
    excerpt:
      "Une méthode simple et premium pour lire une carte des vins, comprendre les styles et choisir un vin adapté à son plat et à son budget.",
    category: "Conseils",
    featured: true,
    image: "/images/blog/choisir-vin-restaurant.jpg",
    content: `
Choisir un vin au restaurant peut sembler intimidant, surtout lorsque la carte est longue, technique ou peu expliquée. Pourtant, il existe une façon simple de faire un bon choix sans être expert.

La première étape consiste à partir du plat. Un vin blanc vif et tendu fonctionne souvent très bien avec les fruits de mer, les poissons et certains plats plus légers. Un rouge souple et peu tannique s’accorde mieux avec plusieurs volailles, des pâtes en sauce tomate ou des viandes moins puissantes. Pour une viande rouge plus riche, un rouge plus structuré peut offrir un meilleur équilibre.

La deuxième étape est de regarder le style plutôt que seulement le pays ou le prix. Par exemple, un chardonnay peut être droit et minéral ou au contraire plus ample et boisé. Un pinot noir peut être aérien et délicat, alors qu’un cabernet sauvignon sera souvent plus structuré. Ce sont ces repères qui permettent d’éviter les mauvaises surprises.

La troisième étape consiste à rester cohérent avec son budget. Un bon vin n’est pas nécessairement le plus cher de la carte. Il vaut souvent mieux chercher une bouteille bien positionnée dans une gamme moyenne et adaptée au repas, plutôt que de choisir au hasard un vin prestigieux mais mal accordé.

Enfin, il ne faut jamais hésiter à demander conseil avec une phrase simple et précise : “Je cherche un vin élégant, pas trop boisé, autour de tel budget, pour accompagner mon plat.” Cette façon de demander de l’aide permet presque toujours d’obtenir une recommandation beaucoup plus pertinente.

Bien choisir un vin au restaurant n’est donc pas une question de performance ou de connaissances encyclopédiques. C’est surtout une question de logique, d’équilibre et de style.
    `.trim(),
  },
  {
    title: "Rouge, blanc ou rosé : lequel choisir selon le repas",
    excerpt:
      "Comprendre rapidement quel type de vin privilégier selon la structure du plat, la cuisson, la sauce et l’intensité des saveurs.",
    category: "Accords",
    image: "/images/blog/rouge-blanc-rose.jpg",
    content: `
Le choix entre un vin rouge, blanc ou rosé dépend moins d’une règle rigide que de l’équilibre global du repas.

Le vin blanc est souvent un excellent choix pour les plats délicats, salins, citronnés, crémeux ou iodés. Il accompagne naturellement les poissons, les fruits de mer, plusieurs volailles, les fromages frais et certains plats végétariens. Les blancs plus minéraux donnent de la fraîcheur, tandis que les blancs plus amples et boisés peuvent soutenir des plats plus riches.

Le vin rouge s’exprime mieux avec des plats qui ont davantage de structure. Les viandes rouges, certaines sauces réduites, les plats mijotés et plusieurs champignons s’accordent très bien avec lui. Cela dit, tous les rouges ne se ressemblent pas. Certains sont légers, juteux et digestes, alors que d’autres sont plus puissants, tanniques et concentrés.

Le rosé, quant à lui, est souvent sous-estimé. Il peut être remarquable avec des plats estivaux, des grillades, des salades composées, des mets méditerranéens et même certaines cuisines épicées. C’est souvent un vin de polyvalence, particulièrement utile lorsque la table partage plusieurs assiettes.

Au fond, le bon réflexe consiste à penser en termes de poids, de fraîcheur et d’intensité. Plus le plat est léger, plus le vin peut rester vif et tendu. Plus le plat est riche, plus le vin peut gagner en texture et en structure. Ce raisonnement simple permet déjà d’améliorer énormément ses choix.
    `.trim(),
  },
  {
    title: "Comprendre les tanins sans jargon",
    excerpt:
      "Une explication claire des tanins : ce qu’ils sont, comment les reconnaître, et avec quels plats ils fonctionnent le mieux.",
    category: "Éducation",
    image: "/images/blog/comprendre-les-tanins.jpg",
    content: `
Les tanins sont souvent mentionnés dans le vin rouge, mais rarement expliqués simplement. En pratique, ce sont eux qui créent cette sensation légèrement asséchante dans la bouche, surtout sur les gencives et la langue.

On retrouve les tanins principalement dans la peau, les pépins et parfois les rafles du raisin, ainsi que dans l’élevage en bois lorsqu’il y en a un. Ils ne sont donc pas une saveur à proprement parler, mais plutôt une sensation de texture.

Un vin très tannique peut paraître plus ferme, plus sérieux, plus structuré. À l’inverse, un vin peu tannique semblera souvent plus souple, plus facile d’approche et plus fluide. Aucun des deux n’est meilleur en soi : tout dépend du plat, du contexte et du style recherché.

Les tanins aiment généralement la protéine et le gras. C’est pour cela qu’un rouge structuré fonctionne souvent mieux avec une viande rouge, un plat braisé ou un mets riche, alors qu’il peut paraître dur ou austère s’il est bu seul ou avec un plat trop léger.

Comprendre les tanins permet donc surtout de mieux anticiper l’expérience. Si l’on recherche un vin doux au toucher, on choisira souvent un rouge plus souple. Si l’on veut un vin plus construit pour accompagner un plat riche, un rouge plus tannique pourra être très pertinent.
    `.trim(),
  },
];

async function main() {
  for (const post of posts) {
    const slug = slugify(post.title);

    await prisma.blogPost.upsert({
      where: { slug },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        featured: post.featured ?? false,
        coverImage: post.image ?? null,
        published: true,
      },
      create: {
        title: post.title,
        slug,
        excerpt: post.excerpt,
        content: post.content,
        category: post.category,
        featured: post.featured ?? false,
        coverImage: post.image ?? null,
        published: true,
      },
    });

    console.log(`✅ Article seedé : ${post.title}`);
  }

  console.log("🎉 Seed des articles terminé.");
}

main()
  .catch((error) => {
    console.error("❌ Erreur seed-blog-posts:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });