import { Router } from 'express';
import { getHargaPetani, getHistoriHargaPetani } from '../controllers/harga-petani.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getHargaPetani);
router.get('/histori', getHistoriHargaPetani);

export default router;
