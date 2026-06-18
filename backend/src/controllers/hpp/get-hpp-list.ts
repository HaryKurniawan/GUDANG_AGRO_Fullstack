import { Request, Response } from 'express';
import prisma from '../../prisma/client';

/**
 * GET /api/hpp
 * List all HPP settings for products in a gudang
 * Query: ?gudangId=xxx
 */
export const getHppList = async (req: Request, res: Response) => {
  try {
    const { gudangId } = req.query;

    const where: any = {};
    if (gudangId) where.gudangId = String(gudangId);

    const hppList = await prisma.hppProduk.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { gudang: { select: { id: true, kode: true, nama: true } } },
    });

    // Also get produk gudang data to show names
    const produkIds = hppList.map(h => h.produkGudangId);
    const produkList = await prisma.produkGudang.findMany({
      where: { id: { in: produkIds } },
      select: { id: true, nama: true, satuan: true, hargaGudang: true, stok: true },
    });
    const produkMap = new Map(produkList.map(p => [p.id, p]));

    const enriched = hppList.map(hpp => ({
      ...hpp,
      produk: produkMap.get(hpp.produkGudangId) || null,
    }));

    return res.status(200).json({ statusCode: 200, data: enriched });
  } catch (error: unknown) {
    console.error('[HPP] Error getHppList:', error);
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};
