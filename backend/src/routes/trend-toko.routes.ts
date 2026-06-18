import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/gudang/:id/trend-toko-langganan
router.get('/:id/trend-toko-langganan', async (req: Request, res: Response) => {
  try {
    const { id: gudangId } = req.params;

    // Pastikan gudang exists
    const gudang = await prisma.gudang.findUnique({
      where: { id: gudangId }
    });

    if (!gudang) {
      return res.status(404).json({ error: 'Gudang tidak ditemukan' });
    }

    // MOCK DATA: Simulasi balasan dari E-Commerce API
    // Pada skenario nyata, ini akan menggunakan axios/node-fetch untuk menembak ke E-Commerce Service
    const mockTrendData = [
      {
        kodeKomoditasGlobal: 'BAWANG_MERAH_PROBOLINGGO',
        komoditasNama: 'Bawang Merah Probolinggo',
        jumlahTokoPasar: 145,
        salesVelocityKgPerDay: 850, // rata-rata jual 850kg/hari skala platform
        trendStatus: 'NAIK_TAJAM', // NAIK_TAJAM, NAIK, STABIL, TURUN
        trendPersen: 25,
        // Smart Buffer = Sales Velocity * 2 hari (untuk amannya)
        rekomendasiBufferKg: 1700,
        stokGudangSaatIni: 450 // Dummy stok
      },
      {
        kodeKomoditasGlobal: 'KENTANG_DIENG_A',
        komoditasNama: 'Kentang Dieng Grade A',
        jumlahTokoPasar: 89,
        salesVelocityKgPerDay: 500,
        trendStatus: 'NAIK',
        trendPersen: 10,
        rekomendasiBufferKg: 1000,
        stokGudangSaatIni: 1200 // Cukup aman
      },
      {
        kodeKomoditasGlobal: 'CABE_RAWIT_MERAH',
        komoditasNama: 'Cabe Rawit Merah',
        jumlahTokoPasar: 210,
        salesVelocityKgPerDay: 400,
        trendStatus: 'STABIL',
        trendPersen: 0,
        rekomendasiBufferKg: 800,
        stokGudangSaatIni: 100 // Kritis
      },
      {
        kodeKomoditasGlobal: 'TOMAT_CHERRY',
        komoditasNama: 'Tomat Cherry Segar',
        jumlahTokoPasar: 45,
        salesVelocityKgPerDay: 80,
        trendStatus: 'TURUN',
        trendPersen: -15,
        rekomendasiBufferKg: 160,
        stokGudangSaatIni: 250 // Overstock
      }
    ];

    res.json({
      gudangId: gudang.id,
      gudangNama: gudang.nama,
      lastUpdated: new Date().toISOString(),
      data: mockTrendData
    });
  } catch (error: any) {
    console.error('Error fetching trend toko:', error);
    res.status(500).json({ error: 'Terjadi kesalahan server saat mengambil data tren toko.' });
  }
});

export default router;
