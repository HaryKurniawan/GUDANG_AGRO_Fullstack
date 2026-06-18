-- Migration: Tambah field varianProduk ke ProdukGudang
-- Tujuan: Mendukung produk olahan seperti "Wortel Frozen", "Wortel Segar Premium"
--         sambil tetap mempertahankan link ke MasterKomoditas (Wortel)

ALTER TABLE "warehouse_products"
ADD COLUMN IF NOT EXISTS "varianProduk" TEXT;

-- Contoh data setelah migrasi:
-- nama = "Wortel" (dari master, tidak berubah)
-- varianProduk = "Frozen" (opsional, diisi gudang)
-- Nama tampil ke seller = "Wortel Frozen"
