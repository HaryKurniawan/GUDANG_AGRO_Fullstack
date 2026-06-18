import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  getDemandSignal,
  listPermintaanPengadaan,
  createPermintaanPengadaan,
  updatePermintaanPengadaan,
  kirimPermintaanKePetani,
  updateKomitmenFromPetani,
} from '../controllers/permintaan-pengadaan.controller';

const router = Router();

// Role definitions
const staf = requireRole(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']);
const kepalaGudang = requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']);

// 1. Demand signal dari ECOMMERCE (semua role bisa lihat)
router.get(
  '/demand-signal',
  authMiddleware as any,
  staf,
  getDemandSignal as any
);

// 2. List permintaan pengadaan (semua role bisa lihat)
router.get(
  '/',
  authMiddleware as any,
  staf,
  listPermintaanPengadaan as any
);

// 3. Buat permintaan baru (hanya Kepala Gudang)
router.post(
  '/',
  authMiddleware as any,
  kepalaGudang,
  createPermintaanPengadaan as any
);

// 4. Edit permintaan (hanya DRAFT) - only kepala gudang
router.patch(
  '/:id',
  authMiddleware as any,
  kepalaGudang,
  updatePermintaanPengadaan as any
);

// 5. Kirim ke PETANI (hanya Kepala Gudang)
router.post(
  '/:id/kirim',
  authMiddleware as any,
  kepalaGudang,
  kirimPermintaanKePetani as any
);

// 6. Webhook callback dari PETANI service (no auth — verified by API Key at app level)
router.post('/:id/komitmen', updateKomitmenFromPetani as any);

export default router;
