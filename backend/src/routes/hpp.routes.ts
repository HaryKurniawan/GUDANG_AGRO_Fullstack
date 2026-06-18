import express from 'express';
import { getHppList, getHppByProduk, upsertHpp, getLaporanHpp } from '../controllers/hpp.controller';

const router = express.Router();

router.get('/', getHppList);
router.get('/laporan', getLaporanHpp);
router.get('/:produkGudangId', getHppByProduk);
router.post('/', upsertHpp);

export default router;
