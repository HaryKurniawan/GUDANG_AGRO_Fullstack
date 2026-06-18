import { Request, Response } from 'express';
import prisma from '../../prisma/client';

/**
 * GET /api/hpp/:produkGudangId
 * Get HPP for a specific product
 */
export const getHppByProduk = async (req: Request, res: Response) => {
  try {
    const { produkGudangId } = req.params;

    const hpp = await prisma.hppProduk.findUnique({
      where: { produkGudangId },
      include: { gudang: { select: { id: true, kode: true, nama: true } } },
    });

    const produk = await prisma.produkGudang.findUnique({
      where: { id: produkGudangId },
      select: { id: true, nama: true, satuan: true, hargaGudang: true, stok: true },
    });

    return res.status(200).json({
      statusCode: 200,
      data: { hpp, produk },
    });
  } catch (error: unknown) {
    console.error('[HPP] Error getHppByProduk:', error);
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};
