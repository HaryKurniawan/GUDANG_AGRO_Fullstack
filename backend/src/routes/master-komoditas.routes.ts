import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  getAllMasterKomoditas,
  getPublicMasterKomoditas,
  createMasterKomoditas,
  updateMasterKomoditas,
  deleteMasterKomoditas,
  toggleMasterKomoditasStatus,
} from '../controllers/master-komoditas.controller';

const router = Router();

// ─── Public (no auth) ────────────────────────────────────────────────────────
// GET /api/master-komoditas/public/all — dipakai oleh ecommerce proxy
router.get('/public/all', getPublicMasterKomoditas as any);

// ─── Admin (auth required, SUPER_ADMIN only) ─────────────────────────────────
// GET /api/master-komoditas/admin
router.get(
  '/admin',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  getAllMasterKomoditas as any
);

// POST /api/master-komoditas/admin
router.post(
  '/admin',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  createMasterKomoditas as any
);

// PUT /api/master-komoditas/admin/:id
router.put(
  '/admin/:id',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  updateMasterKomoditas as any
);

// PATCH /api/master-komoditas/admin/:id/status
router.patch(
  '/admin/:id/status',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  toggleMasterKomoditasStatus as any
);

// DELETE /api/master-komoditas/admin/:id
router.delete(
  '/admin/:id',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  deleteMasterKomoditas as any
);

export default router;
