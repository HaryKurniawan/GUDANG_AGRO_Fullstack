import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 1. Get packaging configuration for a product
export const getKemasanConfig = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { produkGudangId } = req.params;

    const produk = await prisma.produkGudang.findUnique({
      where: { id: produkGudangId },
      include: {
        kemasan: {
          orderBy: { ukuranKg: 'asc' }
        }
      }
    });

    if (!produk) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Produk gudang tidak ditemukan'
      });
    }

    // Calculate totals
    const totalKemasanKg = produk.kemasan.reduce(
      (sum, k) => sum + (k.ukuranKg * k.stokKemasan),
      0
    );

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: {
        produkGudangId: produk.id,
        nama: produk.nama,
        stokBulkKg: produk.stok,
        totalKemasanKg,
        totalKg: produk.stok + totalKemasanKg,
        kemasan: produk.kemasan.map(k => ({
          id: k.id,
          ukuranKg: k.ukuranKg,
          stokKemasan: k.stokKemasan,
          totalKg: k.ukuranKg * k.stokKemasan,
          isActive: k.isActive
        }))
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching kemasan config:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message
    });
  }
};
