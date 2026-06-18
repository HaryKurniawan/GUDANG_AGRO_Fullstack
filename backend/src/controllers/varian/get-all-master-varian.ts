import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getAllMasterVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    if (search) {
      where.nama = { contains: search as string, mode: 'insensitive' };
    }
    const varian = await prisma.masterVarian.findMany({
      where,
      orderBy: { nama: 'asc' },
    });
    return res.status(200).json({ statusCode: 200, message: 'OK', data: varian });
  } catch (error: unknown) {
    console.error('Error fetching master varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
