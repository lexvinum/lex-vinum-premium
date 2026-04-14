-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "originLabel" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "vineyardId" TEXT;

-- CreateTable
CREATE TABLE "Vineyard" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT,
    "region" TEXT,
    "province" TEXT,
    "city" TEXT,
    "address" TEXT,
    "postalCode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "placeId" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "image" TEXT,
    "isQuebec" BOOLEAN NOT NULL DEFAULT false,
    "isActiveVisit" BOOLEAN NOT NULL DEFAULT true,
    "tastingOffered" BOOLEAN NOT NULL DEFAULT false,
    "lodgingOffered" BOOLEAN NOT NULL DEFAULT false,
    "restaurantOnSite" BOOLEAN NOT NULL DEFAULT false,
    "routesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vineyard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vineyard_slug_key" ON "Vineyard"("slug");

-- AddForeignKey
ALTER TABLE "Wine" ADD CONSTRAINT "Wine_vineyardId_fkey" FOREIGN KEY ("vineyardId") REFERENCES "Vineyard"("id") ON DELETE SET NULL ON UPDATE CASCADE;
