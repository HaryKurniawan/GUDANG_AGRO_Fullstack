import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import {
  getKemasanConfig,
  kemaskanProduk,
  bongkarKemasan
} from '../controllers/kemasan.controller';

const router = Router();

// GET /api/kemasan/:produkGudangId - Get packaging configuration for a product
router.get(
  '/:produkGudangId',
  authMiddleware as any,
  getKemasanConfig as any
);

// POST /api/kemasan/kemaskan - Pack bulk stock into bags
router.post(
  '/kemaskan',
  authMiddleware as any,
  requireRole(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']),
  kemaskanProduk as any
);

// POST /api/kemasan/bongkar - Unpack bags back to bulk
router.post(
  '/bongkar',
  authMiddleware as any,
  requireRole(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']),
  bongkarKemasan as any
);

export default router;
