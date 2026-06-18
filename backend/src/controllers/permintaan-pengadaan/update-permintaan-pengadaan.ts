import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const updatePermintaanPengadaan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { targetKg, hargaAcuanPerKg, deadlinePanen, catatan } = req.body;

    const existing = await prisma.permintaanPengadaan.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Tidak ditemukan' });
    if (existing.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Hanya permintaan dengan status DRAFT yang bisa diedit' });
    }

    const updated = await prisma.permintaanPengadaan.update({
      where: { id },
      data: {
        targetKg: targetKg ? parseFloat(targetKg) : undefined,
        hargaAcuanPerKg: hargaAcuanPerKg ? parseFloat(hargaAcuanPerKg) : undefined,
        deadlinePanen: deadlinePanen || undefined,
        catatan: catatan || undefined,
      },
    });

    return res.json({ statusCode: 200, data: updated });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
