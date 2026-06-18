import { Request, Response, NextFunction } from 'express';

/**
 * Middleware untuk validasi API key dari PETANI service.
 * Menggunakan env GUDANG_WEBHOOK_SECRET (berbeda dari ECOMMERCE_API_KEY).
 */
export const petaniApiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.GUDANG_WEBHOOK_SECRET || 'gudang_secret_key_v1';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Invalid or missing API key',
    });
  }

  next();
};
