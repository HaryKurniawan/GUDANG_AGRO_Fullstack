import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { SellerClient, sellerClients, addSellerClient, removeSellerClient } from './store';

// 2. Seller SSE registration (Express backend will serve this endpoint, or ECOMMERCE backend can call it)
export const registerSellerClient = (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sellerId } = req.query;

    if (!sellerId) {
      return res.status(400).json({ message: 'Seller ID wajib dicantumkan' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.write('data: {"type": "CONNECTED", "message": "Koneksi SSE Seller Terjalin"}\n\n');

    const client: SellerClient = {
      sellerId: sellerId as string,
      res,
    };

    addSellerClient(client);
    console.log(`[SSE-Seller] Seller ${sellerId} terhubung. Total client: ${sellerClients.length}`);

    const interval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(interval);
      removeSellerClient(res);
      console.log(`[SSE-Seller] Seller ${sellerId} terputus. Total client: ${sellerClients.length}`);
    });
  } catch (error) {
    console.error('Error during SSE seller registration:', error);
  }
};
