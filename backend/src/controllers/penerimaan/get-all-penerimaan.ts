import { Request, Response } from 'express';
import prisma from '../../prisma/client';

export const getAllPenerimaan = async (req: Request, res: Response) => {
  try {
    const { gudangId } = req.query;
    const filter = gudangId ? { gudangId: String(gudangId) } : {};
    
    const penerimaan = await prisma.penerimaanGudang.findMany({
      where: filter,
      include: {
        penerima: { select: { id: true, nama: true } },
        gudang: { select: { id: true, nama: true } },
        gradings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json({
      statusCode: 200,
      message: 'Berhasil mengambil daftar penerimaan',
      data: penerimaan,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil data penerimaan',
      error: (error as Error).message,
    });
  }
};
