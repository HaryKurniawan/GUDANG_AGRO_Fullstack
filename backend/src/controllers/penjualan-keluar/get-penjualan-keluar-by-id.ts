import { Request, Response } from 'express';
import prisma from '../../prisma/client';

export const getPenjualanKeluarById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const data = await prisma.penjualanKeluar.findUnique({
      where: { id },
      include: {
        gudang: { select: { id: true, nama: true, kode: true } },
        dicatatOleh: { select: { id: true, nama: true } },
        masterKomoditas: { select: { id: true, nama: true, kodeKomoditasGlobal: true } },
      },
    });

    if (!data) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Data penjualan keluar tidak ditemukan',
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Berhasil mengambil detail penjualan keluar',
      data,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil detail penjualan keluar',
      error: (error as Error).message,
    });
  }
};
