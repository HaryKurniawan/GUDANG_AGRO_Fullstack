-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('SUPER_ADMIN', 'ADMIN_GUDANG', 'STAF_GUDANG');

-- CreateEnum
CREATE TYPE "TipeGudang" AS ENUM ('PUSAT', 'REGIONAL', 'COLLECTION');

-- CreateEnum
CREATE TYPE "StatusGudang" AS ENUM ('ACTIVE', 'INACTIVE', 'FULL', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "StatusLink" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "StatusPenerimaan" AS ENUM ('RECEIVED', 'VERIFIED', 'STOCKED');

-- CreateEnum
CREATE TYPE "StatusPekerjaanBooking" AS ENUM ('ANTRI', 'DIPROSES', 'QC_CHECK', 'PACKAGING', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusPengajuanStok" AS ENUM ('DIAJUKAN', 'DIPROSES', 'DIKIRIM', 'SELESAI', 'DITOLAK');

-- CreateTable
CREATE TABLE "pengguna" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kataSandi" TEXT NOT NULL,
    "nama" TEXT,
    "noTelepon" TEXT,
    "peran" "Peran" NOT NULL DEFAULT 'STAF_GUDANG',
    "emailTerverifikasiPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeGudang" NOT NULL DEFAULT 'REGIONAL',
    "alamat" TEXT NOT NULL,
    "kabupaten" TEXT NOT NULL,
    "provinsi" TEXT NOT NULL DEFAULT 'Jawa Barat',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "kapasitasKg" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "kapasitasTerpakai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "penanggungJawabId" TEXT,
    "telepon" TEXT,
    "email" TEXT,
    "jamOperasional" TEXT,
    "fotoUrl" TEXT,
    "status" "StatusGudang" NOT NULL DEFAULT 'ACTIVE',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_store_links" (
    "id" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "tokoNama" TEXT,
    "tokoSlug" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "StatusLink" NOT NULL DEFAULT 'PENDING',
    "kontrakMulai" TIMESTAMP(3),
    "kontrakAkhir" TIMESTAMP(3),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_store_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_zones" (
    "id" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "namaZona" TEXT NOT NULL,
    "kabupaten" TEXT NOT NULL,
    "kecamatan" TEXT,
    "radiusKm" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "prioritas" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_receipts" (
    "id" TEXT NOT NULL,
    "nomorPenerimaan" TEXT NOT NULL,
    "penjemputanId" TEXT NOT NULL,
    "penerimaId" TEXT NOT NULL,
    "gudangId" TEXT,
    "beratDiterimaKg" DOUBLE PRECISION NOT NULL,
    "kondisi" TEXT NOT NULL DEFAULT 'BAIK',
    "totalNilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "StatusPenerimaan" NOT NULL DEFAULT 'RECEIVED',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_gradings" (
    "id" TEXT NOT NULL,
    "penerimaanId" TEXT NOT NULL,
    "namaGrade" TEXT NOT NULL,
    "beratKg" DOUBLE PRECISION NOT NULL,
    "hargaPerKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalNilai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "produkTerhubungId" TEXT,
    "isReject" BOOLEAN NOT NULL DEFAULT false,
    "alasanReject" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_gradings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_job_booking" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "spesifikasi" TEXT,
    "gradeTarget" TEXT,
    "jumlahInputKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlahOutputKgA" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlahOutputKgB" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlahOutputKgC" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jumlahRejectKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetSelesaiPada" TIMESTAMP(3),
    "masukPada" TIMESTAMP(3),
    "selesaiPada" TIMESTAMP(3),
    "status" "StatusPekerjaanBooking" NOT NULL DEFAULT 'ANTRI',
    "catatanStaff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_job_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecom_store_stock_requests" (
    "id" TEXT NOT NULL,
    "tokoId" TEXT NOT NULL,
    "tokoNama" TEXT,
    "gudangId" TEXT NOT NULL,
    "status" "StatusPengajuanStok" NOT NULL DEFAULT 'DIAJUKAN',
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ecom_store_stock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ecom_store_stock_request_items" (
    "id" TEXT NOT NULL,
    "pengajuanId" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "produkNama" TEXT,
    "jumlahPermintaan" DOUBLE PRECISION NOT NULL,
    "jumlahDisetujui" DOUBLE PRECISION,
    "hargaPerUnit" DOUBLE PRECISION,
    "totalHarga" DOUBLE PRECISION,

    CONSTRAINT "ecom_store_stock_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouse_products" (
    "id" TEXT NOT NULL,
    "gudangId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "satuan" TEXT NOT NULL DEFAULT 'kg',
    "hargaGudang" DOUBLE PRECISION NOT NULL,
    "gambarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pengguna_email_key" ON "pengguna"("email");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_kode_key" ON "warehouses"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_store_links_gudangId_tokoId_key" ON "warehouse_store_links"("gudangId", "tokoId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_receipts_nomorPenerimaan_key" ON "warehouse_receipts"("nomorPenerimaan");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_receipts_penjemputanId_key" ON "warehouse_receipts"("penjemputanId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_job_booking_bookingId_key" ON "warehouse_job_booking"("bookingId");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_penanggungJawabId_fkey" FOREIGN KEY ("penanggungJawabId") REFERENCES "pengguna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_store_links" ADD CONSTRAINT "warehouse_store_links_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_penerimaId_fkey" FOREIGN KEY ("penerimaId") REFERENCES "pengguna"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_gradings" ADD CONSTRAINT "receipt_gradings_penerimaanId_fkey" FOREIGN KEY ("penerimaanId") REFERENCES "warehouse_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_job_booking" ADD CONSTRAINT "warehouse_job_booking_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecom_store_stock_requests" ADD CONSTRAINT "ecom_store_stock_requests_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ecom_store_stock_request_items" ADD CONSTRAINT "ecom_store_stock_request_items_pengajuanId_fkey" FOREIGN KEY ("pengajuanId") REFERENCES "ecom_store_stock_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_products" ADD CONSTRAINT "warehouse_products_gudangId_fkey" FOREIGN KEY ("gudangId") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
