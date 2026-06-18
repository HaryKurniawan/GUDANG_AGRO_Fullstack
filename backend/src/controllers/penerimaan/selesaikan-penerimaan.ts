import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { notifyPetaniStocked } from './helpers';

export const selesaikanPenerimaan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const penerimaan = await prisma.penerimaanGudang.findUnique({
      where: { id },
      include: { gradings: true },
    });
    
    if (!penerimaan) {
      return res.status(404).json({ message: 'Penerimaan tidak ditemukan' });
    }
    
    if (penerimaan.status === 'STOCKED') {
      return res.status(400).json({ message: 'Penerimaan sudah masuk stok gudang' });
    }
    
    if (penerimaan.status !== 'VERIFIED') {
      return res.status(400).json({ message: 'Penerimaan belum di-grading (VERIFIED)' });
    }
    
    // Process stock increments
    const updates = [];
    
    for (const grading of penerimaan.gradings) {
      if (grading.isReject || !grading.produkTerhubungId) continue;
      
      updates.push(
        prisma.produkGudang.update({
          where: { id: grading.produkTerhubungId },
          data: {
            stok: {
              increment: grading.beratKg
            }
          }
        })
      );
    }
    
    // Transaction to update all stocks and the receipt status
    await prisma.$transaction([
      ...updates,
      prisma.penerimaanGudang.update({
        where: { id },
        data: { status: 'STOCKED' },
      })
    ]);

    // Kirim notifikasi ke PETANI (non-blocking)
    notifyPetaniStocked(id).catch(() => {/* sudah di-log di dalam fungsi */});

    return res.status(200).json({
      statusCode: 200,
      message: 'Penerimaan berhasil diselesaikan dan stok telah diperbarui',
    });
  } catch (error: unknown) {
    console.error('Error selesaikanPenerimaan:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal menyelesaikan penerimaan',
      error: (error as Error).message,
    });
  }
};
