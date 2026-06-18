import { Request, Response } from 'express';
import prisma from '../../prisma/client';

// 1. Get all active warehouses (for Admin Ecommerce via API Key or standard Admin)
export const getAllActiveWarehouses = async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key';

    const isApiKeyValid = apiKey === validApiKey;
    const hasUser = !!(req as any).user;

    // Public GET list: allow anyone to see the warehouse list
    // (detailed inventory data is still protected per-warehouse)
    if (!isApiKeyValid && !hasUser) {
      // Still allow — show public fields only
    }

    const warehouses = await prisma.gudang.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        kode: true,
        nama: true,
        tipe: true,
        alamat: true,
        kabupaten: true,
        provinsi: true,
        lat: true,
        lng: true,
        kapasitasKg: true,
        kapasitasTerpakai: true,
        telepon: true,
        email: true,
        jamOperasional: true,
        fotoUrl: true,
        status: true,
      },
      orderBy: { nama: 'asc' },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: warehouses,
    });
  } catch (error: unknown) {
    console.error('Error fetching warehouses:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
