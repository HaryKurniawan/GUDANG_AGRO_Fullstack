import { Request, Response } from 'express';
import prisma from '../../prisma/client';

export const getRingkasanPenjualanKeluar = async (req: Request, res: Response) => {
  try {
    const { gudangId, startDate, endDate } = req.query;

    const where: any = { status: { not: 'BATAL' } };
    if (gudangId) where.gudangId = String(gudangId);
    if (startDate || endDate) {
      where.tanggalPenjualan = {};
      if (startDate) where.tanggalPenjualan.gte = new Date(String(startDate));
      if (endDate) where.tanggalPenjualan.lte = new Date(String(endDate));
    }

    const agg = await prisma.penjualanKeluar.aggregate({
      where,
      _sum: { beratKg: true, totalNilai: true },
      _count: { _all: true },
    });

    // Breakdown per komoditas
    const perKomoditas = await prisma.penjualanKeluar.groupBy({
      by: ['komoditasNama'],
      where,
      _sum: { beratKg: true, totalNilai: true },
      orderBy: { _sum: { beratKg: 'desc' } },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Berhasil mengambil ringkasan penjualan keluar',
      data: {
        totalTransaksi: agg._count._all,
        totalBeratKg: agg._sum.beratKg ?? 0,
        totalNilai: agg._sum.totalNilai ?? 0,
        perKomoditas: perKomoditas.map((k: any) => ({
          komoditasNama: k.komoditasNama,
          totalBeratKg: k._sum.beratKg ?? 0,
          totalNilai: k._sum.totalNilai ?? 0,
        })),
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil ringkasan penjualan keluar',
      error: (error as Error).message,
    });
  }
};
