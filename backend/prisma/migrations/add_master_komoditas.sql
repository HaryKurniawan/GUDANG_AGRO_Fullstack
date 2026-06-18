-- Migration: Add Master Komoditas System
-- Date: 2026-05-24
-- Description: Add MasterKomoditas table and update ProdukGudang to link to it

-- Step 1: Create MasterKomoditas table
CREATE TABLE "master_komoditas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL UNIQUE,
    "kategori" TEXT,
    "satuan" TEXT NOT NULL DEFAULT 'kg',
    "deskripsi" TEXT,
    "gambarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Step 2: Add masterKomoditasId column to warehouse_products (nullable for now)
ALTER TABLE "warehouse_products" 
ADD COLUMN "masterKomoditasId" TEXT,
ADD COLUMN "stok" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Step 3: Add foreign key constraint
ALTER TABLE "warehouse_products" 
ADD CONSTRAINT "warehouse_products_masterKomoditasId_fkey" 
FOREIGN KEY ("masterKomoditasId") 
REFERENCES "master_komoditas"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Step 4: Create index for better query performance
CREATE INDEX "warehouse_products_masterKomoditasId_idx" ON "warehouse_products"("masterKomoditasId");
CREATE INDEX "master_komoditas_nama_idx" ON "master_komoditas"("nama");
CREATE INDEX "master_komoditas_kategori_idx" ON "master_komoditas"("kategori");

-- Step 5: Seed initial Master Komoditas from existing unique product names
-- This will be done via seed script, not in migration
