-- AlterTable
ALTER TABLE "ecom_store_stock_request_items" ADD COLUMN     "jumlahKemasan" INTEGER,
ADD COLUMN     "totalKg" DOUBLE PRECISION,
ADD COLUMN     "ukuranKemasanKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "warehouse_product_packaging" (
    "id" TEXT NOT NULL,
    "produkGudangId" TEXT NOT NULL,
    "ukuranKg" DOUBLE PRECISION NOT NULL,
    "stokKemasan" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_product_packaging_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_product_packaging_produkGudangId_ukuranKg_key" ON "warehouse_product_packaging"("produkGudangId", "ukuranKg");

-- AddForeignKey
ALTER TABLE "warehouse_product_packaging" ADD CONSTRAINT "warehouse_product_packaging_produkGudangId_fkey" FOREIGN KEY ("produkGudangId") REFERENCES "warehouse_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
