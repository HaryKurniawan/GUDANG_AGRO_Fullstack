import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const deleteProdukGudang = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existingProduct = await prisma.produkGudang.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Produk gudang tidak ditemukan',
      });
    }

    if (req.user && req.user.peran !== 'SUPER_ADMIN' && !req.user.managedWarehouses.includes(existingProduct.gudangId)) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Anda tidak mengelola gudang untuk produk ini',
      });
    }

    await prisma.produkGudang.delete({
      where: { id },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Produk gudang berhasil dihapus',
    });
  } catch (error: unknown) {
    console.error('Error deleting warehouse product:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal menghapus produk gudang',
      error: (error as Error).message,
    });
  }
};
