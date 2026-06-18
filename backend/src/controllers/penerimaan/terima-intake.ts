import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

/**
 * Update intake status: Terima barang dari petani
 */
export const terimaIntake = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { catatan } = req.body;

    const penerimaan = await prisma.penerimaanGudang.findUnique({ where: { id } });
    if (!penerimaan) {
      return res.status(404).json({ message: 'Intake tidak ditemukan' });
    }

    if (penerimaan.intakeStatus !== 'menunggu_penerimaan') {
      return res.status(400).json({ message: 'Status intake tidak sesuai untuk menerima' });
    }

    const updated = await prisma.penerimaanGudang.update({
      where: { id },
      data: {
        intakeStatus: 'diterima',
        terimaAt: new Date(),
        catatan: catatan || penerimaan.catatan,
      },
    });

    // ── Otomatis buat PemrosesanGudang tahap SORTIR saat barang diterima ──
    // REVERT: Jangan buat pemrosesan saat terima, buat SETELAH intake selesai (semua step di IntakePetaniPage selesai)
    // Pemrosesan dibuat di uploadBuktiPembayaran (step terakhir intake)

    return res.status(200).json({
      statusCode: 200,
      message: 'Intake diterima berhasil.',
      data: updated,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal menerima intake',
      error: (error as Error).message,
    });
  }
};
