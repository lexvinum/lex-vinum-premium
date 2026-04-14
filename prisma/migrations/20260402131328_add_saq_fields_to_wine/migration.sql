/*
  Warnings:

  - A unique constraint covering the columns `[saqCode]` on the table `Wine` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Wine" ADD COLUMN     "alcohol" TEXT,
ADD COLUMN     "appellationOrigine" TEXT,
ADD COLUMN     "bioType" TEXT,
ADD COLUMN     "dataSource" TEXT DEFAULT 'manual',
ADD COLUMN     "designationReglementee" TEXT,
ADD COLUMN     "formatMl" INTEGER,
ADD COLUMN     "natureType" TEXT,
ADD COLUMN     "oak" TEXT,
ADD COLUMN     "palate" TEXT,
ADD COLUMN     "saqCode" TEXT,
ADD COLUMN     "sourceFile" TEXT,
ADD COLUMN     "sugar" TEXT,
ADD COLUMN     "tauxSucre" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Wine_saqCode_key" ON "Wine"("saqCode");

-- CreateIndex
CREATE INDEX "Wine_country_idx" ON "Wine"("country");

-- CreateIndex
CREATE INDEX "Wine_region_idx" ON "Wine"("region");

-- CreateIndex
CREATE INDEX "Wine_color_idx" ON "Wine"("color");

-- CreateIndex
CREATE INDEX "Wine_isQuebec_idx" ON "Wine"("isQuebec");

-- CreateIndex
CREATE INDEX "Wine_featured_idx" ON "Wine"("featured");

-- CreateIndex
CREATE INDEX "Wine_dataSource_idx" ON "Wine"("dataSource");

-- CreateIndex
CREATE INDEX "Wine_saqCode_idx" ON "Wine"("saqCode");
