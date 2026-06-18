import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getActiveMasterVarian = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const varian = await prisma.masterVarian.findMany({
      where: { isActive: true },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, deskripsi: true },
    });
    return res.status(200).json({ statusCode: 200, message: 'OK', data: varian });
  } catch (error: unknown) {
    console.error('Error fetching active master varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
