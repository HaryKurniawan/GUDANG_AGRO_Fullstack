import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const createPenerimaan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { 
      nomorPenerimaan, 
      penjemputanId, 
      gudangId, 
      beratDiterimaKg, 
      kondisi, 
      catatan 
    } = req.body;
    
    const penerimaId = req.user?.id;
    if (!penerimaId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const newPenerimaan = await prisma.penerimaanGudang.create({
      data: {
        nomorPenerimaan: nomorPenerimaan || `RCV-${Date.now()}`,
        penjemputanId: penjemputanId || `TRP-${Date.now()}`,
        penerimaId,
        gudangId,
        beratDiterimaKg: Number(beratDiterimaKg),
        kondisi: kondisi || 'BAIK',
        catatan,
        status: 'RECEIVED',
      },
    });
    
    return res.status(201).json({
      statusCode: 201,
      message: 'Penerimaan berhasil dibuat',
      data: newPenerimaan,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal membuat penerimaan',
      error: (error as Error).message,
    });
  }
};
