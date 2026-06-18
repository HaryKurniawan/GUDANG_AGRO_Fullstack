import { Router } from 'express';
import {
  getStockRequests,
  getStockRequestById,
  updateStockRequestStatus,
  createStockRequestFromEcommerce,
} from '../controllers/pengajuan.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleGuard } from '../middleware/role.middleware';
import { apiKeyMiddleware } from '../middleware/api-key.middleware';

const router = Router();

// Retrieve all stock requests sent to warehouses managed by the logged-in admin
router.get(
  '/',
  authMiddleware as any,
  roleGuard(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']) as any,
  getStockRequests as any
);

// Retrieve details of a specific stock request
router.get(
  '/:id',
  authMiddleware as any,
  roleGuard(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']) as any,
  getStockRequestById as any
);

// Update status & approve items in a stock request
router.patch(
  '/:id/status',
  authMiddleware as any,
  roleGuard(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']) as any,
  updateStockRequestStatus as any
);

// Webhook: Receive pengajuan stok from ECOMMERCE backend
router.post(
  '/webhook/from-ecommerce',
  apiKeyMiddleware as any,
  createStockRequestFromEcommerce as any
);

export default router;
