import { Request, Response } from 'express';
import prisma from '../../prisma/client';

// 3. Get warehouse details by ID
export const getWarehouseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key';
    const isApiKeyValid = apiKey === validApiKey;

    // Check if user has access to this warehouse (must be super admin or the designated manager)
    const user = (req as any).user;
    const isSuperAdmin = user?.peran === 'SUPER_ADMIN';
    const isManagerOfWarehouse = user?.managedWarehouses?.includes(id);

    if (!isApiKeyValid && !isSuperAdmin && !isManagerOfWarehouse) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengelola gudang ini',
      });
    }

    const warehouse = await prisma.gudang.findUnique({
      where: { id },
      include: {
        penanggungJawab: {
          select: {
            id: true,
            nama: true,
            email: true,
            noTelepon: true,
          },
        },
        zones: true,
      },
    });

    if (!warehouse) {
      return res.status(404).json({
        statusCode: 404,
        message: `Gudang dengan ID #${id} tidak ditemukan`,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: warehouse,
    });
  } catch (error: unknown) {
    console.error('Error fetching warehouse detail:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
