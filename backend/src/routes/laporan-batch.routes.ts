import express from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getLaporanBatch, getLaporanBatchDetail, getStafInfo } from '../controllers/laporan-batch.controller';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

router.get('/batch', getLaporanBatch);
router.get('/batch/:penerimaanId', getLaporanBatchDetail);
router.get('/staf-info', getStafInfo);

export default router;
