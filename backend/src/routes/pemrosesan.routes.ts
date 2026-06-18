import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getRingkasan,
  getByTahap,
  getById,
  createFromPenerimaan,
  completeSortir,
  completeGrading,
  completePengemasan,
  masukStok,
} from '../controllers/pemrosesan.controller';

const router = Router();

router.get('/ringkasan', authMiddleware as any, getRingkasan as any);
router.get('/', authMiddleware as any, getByTahap as any);
router.get('/:id', authMiddleware as any, getById as any);
router.post('/', authMiddleware as any, createFromPenerimaan as any);
router.patch('/:id/sortir', authMiddleware as any, completeSortir as any);
router.patch('/:id/grading', authMiddleware as any, completeGrading as any);
router.patch('/:id/kemas', authMiddleware as any, completePengemasan as any);
router.patch('/:id/masuk-stok', authMiddleware as any, masukStok as any);

export default router;
