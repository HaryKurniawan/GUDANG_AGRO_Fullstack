import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 2. Get warehouses managed by the logged-in user
export const getMyWarehouses = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Pengguna tidak terautentikasi',
      });
    }

    const warehouses = await prisma.gudang.findMany({
      where: {
        penanggungJawabId: req.user.id,
      },
      orderBy: { nama: 'asc' },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: warehouses,
    });
  } catch (error: unknown) {
    console.error('Error fetching my warehouses:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
