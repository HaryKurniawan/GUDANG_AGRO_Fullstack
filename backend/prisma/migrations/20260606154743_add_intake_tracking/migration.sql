-- AlterTable
ALTER TABLE "warehouse_receipts" ADD COLUMN     "beratAsliKg" DOUBLE PRECISION,
ADD COLUMN     "buktiPembayaranUrl" TEXT,
ADD COLUMN     "ditimbangAt" TIMESTAMP(3),
ADD COLUMN     "estimasiTanggalPanen" TEXT,
ADD COLUMN     "intakeStatus" TEXT NOT NULL DEFAULT 'menunggu_penerimaan',
ADD COLUMN     "komitmenPetaniId" TEXT,
ADD COLUMN     "permintaanPengadaanId" TEXT,
ADD COLUMN     "petaniId" TEXT,
ADD COLUMN     "sanggupKg" DOUBLE PRECISION,
ADD COLUMN     "terimaAt" TIMESTAMP(3),
ADD COLUMN     "uploadBuktiAt" TIMESTAMP(3);
