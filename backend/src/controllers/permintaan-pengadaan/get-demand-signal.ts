import { Response } from 'express';
import axios from 'axios';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const ECOMMERCE_URL = process.env.ECOMMERCE_BACKEND_URL || 'http://127.0.0.1:4000';
const ECOMMERCE_API_KEY = process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key';

export const getDemandSignal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId, month, year, limit } = req.query;

    if (!gudangId) {
      return res.status(400).json({ error: 'gudangId wajib diisi' });
    }

    const params = new URLSearchParams();
    params.set('gudangId', gudangId as string);
    if (month) params.set('month', month as string);
    if (year) params.set('year', year as string);
    if (limit) params.set('limit', limit as string);

    const response = await axios.get(
      `${ECOMMERCE_URL}/api/analytics/demand-signal/gudang?${params.toString()}`,
      {
        headers: { 'x-api-key': ECOMMERCE_API_KEY },
        timeout: 10000,
      }
    );

    return res.json(response.data);
  } catch (error: unknown) {
    console.error('[demand-signal] Error:', (error as Error).message);
    if ((error as NodeJS.ErrnoException).code === 'ECONNREFUSED') {
      return res.status(503).json({ error: 'ECOMMERCE service tidak dapat dihubungi' });
    }
    return res.status(500).json({ error: (error as Error).message });
  }
};
