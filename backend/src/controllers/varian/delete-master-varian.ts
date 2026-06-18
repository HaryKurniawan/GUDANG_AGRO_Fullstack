import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const deleteMasterVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.masterVarian.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Master varian tidak ditemukan' });
    }
    await prisma.masterVarian.delete({ where: { id } });
    return res.status(200).json({ statusCode: 200, message: 'Master varian berhasil dihapus' });
  } catch (error: unknown) {
    console.error('Error deleting master varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
