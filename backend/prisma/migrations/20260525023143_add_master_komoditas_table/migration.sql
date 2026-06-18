-- AlterEnum
ALTER TYPE "StatusPengajuanStok" ADD VALUE 'KONFIRMASI_DITERIMA';

-- AlterTable
ALTER TABLE "warehouse_products" ADD COLUMN     "masterKomoditasId" TEXT,
ADD COLUMN     "stok" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "master_komoditas" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kategori" TEXT,
    "satuan" TEXT NOT NULL DEFAULT 'kg',
    "deskripsi" TEXT,
    "gambarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "master_komoditas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_komoditas_nama_key" ON "master_komoditas"("nama");

-- AddForeignKey
ALTER TABLE "warehouse_products" ADD CONSTRAINT "warehouse_products_masterKomoditasId_fkey" FOREIGN KEY ("masterKomoditasId") REFERENCES "master_komoditas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
