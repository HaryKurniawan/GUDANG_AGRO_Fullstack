import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { formatStockRequest } from './helpers';

export const getStockRequestById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.pengajuanStokToko.findUnique({
      where: { id },
      include: {
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
            alamat: true,
          },
        },
        items: {
          include: {
            kemasanDetail: true
          }
        },
      },
    });

    if (!request) {
      return res.status(404).json({
        statusCode: 404,
        message: `Pengajuan stok #${id} tidak ditemukan`,
      });
    }

    // Verify access
    const isSuperAdmin = req.user?.peran === 'SUPER_ADMIN';
    const isAuthorized = isSuperAdmin || req.user?.managedWarehouses.includes(request.gudangId);

    if (!isAuthorized) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Anda tidak mengelola gudang penanggung jawab pengajuan ini',
      });
    }

    // Fetch matching ProdukGudang with its packaging config to enrich payload for builder UI
    const itemsWithProductConfig = await Promise.all(
      request.items.map(async (item) => {
        const produkGudang = await prisma.produkGudang.findUnique({
          where: { id: item.produkId },
          include: { kemasan: { orderBy: { ukuranKg: 'asc' } }, masterKomoditas: true }
        });
        return {
          ...item,
          produkGudang
        };
      })
    );

    const formatted = formatStockRequest(request, itemsWithProductConfig);

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: formatted,
    });
  } catch (error: unknown) {
    console.error('Error fetching stock request detail:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
