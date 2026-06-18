import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const listPermintaanPengadaan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId, status, periode } = req.query;

    const where: any = {};
    if (gudangId) where.gudangId = gudangId;
    if (status) where.status = status;
    if (periode) where.periode = periode;

    // Filter berdasarkan gudang yang dikelola user
    if (req.user?.peran !== 'SUPER_ADMIN') {
      const myGudangs = req.user?.managedWarehouses || [];
      if (myGudangs.length > 0) {
        where.gudangId = { in: myGudangs };
      }
    }

    const data = await prisma.permintaanPengadaan.findMany({
      where,
      include: {
        gudang: { select: { id: true, nama: true, kabupaten: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ statusCode: 200, data });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
