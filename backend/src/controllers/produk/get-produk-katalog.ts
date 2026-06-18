import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getProdukKatalog = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId } = req.query;

    if (!gudangId) {
      return res.status(400).json({
        statusCode: 400,
        message: 'gudangId wajib dicantumkan',
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
      },
    });

    if (!gudang) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Gudang tidak ditemukan',
      });
    }

    // Get all active products from this warehouse
    // IMPORTANT: We exclude stokTersedia for security/business reasons
    // Sellers should not see actual warehouse stock levels
    const products = await prisma.produkGudang.findMany({
      where: {
        gudangId: gudang.id,
        isActive: true, // Only show active products
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
        // stokTersedia: false, // Explicitly exclude stock info
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { nama: 'asc' }, // Sort alphabetically
      ],
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'OK',
      data: {
        gudang,
        products,
        total: products.length,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching product catalog:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
