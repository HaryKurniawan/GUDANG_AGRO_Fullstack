import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getMyPengajuanVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await prisma.pengajuanVarian.findMany({
      where: { diajukanOlehId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ statusCode: 200, message: 'OK', data: list });
  } catch (error: unknown) {
    console.error('Error fetching my pengajuan varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
