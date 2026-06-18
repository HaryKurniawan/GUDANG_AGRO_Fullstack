import { Request, Response } from 'express';
import prisma from '../../prisma/client';

export const getAllPenjualanKeluar = async (req: Request, res: Response) => {
  try {
    const { gudangId, status, search, startDate, endDate } = req.query;

    const where: any = {};

    if (gudangId) where.gudangId = String(gudangId);
    if (status) where.status = String(status);
    if (search) {
      where.OR = [
        { komoditasNama: { contains: String(search), mode: 'insensitive' } },
        { tujuanPenjualan: { contains: String(search), mode: 'insensitive' } },
        { nomorPenjualan: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (startDate || endDate) {
      where.tanggalPenjualan = {};
      if (startDate) where.tanggalPenjualan.gte = new Date(String(startDate));
      if (endDate) where.tanggalPenjualan.lte = new Date(String(endDate));
    }

    const data = await prisma.penjualanKeluar.findMany({
      where,
      include: {
        gudang: { select: { id: true, nama: true, kode: true } },
        dicatatOleh: { select: { id: true, nama: true } },
      },
      orderBy: { tanggalPenjualan: 'desc' },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Berhasil mengambil daftar penjualan keluar',
      data,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil data penjualan keluar',
      error: (error as Error).message,
    });
  }
};
