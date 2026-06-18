import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getProdukGudang = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId } = req.query;

    const whereClause: any = {};
    if (gudangId) {
      whereClause.gudangId = gudangId as string;
    } else if (req.user && req.user.peran !== 'SUPER_ADMIN') {
      // Non-super-admins only see products from warehouses they manage
      whereClause.gudangId = {
        in: req.user.managedWarehouses,
      };
    }

    const products = await prisma.produkGudang.findMany({
      where: whereClause,
      include: {
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        masterKomoditas: {
          select: {
            id: true,
            nama: true,
            kategori: true,
            satuan: true,
            kodeKomoditasGlobal: true,
          },
        },
        kemasan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: products,
    });
  } catch (error: unknown) {
    console.error('Error fetching warehouse products:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
