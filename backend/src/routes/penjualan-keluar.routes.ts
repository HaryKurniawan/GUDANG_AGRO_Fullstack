import { Router } from 'express';
import {
  getAllPenjualanKeluar,
  getRingkasanPenjualanKeluar,
  getPenjualanKeluarById,
  createPenjualanKeluar,
  updatePenjualanKeluar,
  deletePenjualanKeluar,
} from '../controllers/penjualan-keluar.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';

const router = Router();

// Semua endpoint butuh autentikasi. Pencatatan penjualan keluar hasil tani
// diakomodir oleh Kepala Gudang (ADMIN_GUDANG / SUPER_ADMIN). Staf gudang
// dapat melihat dan mencatat, namun penghapusan dibatasi untuk kepala gudang.

const staf = requireRole(['STAF_GUDANG', 'ADMIN_GUDANG', 'SUPER_ADMIN']);
const kepalaGudang = requireRole(['ADMIN_GUDANG', 'SUPER_ADMIN']);

// Ringkasan untuk dashboard (letakkan sebelum '/:id')
router.get('/ringkasan', authMiddleware as any, staf, getRingkasanPenjualanKeluar);

router.get('/', authMiddleware as any, staf, getAllPenjualanKeluar);
router.get('/:id', authMiddleware as any, staf, getPenjualanKeluarById);

router.post('/', authMiddleware as any, staf, createPenjualanKeluar);
router.put('/:id', authMiddleware as any, staf, updatePenjualanKeluar);

// Hapus hanya untuk Kepala Gudang
router.delete('/:id', authMiddleware as any, kepalaGudang, deletePenjualanKeluar);

export default router;
