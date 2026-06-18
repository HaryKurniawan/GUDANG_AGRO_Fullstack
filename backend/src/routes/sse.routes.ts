import { Router } from 'express';
import {
  registerGudangClient,
  registerSellerClient,
  triggerNewRequestEvent,
} from '../controllers/sse.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Warehouse Admin connects here to listen for new requests
router.get('/pengajuan', authMiddleware as any, registerGudangClient as any);

// Seller connects here to listen to updates from Gudang
router.get('/seller', registerSellerClient as any);

// Ecommerce NestJS backend calls this to trigger "NEW_REQUEST" event for warehouse admins
router.post('/trigger-new-request', triggerNewRequestEvent);

export default router;
