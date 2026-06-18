import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const getAllPengajuanVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status as string;
    const list = await prisma.pengajuanVarian.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    return res.status(200).json({ statusCode: 200, message: 'OK', data: list });
  } catch (error: unknown) {
    console.error('Error fetching pengajuan varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
