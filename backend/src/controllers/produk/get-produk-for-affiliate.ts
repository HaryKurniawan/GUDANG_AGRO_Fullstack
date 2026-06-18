import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getProdukForAffiliate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId, tokoId } = req.query;

    console.log(`[getProdukForAffiliate] Request received:`, { gudangId, tokoId });

    if (!gudangId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'gudangId wajib dicantumkan',
      });
    }

    if (!tokoId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'tokoId wajib dicantumkan',
      });
    }

    // Verify warehouse exists
    const gudang = await prisma.gudang.findFirst({
      where: {
        OR: [
          { id: gudangId as string },
          { kode: gudangId as string }
        ]
      },
      select: {
        id: true,
        kode: true,
        nama: true,
        alamat: true,
        kabupaten: true,
        provinsi: true,
      },
    });

    if (!gudang) {
      console.log(`[getProdukForAffiliate] Gudang not found: ${gudangId}`);
      return res.status(404).json({
        statusCode: 404,
        message: 'Gudang tidak ditemukan',
      });
    }

    // ✅ OPEN MARKETPLACE: No affiliation check required
    // Any seller can view products from any warehouse
    console.log(`[getProdukForAffiliate] Open marketplace mode - no affiliation check for gudangId=${gudangId}, tokoId=${tokoId}`);

    // Get all active products from this warehouse WITHOUT STOCK INFO
    // Stock is managed separately from product catalog
    const products = await prisma.produkGudang.findMany({
      where: {
        gudangId: gudang.id,
        isActive: true,
      },
      select: {
        id: true,
        nama: true,
        varianProduk: true,
        deskripsi: true,
        satuan: true,
        hargaGudang: true,
        minimalPembelianKg: true,
        gambarUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { nama: 'asc' },
      ],
    });

    console.log(`[getProdukForAffiliate] Returning ${products.length} products for gudangId=${gudangId}, tokoId=${tokoId}`);

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: {
        gudang,
        // ✅ OPEN MARKETPLACE: No affiliation data needed
        products,
        total: products.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching products for affiliate:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
