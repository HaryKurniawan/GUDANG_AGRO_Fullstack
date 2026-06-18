-- Add kodeKomoditasGlobal to MasterKomoditas
ALTER TABLE "master_komoditas" ADD COLUMN "kodeKomoditasGlobal" TEXT UNIQUE;

-- Add snapshot metadata and sync fields to PenerimaanGudang
ALTER TABLE "warehouse_receipts" ADD COLUMN "petaniNama" TEXT,
ADD COLUMN "komoditasNama" TEXT,
ADD COLUMN "kodeKomoditasGlobal" TEXT,
ADD COLUMN "masterKomoditasId" TEXT,
ADD COLUMN "sinkronisasiKePetani" TEXT;

-- Add FK constraint (with onDelete: SetNull so we don't break if MasterKomoditas is deleted)
ALTER TABLE "warehouse_receipts" 
ADD CONSTRAINT "warehouse_receipts_masterKomoditasId_fkey" 
FOREIGN KEY ("masterKomoditasId") REFERENCES "master_komoditas"("id") ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX "warehouse_receipts_penjemputanId_idx" ON "warehouse_receipts"("penjemputanId");
CREATE INDEX "warehouse_receipts_kodeKomoditasGlobal_idx" ON "warehouse_receipts"("kodeKomoditasGlobal");
CREATE INDEX "warehouse_receipts_sinkronisasiKePetani_idx" ON "warehouse_receipts"("sinkronisasiKePetani");
CREATE INDEX "master_komoditas_kodeKomoditasGlobal_idx" ON "master_komoditas"("kodeKomoditasGlobal");
