import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

/**
 * Upload bukti pembayaran untuk intake
 */
export const uploadBuktiPembayaran = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { buktiPembayaranUrl } = req.body;

    if (!buktiPembayaranUrl) {
      return res.status(400).json({ message: 'URL bukti pembayaran harus diisi' });
    }

    const penerimaan = await prisma.penerimaanGudang.findUnique({ where: { id } });
    if (!penerimaan) {
      return res.status(404).json({ message: 'Intake tidak ditemukan' });
    }

    const updated = await prisma.penerimaanGudang.update({
      where: { id },
      data: {
        buktiPembayaranUrl,
        uploadBuktiAt: new Date(),
        intakeStatus: penerimaan.intakeStatus === 'ditimbang' ? 'selesai' : penerimaan.intakeStatus,
      },
    });

    // ── Setelah intake SELESAI → otomatis buat PemrosesanGudang tahap SORTIR ──
    const isNowComplete = penerimaan.intakeStatus === 'ditimbang'; // will transition to 'selesai'
    if (isNowComplete && penerimaan.gudangId) {
      const existingPemrosesan = await prisma.pemrosesanGudang.findFirst({
        where: { penerimaanId: id },
      });
      if (!existingPemrosesan) {
        const penerimaanAny = penerimaan as any;
        const berat = penerimaanAny.beratAsliKg || penerimaan.beratDiterimaKg || penerimaanAny.sanggupKg || 0;
        await prisma.pemrosesanGudang.create({
          data: {
            penerimaanId: id,
            gudangId: penerimaan.gudangId,
            komoditasNama: penerimaanAny.komoditasNama || 'Komoditas',
            beratMasukKg: berat,
            tahap: 'SORTIR',
          },
        });
        console.log(`✓ [Intake Selesai] PemrosesanGudang SORTIR dibuat untuk penerimaan ${id} (${berat} kg)`);
      }
    }

    return res.status(200).json({
      statusCode: 200,
      message: isNowComplete
        ? 'Intake selesai. Barang masuk antrian Sortir & Cuci.'
        : 'Bukti pembayaran berhasil diupload',
      data: updated,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal upload bukti pembayaran',
      error: (error as Error).message,
    });
  }
};
