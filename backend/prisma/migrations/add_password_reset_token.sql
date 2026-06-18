-- Migration: Tambah field untuk password reset token pada tabel pengguna
-- Dijalankan secara manual: psql $DATABASE_URL -f prisma/migrations/add_password_reset_token.sql

ALTER TABLE "pengguna"
  ADD COLUMN IF NOT EXISTS "resetPasswordToken" TEXT,
  ADD COLUMN IF NOT EXISTS "resetPasswordExpiry" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "pengguna_resetPasswordToken_idx" ON "pengguna" ("resetPasswordToken");
