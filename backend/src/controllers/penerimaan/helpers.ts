import axios from 'axios';
import prisma from '../../prisma/client';

/**
 * Kirim pembaruan status ke PETANI service setelah penerimaan STOCKED.
 * Non-blocking: kegagalan tidak membatalkan operasi STOCKED.
 */
export async function notifyPetaniStocked(penerimaanId: string): Promise<void> {
  const petaniUrl = process.env.PETANI_API_URL;
  // Use GUDANG_TO_PETANI_KEY which must match PETANI's GUDANG_API_KEY env var
  const petaniKey = process.env.GUDANG_TO_PETANI_KEY || process.env.GUDANG_WEBHOOK_SECRET;

  if (!petaniUrl || !petaniKey) {
    console.warn('[Penerimaan] PETANI_API_URL atau GUDANG_TO_PETANI_KEY belum dikonfigurasi, skip notifikasi');
    return;
  }

  const penerimaan = await prisma.penerimaanGudang.findUnique({
    where: { id: penerimaanId },
    include: { gradings: true },
  });

  if (!penerimaan || !penerimaan.penjemputanId) return;

  const gradeInfo = penerimaan.gradings
    .filter((g) => !g.isReject)
    .map((g) => ({ grade: g.namaGrade, beratKg: g.beratKg }));

  const penerimaanAny = penerimaan as any;

  const payload = {
    pickupId: penerimaan.penjemputanId,
    penerimaanGudangId: penerimaan.id,
    status: 'STOCKED',
    kodeKomoditasGlobal: penerimaanAny.kodeKomoditasGlobal ?? null,
    beratDiterimaKg: penerimaan.beratDiterimaKg,
    gradeInfoJson: JSON.stringify(gradeInfo),
    processedAt: new Date().toISOString(),
  };

  const timeout = parseInt(process.env.PETANI_WEBHOOK_TIMEOUT_MS ?? '5000');
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await axios.post(`${petaniUrl}/api/webhook/penerimaan-dari-gudang`, payload, {
        headers: { 'x-api-key': petaniKey, 'Content-Type': 'application/json' },
        timeout,
      });

      // Tandai sukses
      await (prisma.penerimaanGudang as any).update({
        where: { id: penerimaanId },
        data: { sinkronisasiKePetani: 'sent' },
      });

      console.log(`✓ [Penerimaan] Status STOCKED dikirim ke PETANI untuk pickupId: ${penerimaan.penjemputanId}`);
      return;
    } catch (err: unknown) {
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
      } else {
        await (prisma.penerimaanGudang as any).update({
          where: { id: penerimaanId },
          data: { sinkronisasiKePetani: 'failed' },
        });
        console.error(`✗ [Penerimaan] Gagal notifikasi PETANI setelah ${maxRetries} percobaan:`, (err as Error).message);
      }
    }
  }
}
