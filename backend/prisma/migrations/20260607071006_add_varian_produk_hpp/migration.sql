-- AlterTable
ALTER TABLE "warehouse_products" ADD COLUMN     "varianProduk" TEXT;

-- CreateTable
CREATE TABLE "hpp_produk" (
    "id" TEXT NOT NULL,
    "produkGudangId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "hargaBeliPetani" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaSortir" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaGrading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaPengemasan" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaOverhead" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biayaLainnya" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalHpp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hargaJual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginRp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "marginPersen" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hpp_produk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hpp_produk_produkGudangId_key" ON "hpp_produk"("produkGudangId");

-- CreateIndex
CREATE INDEX "hpp_produk_gudangId_idx" ON "hpp_produk"("gudangId");

-- AddForeignKey
ALTER TABLE "hpp_produk" ADD CONSTRAINT "hpp_produk_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
