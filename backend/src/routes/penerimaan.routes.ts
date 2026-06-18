import { Router } from 'express';
import {
  getAllPenerimaan,
  getPenerimaanById,
  createPenerimaan,
  addGrading,
  selesaikanPenerimaan,
  intakeDariPetani,
  terimaIntake,
  ditimbangIntake,
  uploadBuktiPembayaran,
} from '../controllers/penerimaan.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Non-parameterized routes FIRST (must come before /:id routes)
router.post('/intake-dari-petani', intakeDariPetani);

// Parameterized routes after
router.get('/', getAllPenerimaan);
router.post('/', authMiddleware, createPenerimaan);
router.get('/:id', getPenerimaanById);
router.post('/:id/grading', authMiddleware, addGrading);
router.post('/:id/selesaikan', authMiddleware, selesaikanPenerimaan);
router.post('/:id/terima', authMiddleware, terimaIntake);
router.post('/:id/ditimbang', authMiddleware, ditimbangIntake);
router.post('/:id/bukti-pembayaran', authMiddleware, uploadBuktiPembayaran);

export default router;
