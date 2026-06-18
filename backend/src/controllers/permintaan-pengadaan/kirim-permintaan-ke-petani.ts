import { Response } from 'express';
import axios from 'axios';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const PETANI_URL = process.env.PETANI_API_URL || 'http://localhost:5000';
const PETANI_API_KEY = process.env.GUDANG_TO_PETANI_KEY || process.env.PETANI_API_KEY || 'gudang_secret_key_v1';
const PETANI_WEBHOOK_RETRIES = parseInt(process.env.PETANI_WEBHOOK_RETRIES || '3');

export const kirimPermintaanKePetani = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const pp = await prisma.permintaanPengadaan.findUnique({
      where: { id },
      include: { gudang: true },
    });

    if (!pp) return res.status(404).json({ error: 'Tidak ditemukan' });
    if (pp.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Sudah pernah dikirim' });
    }

    // Payload ke PETANI service (sesuai desain: termasuk snapshot tren + trenTersedia)
    const payload = {
      permintaanPengadaanId: pp.id,
      gudangId: pp.gudangId,
      gudangKode: pp.gudang.kode,
      gudangNama: pp.gudang.nama,
      komoditasNama: pp.komoditasNama,
      kodeKomoditasGlobal: pp.kodeKomoditasGlobal,
      targetKg: pp.targetKg,
      hargaAcuanPerKg: pp.hargaAcuanPerKg,
      deadlinePanen: pp.deadlinePanen,
      catatan: pp.catatan,
      trendPersen: pp.trendPersen,
      trendArah: pp.trendArah,
      jumlahTerjualKgBulanIni: pp.jumlahTerjualKgBulanIni,
      periode: pp.periode,
      trenTersedia: !!(pp.trendArah || pp.trendPersen),
      snapshotAt: pp.createdAt.toISOString(),
      // Callback URL GUDANG untuk update komitmen
      callbackUrl: `${process.env.GUDANG_SELF_URL || 'http://localhost:5005'}/api/permintaan-pengadaan/${pp.id}/komitmen`,
    };

    // Task 8: Retry 3x dengan exponential backoff
    let petaniResponded = false;
    let lastError: string | null = null;

    for (let attempt = 0; attempt < PETANI_WEBHOOK_RETRIES; attempt++) {
      try {
        await axios.post(
          `${PETANI_URL}/api/webhook/permintaan-pengadaan`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': PETANI_API_KEY,
            },
            timeout: parseInt(process.env.PETANI_WEBHOOK_TIMEOUT_MS || '8000'),
          }
        );
        petaniResponded = true;
        break;
      } catch (webhookErr: unknown) {
        lastError = (webhookErr as Error).message;
        console.warn(`[kirim-permintaan] Attempt ${attempt + 1}/${PETANI_WEBHOOK_RETRIES} gagal:`, (webhookErr as Error).message);
        if (attempt < PETANI_WEBHOOK_RETRIES - 1) {
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (!petaniResponded) {
      console.error(`[kirim-permintaan] Semua ${PETANI_WEBHOOK_RETRIES} percobaan gagal. Last error: ${lastError}`);
    }

    // Update status ke TERKIRIM
    const updated = await prisma.permintaanPengadaan.update({
      where: { id },
      data: {
        status: 'TERKIRIM',
        tanggalDikirim: new Date(),
        responsePetaniUrl: petaniResponded ? `${PETANI_URL}/api/webhook/permintaan-pengadaan` : null,
      },
    });

    return res.json({
      statusCode: 200,
      message: petaniResponded
        ? 'Permintaan berhasil dikirim ke PETANI service'
        : `Status diperbarui ke TERKIRIM (PETANI webhook gagal setelah ${PETANI_WEBHOOK_RETRIES} percobaan)`,
      data: updated,
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
