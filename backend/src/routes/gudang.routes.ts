import { Router, Request, Response, NextFunction } from 'express';
import {
  getAllActiveWarehouses,
  getMyWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  createKepalGudang,
} from '../controllers/gudang.controller';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// 1. Get all active warehouses (public or with API Key or JWT)
// This endpoint accepts:
// - No auth (public)
// - API Key in x-api-key header
// - JWT token in Authorization header
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  // If API Key is present, skip JWT authentication
  if (req.headers['x-api-key']) {
    return next();
  }
  
  // If Authorization header exists, authenticate with JWT
  if (req.headers.authorization) {
    return (authMiddleware as any)(req, res, next);
  }
  
  // Otherwise, continue without auth (public access)
  return next();
}, getAllActiveWarehouses as any);

// 2. Get specific warehouse by ID (public or with API Key or JWT)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  // If API Key is present, skip JWT authentication
  if (req.headers['x-api-key']) {
    return next();
  }
  
  // If Authorization header exists, authenticate with JWT
  if (req.headers.authorization) {
    return (authMiddleware as any)(req, res, next);
  }
  
  // Otherwise, continue without auth (public access)
  return next();
}, getWarehouseById as any);

// ─── Admin Routes ───────────────────────────────────────────────────────────
// POST /api/gudang/admin  — create new gudang
router.post(
  '/admin',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  createWarehouse as any
);

// POST /api/gudang/admin/kepala-gudang — create kepala gudang account
router.post(
  '/admin/kepala-gudang',
  authMiddleware as any,
  requireRole(['SUPER_ADMIN']),
  createKepalGudang as any
);

// GET /api/gudang/admin/my
router.get(
  '/admin/my',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  getMyWarehouses as any
);

// PATCH /api/gudang/admin/:id
router.patch(
  '/admin/:id',
  authMiddleware as any,
  requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']),
  updateWarehouse as any
);

export default router;
