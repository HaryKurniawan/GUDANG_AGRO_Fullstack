import { Request, Response } from 'express';
import prisma from '../../prisma/client';

export const getPenerimaanById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const penerimaan = await prisma.penerimaanGudang.findUnique({
      where: { id },
      include: {
        penerima: { select: { id: true, nama: true } },
        gudang: { select: { id: true, nama: true } },
        gradings: {
          include: {
            // we could include produk here, but we just have produkTerhubungId
          }
        },
      },
    });
    
    if (!penerimaan) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Data penerimaan tidak ditemukan',
      });
    }
    
    return res.status(200).json({
      statusCode: 200,
      message: 'Berhasil mengambil detail penerimaan',
      data: penerimaan,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan saat mengambil detail penerimaan',
      error: (error as Error).message,
    });
  }
};
