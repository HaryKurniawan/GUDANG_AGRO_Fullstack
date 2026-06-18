import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  getProdukGudang,
  createProdukGudang,
  updateProdukGudang,
  deleteProdukGudang,
  getProdukKatalog,
  getProdukForAffiliate,
} from '../controllers/produk.controller';

const router = Router();

// Public endpoint for sellers to view product catalog (no stock info)
// This is used when creating stock requests
router.get('/katalog', getProdukKatalog as any);

// Endpoint for AFFILIATED sellers to view products WITH stock info
// Requires tokoId and gudangId, verifies affiliation
router.get('/affiliate', getProdukForAffiliate as any);

// ─── Staf Routes (Read-Only) ────────────────────────────────────────────────
// Staf gudang hanya dapat MELIHAT produk. Pembuatan/perubahan/penghapusan
// produk & varian hanya boleh dilakukan oleh ADMIN_GUDANG / SUPER_ADMIN.
// GET /api/produk/staf
router.get(
  '/staf',
  authMiddleware as any,
  requireRole(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']),
  getProdukGudang as any
);

// POST /api/produk/staf — hanya admin gudang
router.post(
  '/staf',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  createProdukGudang as any
);

// PATCH /api/produk/staf/:id — hanya admin gudang
router.patch(
  '/staf/:id',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  updateProdukGudang as any
);

// DELETE /api/produk/staf/:id — hanya admin gudang
router.delete(
  '/staf/:id',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  deleteProdukGudang as any
);

// ─── Admin Routes (Full CRUD) ────────────────────────────────────────────────
// GET /api/produk/admin
router.get(
  '/admin',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  getProdukGudang as any
);

// POST /api/produk/admin
router.post(
  '/admin',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  createProdukGudang as any
);

// PATCH /api/produk/admin/:id
router.patch(
  '/admin/:id',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  updateProdukGudang as any
);

// DELETE /api/produk/admin/:id
router.delete(
  '/admin/:id',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  deleteProdukGudang as any
);

export default router;
