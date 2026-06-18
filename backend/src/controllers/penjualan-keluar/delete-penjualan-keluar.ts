import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const deletePenjualanKeluar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.penjualanKeluar.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Data penjualan keluar tidak ditemukan' });
    }

    await prisma.penjualanKeluar.delete({ where: { id } });

    return res.status(200).json({
      statusCode: 200,
      message: 'Penjualan keluar berhasil dihapus',
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal menghapus penjualan keluar',
      error: (error as Error).message,
    });
  }
};
