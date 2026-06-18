-- Add intake tracking fields to PenerimaanGudang
-- For tracking farmer intake at warehouse with status, weighing, and payment proof

ALTER TABLE warehouse_receipts 
ADD COLUMN permintaanPengadaanId VARCHAR(36),
ADD COLUMN komitmenPetaniId VARCHAR(36),
ADD COLUMN petaniId VARCHAR(36),
ADD COLUMN sanggupKg DOUBLE PRECISION,
ADD COLUMN estimasiTanggalPanen VARCHAR(10),
ADD COLUMN intakeStatus VARCHAR(50) DEFAULT 'menunggu_penerimaan',
ADD COLUMN terimaAt TIMESTAMP,
ADD COLUMN ditimbangAt TIMESTAMP,
ADD COLUMN beratAsliKg DOUBLE PRECISION,
ADD COLUMN buktiPembayaranUrl TEXT,
ADD COLUMN uploadBuktiAt TIMESTAMP;

-- Create index for easier querying
CREATE INDEX idx_penerimaan_intake_status ON warehouse_receipts(intakeStatus);
CREATE INDEX idx_penerimaan_petani_id ON warehouse_receipts(petaniId);
CREATE INDEX idx_penerimaan_permintaan_id ON warehouse_receipts(permintaanPengadaanId);
