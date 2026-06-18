import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { getTrenSatuKomoditas } from '../../services/ecommerce-tren.client';

export const createPermintaanPengadaan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      gudangId,
      komoditasNama,
      kodeKomoditasGlobal,
      masterProdukId,
      targetKg,
      hargaAcuanPerKg,
      deadlinePanen,
      catatan,
      // Data dari demand signal (snapshot) — opsional, jika tidak dikirim akan ditarik otomatis
      jumlahTerjualKgBulanIni,
      jumlahTerjualKgBulanLalu,
      trendPersen,
      trendArah,
      jumlahSellerMenjual,
    } = req.body;

    if (!gudangId || !komoditasNama || !targetKg) {
      return res.status(400).json({ error: 'gudangId, komoditasNama, dan targetKg wajib diisi' });
    }

    const now = new Date();
    const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Task 7: Otomatis tarik tren dari ECOMMERCE jika field tren belum diisi
    let finalTrendPersen = trendPersen ? parseFloat(trendPersen) : null;
    let finalTrendArah = trendArah || null;
    let finalJumlahTerjualBulanIni = jumlahTerjualKgBulanIni ? parseFloat(jumlahTerjualKgBulanIni) : 0;
    let finalJumlahTerjualBulanLalu = jumlahTerjualKgBulanLalu ? parseFloat(jumlahTerjualKgBulanLalu) : 0;
    let finalJumlahSeller = jumlahSellerMenjual ? parseInt(jumlahSellerMenjual) : 0;
    let trenTersedia = !!(trendArah || trendPersen);

    if (!trenTersedia && kodeKomoditasGlobal) {
      // Tarik tren otomatis dari endpoint ECOMMERCE global
      const trenData = await getTrenSatuKomoditas(kodeKomoditasGlobal);
      if (trenData) {
        finalTrendPersen = trenData.trendPersen;
        finalTrendArah = trenData.trendArah;
        finalJumlahTerjualBulanIni = trenData.jumlahTerjualKgBulanIni;
        finalJumlahTerjualBulanLalu = trenData.jumlahTerjualKgBulanLalu;
        finalJumlahSeller = trenData.jumlahSellerMenjual;
        trenTersedia = true;
        console.log(`✓ [createPermintaan] Tren otomatis diambil untuk ${kodeKomoditasGlobal}: ${trenData.trendArah} ${trenData.trendPersen}%`);
      } else {
        console.warn(`⚠ [createPermintaan] Tren tidak tersedia untuk ${kodeKomoditasGlobal}, lanjut tanpa tren`);
      }
    }

    const created = await prisma.permintaanPengadaan.create({
      data: {
        gudangId,
        komoditasNama,
        kodeKomoditasGlobal: kodeKomoditasGlobal || null,
        masterProdukId: masterProdukId || null,
        targetKg: parseFloat(targetKg),
        hargaAcuanPerKg: hargaAcuanPerKg ? parseFloat(hargaAcuanPerKg) : null,
        deadlinePanen: deadlinePanen || null,
        catatan: catatan || null,
        jumlahTerjualKgBulanIni: finalJumlahTerjualBulanIni,
        jumlahTerjualKgBulanLalu: finalJumlahTerjualBulanLalu,
        trendPersen: finalTrendPersen,
        trendArah: finalTrendArah,
        jumlahSellerMenjual: finalJumlahSeller,
        status: 'DRAFT',
        periode,
      },
      include: {
        gudang: { select: { id: true, nama: true } },
      },
    });

    return res.status(201).json({ statusCode: 201, data: created, trenTersedia });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
