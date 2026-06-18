import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { GudangClient, gudangClients, addGudangClient, removeGudangClient } from './store';

// 1. Warehouse Admin SSE registration
export const registerGudangClient = (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Tidak terautentikasi' });
    }

    // Set headers for SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Flush headers to establish connection
    res.write('data: {"type": "CONNECTED", "message": "Koneksi SSE Gudang Terjalin"}\n\n');

    const client: GudangClient = {
      userId: req.user.id,
      managedWarehouses: req.user.managedWarehouses,
      res,
    };

    addGudangClient(client);
    console.log(`[SSE-Gudang] Admin ${req.user.id} terhubung. Total client: ${gudangClients.length}`);

    // Heartbeat to keep connection alive (every 30s)
    const interval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
      clearInterval(interval);
      removeGudangClient(res);
      console.log(`[SSE-Gudang] Admin ${req.user!.id} terputus. Total client: ${gudangClients.length}`);
    });
  } catch (error) {
    console.error('Error during SSE registration:', error);
  }
};
