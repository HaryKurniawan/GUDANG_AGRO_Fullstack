import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

/**
 * Update intake status: Sudah ditimbang
 */
export const ditimbangIntake = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { beratAsliKg, catatan } = req.body;

    if (!beratAsliKg) {
      return res.status(400).json({ message: 'Berat asli (kg) harus diisi' });
    }

    const penerimaan = await prisma.penerimaanGudang.findUnique({ where: { id } });
    if (!penerimaan) {
      return res.status(404).json({ message: 'Intake tidak ditemukan' });
    }

    if (penerimaan.intakeStatus === 'selesai' || penerimaan.intakeStatus === 'ditimbang') {
      return res.status(400).json({ message: 'Intake sudah ditimbang atau selesai' });
    }

    const updated = await prisma.penerimaanGudang.update({
      where: { id },
      data: {
        intakeStatus: 'ditimbang',
        ditimbangAt: new Date(),
        beratAsliKg: parseFloat(String(beratAsliKg)),
        beratDiterimaKg: parseFloat(String(beratAsliKg)), // Update received weight
        catatan: catatan || penerimaan.catatan,
      },
    });

    // ── PemrosesanGudang dibuat di step terakhir (uploadBuktiPembayaran) ──
    // Update berat di pemrosesan jika sudah ada (dari selesai sebelumnya — edge case)
    const existingPemrosesan = await prisma.pemrosesanGudang.findFirst({
      where: { penerimaanId: id },
    });
    if (existingPemrosesan) {
      await prisma.pemrosesanGudang.update({
        where: { id: existingPemrosesan.id },
        data: { beratMasukKg: parseFloat(String(beratAsliKg)) },
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Intake ditimbang berhasil',
      data: updated,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal mencatat penimbangan',
      error: (error as Error).message,
    });
  }
};
