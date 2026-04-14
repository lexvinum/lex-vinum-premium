-- CreateTable
CREATE TABLE "Wine" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "producer" TEXT,
    "country" TEXT,
    "region" TEXT,
    "grape" TEXT,
    "color" TEXT,
    "style" TEXT,
    "price" DOUBLE PRECISION,
    "vintage" TEXT,
    "image" TEXT,
    "aromasJson" TEXT,
    "tagsJson" TEXT,
    "description" TEXT,
    "isQuebec" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "body" TEXT,
    "acidity" TEXT,
    "tannin" TEXT,
    "minerality" TEXT,
    "pairingJson" TEXT,
    "serving" TEXT,
    "temperature" TEXT,
    "cellar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CellarBottle" (
    "id" TEXT NOT NULL,
    "wineId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasePrice" DOUBLE PRECISION,
    "purchaseDate" TIMESTAMP(3),
    "location" TEXT,
    "drinkingWindow" TEXT,
    "personalNote" TEXT,
    "rating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CellarBottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wine_slug_key" ON "Wine"("slug");

-- CreateIndex
CREATE INDEX "CellarBottle_wineId_idx" ON "CellarBottle"("wineId");

-- AddForeignKey
ALTER TABLE "CellarBottle" ADD CONSTRAINT "CellarBottle_wineId_fkey" FOREIGN KEY ("wineId") REFERENCES "Wine"("id") ON DELETE CASCADE ON UPDATE CASCADE;
