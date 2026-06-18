import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const rejectPengajuanVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { catatanAdmin } = req.body;

    const pengajuan = await prisma.pengajuanVarian.findUnique({ where: { id } });
    if (!pengajuan) {
      return res.status(404).json({ statusCode: 404, message: 'Pengajuan tidak ditemukan' });
    }
    if (pengajuan.status !== 'MENUNGGU') {
      return res.status(400).json({ statusCode: 400, message: 'Pengajuan ini sudah ditinjau' });
    }

    const updated = await prisma.pengajuanVarian.update({
      where: { id },
      data: {
        status: 'DITOLAK',
        catatanAdmin: catatanAdmin || null,
        ditinjauOlehId: req.user!.id,
        ditinjauAt: new Date(),
      },
    });
    return res.status(200).json({ statusCode: 200, message: 'Pengajuan ditolak', data: updated });
  } catch (error: unknown) {
    console.error('Error rejecting pengajuan varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
