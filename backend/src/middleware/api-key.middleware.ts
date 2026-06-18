import { Request, Response, NextFunction } from 'express';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key';

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      statusCode: 401,
      message: 'Unauthorized: Invalid or missing API key',
    });
  }

  next();
};
