import express from 'express';
import {
  getAllMasterVarian,
  getActiveMasterVarian,
  createMasterVarian,
  updateMasterVarian,
  deleteMasterVarian,
  createPengajuanVarian,
  getMyPengajuanVarian,
  getAllPengajuanVarian,
  approvePengajuanVarian,
  rejectPengajuanVarian,
} from '../controllers/varian.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = express.Router();

// ─── Master Varian: dropdown aktif (ADMIN_GUDANG & SUPER_ADMIN) ──────────────
router.get(
  '/master/active',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  getActiveMasterVarian as any,
);

// ─── Master Varian: full CRUD (SUPER_ADMIN only) ─────────────────────────────
router.get(
  '/master',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  getAllMasterVarian as any,
);
router.post(
  '/master',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  createMasterVarian as any,
);
router.put(
  '/master/:id',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  updateMasterVarian as any,
);
router.delete(
  '/master/:id',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  deleteMasterVarian as any,
);

// ─── Pengajuan Varian: Kepala Gudang ─────────────────────────────────────────
router.post(
  '/pengajuan',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  createPengajuanVarian as any,
);
router.get(
  '/pengajuan/saya',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  getMyPengajuanVarian as any,
);

// ─── Pengajuan Varian: SUPER_ADMIN review ────────────────────────────────────
router.get(
  '/pengajuan',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  getAllPengajuanVarian as any,
);
router.patch(
  '/pengajuan/:id/approve',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  approvePengajuanVarian as any,
);
router.patch(
  '/pengajuan/:id/reject',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  rejectPengajuanVarian as any,
);

export default router;
