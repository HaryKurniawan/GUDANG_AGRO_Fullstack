-- CreateEnum
CREATE TYPE "JenisPembeliKeluar" AS ENUM ('PASAR', 'PENGEPUL', 'RESTORAN', 'INDIVIDU', 'LAINNYA');

-- CreateEnum
CREATE TYPE "StatusPenjualanKeluar" AS ENUM ('TERCATAT', 'LUNAS', 'BATAL');

-- CreateEnum
CREATE TYPE "ModePengemasan" AS ENUM ('DEFAULT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StatusPermintaanPengadaan" AS ENUM ('DRAFT', 'TERKIRIM', 'SEBAGIAN_TERPENUHI', 'TERPENUHI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "TahapPemrosesan" AS ENUM ('SORTIR', 'GRADING', 'PENGEMASAN', 'STOK', 'SELESAI');

-- DropForeignKey
ALTER TABLE "warehouse_receipts" DROP CONSTRAINT "warehouse_receipts_masterKomoditasId_fkey";

-- DropIndex
DROP INDEX "master_komoditas_kodeKomoditasGlobal_idx";

-- DropIndex
DROP INDEX "warehouse_receipts_kodeKomoditasGlobal_idx";

-- DropIndex
DROP INDEX "warehouse_receipts_penjemputanId_idx";

-- DropIndex
DROP INDEX "warehouse_receipts_sinkronisasiKePetani_idx";

-- AlterTable
ALTER TABLE "ecom_store_stock_requests" ADD COLUMN     "modePengemasan" "ModePengemasan" NOT NULL DEFAULT 'DEFAULT';

-- CreateTable
CREATE TABLE "warehouse_external_sales" (
    "id" TEXT NOT NULL,
    "nomorPenjualan" TEXT NOT NULL,
    "gudangId" TEXT,
    "dicatatOlehId" TEXT NOT NULL,
    "komoditasNama" TEXT NOT NULL,
    "kodeKomoditasGlobal" TEXT,
    "masterKomoditasId" TEXT,
    "penerimaanId" TEXT,
    "petaniNama" TEXT,
    "beratKg" DOUBLE PRECISION NOT NULL,
    "hargaPerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tujuanPenjualan" TEXT NOT NULL,
    "jenisPembeli" "JenisPembeliKeluar" NOT NULL DEFAULT 'LAINNYA',
    "metodePembayaran" TEXT,
    "tanggalPenjualan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    "status" "StatusPenjualanKeluar" NOT NULL DEFAULT 'TERCATAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_external_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecom_store_stock_request_item_packages" (
    "id" TEXT NOT NULL,
    "itemPengajuanStokId" TEXT NOT NULL,
    "ukuranKg" DOUBLE PRECISION NOT NULL,
    "jumlahKemasan" INTEGER NOT NULL,

    CONSTRAINT "ecom_store_stock_request_item_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_procurement_requests" (
    "id" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "kodeKomoditasGlobal" TEXT,
    "komoditasNama" TEXT NOT NULL,
    "masterProdukId" TEXT,
    "jumlahTerjualKgBulanIni" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlahTerjualKgBulanLalu" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendPersen" DOUBLE PRECISION,
    "trendArah" TEXT,
    "jumlahSellerMenjual" INTEGER NOT NULL DEFAULT 0,
    "targetKg" DOUBLE PRECISION NOT NULL,
    "hargaAcuanPerKg" DOUBLE PRECISION,
    "deadlinePanen" TEXT,
    "catatan" TEXT,
    "status" "StatusPermintaanPengadaan" NOT NULL DEFAULT 'DRAFT',
    "periode" TEXT NOT NULL,
    "tanggalDikirim" TIMESTAMP(3),
    "responsePetaniUrl" TEXT,
    "totalKomitmenKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlahKepalaPetaniRespon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_procurement_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliations_petani_gudang" (
    "id" TEXT NOT NULL,
    "petaniId" TEXT NOT NULL,
    "kepalaPetaniId" TEXT,
    "gudangId" TEXT NOT NULL,
    "petaniNama" TEXT NOT NULL DEFAULT '',
    "petaniNik" TEXT NOT NULL DEFAULT '',
    "noHp" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'petani',
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "gudangRefId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliations_petani_gudang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pemrosesan_gudang" (
    "id" TEXT NOT NULL,
    "penerimaanId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "komoditasNama" TEXT NOT NULL,
    "beratMasukKg" DOUBLE PRECISION NOT NULL,
    "tahap" "TahapPemrosesan" NOT NULL DEFAULT 'SORTIR',
    "sortirSelesai" BOOLEAN NOT NULL DEFAULT false,
    "sortirCatatan" TEXT,
    "sortirBeratBersihKg" DOUBLE PRECISION,
    "sortirRejectKg" DOUBLE PRECISION,
    "sortirOleh" TEXT,
    "sortirAt" TIMESTAMP(3),
    "gradingSelesai" BOOLEAN NOT NULL DEFAULT false,
    "gradeA_Kg" DOUBLE PRECISION,
    "gradeB_Kg" DOUBLE PRECISION,
    "gradeC_Kg" DOUBLE PRECISION,
    "gradingCatatan" TEXT,
    "gradingOleh" TEXT,
    "gradingAt" TIMESTAMP(3),
    "kemasSelesai" BOOLEAN NOT NULL DEFAULT false,
    "jumlahKemasan" INTEGER,
    "beratPerKemasan" DOUBLE PRECISION,
    "jenisKemasan" TEXT,
    "kemasCatatan" TEXT,
    "kemasOleh" TEXT,
    "kemasAt" TIMESTAMP(3),
    "masukStok" BOOLEAN NOT NULL DEFAULT false,
    "masukStokAt" TIMESTAMP(3),
    "produkGudangId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pemrosesan_gudang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_external_sales_nomorPenjualan_key" ON "warehouse_external_sales"("nomorPenjualan");

-- CreateIndex
CREATE INDEX "warehouse_external_sales_gudangId_idx" ON "warehouse_external_sales"("gudangId");

-- CreateIndex
CREATE INDEX "warehouse_external_sales_tanggalPenjualan_idx" ON "warehouse_external_sales"("tanggalPenjualan");

-- CreateIndex
CREATE UNIQUE INDEX "ecom_store_stock_request_item_packages_itemPengajuanStokId__key" ON "ecom_store_stock_request_item_packages"("itemPengajuanStokId", "ukuranKg");

-- CreateIndex
CREATE INDEX "warehouse_procurement_requests_gudangId_periode_idx" ON "warehouse_procurement_requests"("gudangId", "periode");

-- CreateIndex
CREATE INDEX "warehouse_procurement_requests_status_idx" ON "warehouse_procurement_requests"("status");

-- CreateIndex
CREATE INDEX "affiliations_petani_gudang_gudangId_status_idx" ON "affiliations_petani_gudang"("gudangId", "status");

-- CreateIndex
CREATE INDEX "affiliations_petani_gudang_petaniId_idx" ON "affiliations_petani_gudang"("petaniId");

-- CreateIndex
CREATE UNIQUE INDEX "affiliations_petani_gudang_petaniId_gudangId_key" ON "affiliations_petani_gudang"("petaniId", "gudangId");

-- CreateIndex
CREATE INDEX "pemrosesan_gudang_gudangId_tahap_idx" ON "pemrosesan_gudang"("gudangId", "tahap");

-- CreateIndex
CREATE INDEX "pemrosesan_gudang_penerimaanId_idx" ON "pemrosesan_gudang"("penerimaanId");

-- AddForeignKey
ALTER TABLE "warehouse_external_sales" ADD CONSTRAINT "warehouse_external_sales_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_external_sales" ADD CONSTRAINT "warehouse_external_sales_dicatatOlehId_fkey" FOREIGN KEY ("dicatatOlehId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_external_sales" ADD CONSTRAINT "warehouse_external_sales_masterKomoditasId_fkey" FOREIGN KEY ("masterKomoditasId") REFERENCES "master_komoditas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecom_store_stock_request_item_packages" ADD CONSTRAINT "ecom_store_stock_request_item_packages_itemPengajuanStokId_fkey" FOREIGN KEY ("itemPengajuanStokId") REFERENCES "ecom_store_stock_request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_procurement_requests" ADD CONSTRAINT "warehouse_procurement_requests_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliations_petani_gudang" ADD CONSTRAINT "affiliations_petani_gudang_gudangRefId_fkey" FOREIGN KEY ("gudangRefId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pemrosesan_gudang" ADD CONSTRAINT "pemrosesan_gudang_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
