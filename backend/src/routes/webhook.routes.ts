import express, { Request, Response } from 'express';
import prisma from '../prisma/client';
import { petaniApiKeyMiddleware } from '../middleware/petani-api-key.middleware';
import { sendNotificationToGudang } from '../controllers/sse.controller';

const router = express.Router();

// Semua endpoint webhook PETANI pakai petaniApiKeyMiddleware
router.use(petaniApiKeyMiddleware);

/**
 * POST /api/webhook/penerimaan
 * Menerima notifikasi pickup selesai dari PETANI service.
 * Dipanggil otomatis saat Pickup.status berubah ke 'selesai' di PETANI.
 */
router.post('/penerimaan', async (req: Request, res: Response) => {
  const {
    pickupId,
    pengajuanJualId,
    petaniId,
    petaniNama,
    komoditasNama,
    kodeKomoditasGlobal,
    beratTimbangKg,
    gudangTujuanId,
    timestamp,
  } = req.body;

  try {
    // 1. Validasi field wajib
    if (!pickupId || beratTimbangKg === undefined || beratTimbangKg === null) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields: pickupId, beratTimbangKg',
      });
    }

    const berat = parseFloat(beratTimbangKg);
    if (isNaN(berat) || berat <= 0 || berat > 100000) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Invalid beratTimbangKg: harus bilangan antara 0 dan 100.000',
      });
    }

    // 2. Idempotency — cek apakah pickupId sudah pernah diterima
    const existing = await prisma.penerimaanGudang.findFirst({
      where: { penjemputanId: pickupId },
      include: {
        gudang: { select: { id: true, nama: true } },
        penerima: { select: { id: true, nama: true } },
      },
    });

    if (existing) {
      console.log(`[Webhook] Idempotent: penerimaan sudah ada untuk pickupId: ${pickupId}`);
      return res.status(200).json({
        statusCode: 200,
        message: 'Penerimaan dengan pickupId ini sudah terdaftar',
        data: existing,
      });
    }

    // 3. Cari MasterKomoditas jika kodeKomoditasGlobal tersedia
    let matchedMasterKomoditasId: string | null = null;
    if (kodeKomoditasGlobal) {
      const masterKomoditas = await (prisma.masterKomoditas as any).findFirst({
        where: { kodeKomoditasGlobal: String(kodeKomoditasGlobal), isActive: true },
      });
      matchedMasterKomoditasId = masterKomoditas?.id ?? null;

      if (!masterKomoditas) {
        console.warn(`[Webhook] kodeKomoditasGlobal "${kodeKomoditasGlobal}" tidak cocok dengan MasterKomoditas manapun`);
      }
    }

    // 4. Cari Gudang jika gudangTujuanId tersedia
    // PETANI menyimpan kode gudang (mis. "GDG-UTAMA") bukan UUID — cocokkan by kode atau id
    let matchedGudangId: string | null = null;
    if (gudangTujuanId) {
      const gudangByKode = await prisma.gudang.findFirst({ where: { kode: String(gudangTujuanId) } });
      if (gudangByKode) {
        matchedGudangId = gudangByKode.id;
      } else {
        // Fallback: coba cocokkan by UUID (untuk data lama)
        const gudangById = await prisma.gudang.findUnique({ where: { id: String(gudangTujuanId) } });
        matchedGudangId = gudangById?.id ?? null;
      }

      if (!matchedGudangId) {
        console.warn(`[Webhook] gudangTujuanId "${gudangTujuanId}" tidak cocok dengan kode atau ID gudang manapun`);
      }
    }

    // 5. Cari user penerima default (ADMIN_GUDANG atau SUPER_ADMIN)
    const defaultPenerima = await prisma.pengguna.findFirst({
      where: { peran: { in: ['ADMIN_GUDANG', 'SUPER_ADMIN'] } },
      orderBy: { createdAt: 'asc' },
    });

    if (!defaultPenerima) {
      return res.status(500).json({
        statusCode: 500,
        message: 'Tidak ada pengguna ADMIN_GUDANG atau SUPER_ADMIN untuk memproses penerimaan',
      });
    }

    // 6. Generate nomorPenerimaan unik berbasis tanggal
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const countToday = await prisma.penerimaanGudang.count({
      where: { createdAt: { gte: startOfDay } },
    });
    const nomorPenerimaan = `PNG-${dateStr}-${String(countToday + 1).padStart(4, '0')}`;

    // 7. Buat PenerimaanGudang dengan snapshot metadata
    const penerimaan = await (prisma.penerimaanGudang as any).create({
      data: {
        nomorPenerimaan,
        penjemputanId: String(pickupId),
        penerimaId: defaultPenerima.id,
        gudangId: matchedGudangId,
        beratDiterimaKg: berat,
        kondisi: 'BAIK',
        status: 'RECEIVED',

        // Snapshot metadata dari PETANI (immutable setelah dibuat)
        petaniNama: petaniNama ? String(petaniNama) : null,
        komoditasNama: komoditasNama ? String(komoditasNama) : null,
        kodeKomoditasGlobal: kodeKomoditasGlobal ? String(kodeKomoditasGlobal) : null,
        masterKomoditasId: matchedMasterKomoditasId,
        sinkronisasiKePetani: 'pending',
      },
      include: {
        gudang: { select: { id: true, nama: true } },
        penerima: { select: { id: true, nama: true } },
      },
    });

    // 8. Kirim SSE notification ke staf gudang yang terhubung
    if (matchedGudangId) {
      try {
        sendNotificationToGudang(matchedGudangId, {
          type: 'PENERIMAAN_BARU',
          penerimaanId: penerimaan.id,
          nomorPenerimaan: penerimaan.nomorPenerimaan,
          petaniNama: petaniNama ?? 'Tidak diketahui',
          komoditasNama: komoditasNama ?? 'Tidak diketahui',
          beratKg: berat,
          message: `Penerimaan baru: ${nomorPenerimaan} dari ${petaniNama ?? 'Petani'} (${komoditasNama ?? '-'}, ${berat} kg)`,
          timestamp: new Date().toISOString(),
        });
      } catch (sseError: unknown) {
        // SSE gagal: rollback penerimaan sesuai requirement 2.8
        await prisma.penerimaanGudang.delete({ where: { id: penerimaan.id } });
        console.error('[Webhook] SSE notification gagal, penerimaan di-rollback:', (sseError as Error).message);
        return res.status(500).json({
          statusCode: 500,
          message: 'Gagal mengirim notifikasi SSE ke staf gudang',
          error: (sseError as Error).message,
        });
      }
    }

    console.log(`✓ [Webhook] Penerimaan dibuat: ${nomorPenerimaan} untuk pickupId: ${pickupId}`);
    return res.status(201).json({
      statusCode: 201,
      message: 'Penerimaan berhasil dibuat dari PETANI webhook',
      data: penerimaan,
    });
  } catch (error: unknown) {
    console.error('[Webhook] Error penerimaan:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
});



export default router;
