import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { formatStockRequest } from './helpers';

export const getStockRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(200).json({
        statusCode: 200,
        message: 'OK',
        data: [],
      });
    }

    const isSuperAdmin = req.user.peran === 'SUPER_ADMIN';

    if (!isSuperAdmin && req.user.managedWarehouses.length === 0) {
      return res.status(200).json({
        statusCode: 200,
        message: 'OK',
        data: [],
      });
    }

    const { status, tokoId } = req.query;

    const where: any = {};

    // SUPER_ADMIN sees all, others see only their warehouses
    if (!isSuperAdmin) {
      where.gudangId = { in: req.user.managedWarehouses };
    }

    if (status) {
      where.status = status;
    }

    if (tokoId) {
      where.tokoId = tokoId;
    }

    const requests = await prisma.pengajuanStokToko.findMany({
      where,
      include: {
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        items: {
          include: {
            kemasanDetail: true
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedRequests = requests.map(r => formatStockRequest(r));

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: formattedRequests,
    });
  } catch (error: unknown) {
    console.error('Error fetching stock requests:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
