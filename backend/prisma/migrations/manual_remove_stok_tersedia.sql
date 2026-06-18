-- Manual migration to remove stokTersedia column from warehouse_products table
-- This is a breaking change - stok will be managed separately

ALTER TABLE "warehouse_products" DROP COLUMN IF EXISTS "stokTersedia";
