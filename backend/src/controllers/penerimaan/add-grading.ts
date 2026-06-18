import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const addGrading = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { gradings } = req.body; // array of grading objects
    
    const penerimaan = await prisma.penerimaanGudang.findUnique({ where: { id } });
    if (!penerimaan) {
      return res.status(404).json({ message: 'Penerimaan tidak ditemukan' });
    }
    
    if (penerimaan.status === 'STOCKED') {
      return res.status(400).json({ message: 'Penerimaan sudah selesai, tidak bisa menambah grading' });
    }
    
    // Create many gradings
    const createdGradings = await prisma.$transaction(
      gradings.map((g: any) => 
        prisma.gradingPenerimaan.create({
          data: {
            penerimaanId: id,
            namaGrade: g.namaGrade,
            beratKg: Number(g.beratKg),
            hargaPerKg: Number(g.hargaPerKg || 0),
            totalNilai: Number(g.beratKg) * Number(g.hargaPerKg || 0),
            produkTerhubungId: g.produkTerhubungId,
            isReject: g.isReject || false,
            alasanReject: g.alasanReject,
          }
        })
      )
    );
    
    // Update status to VERIFIED
    await prisma.penerimaanGudang.update({
      where: { id },
      data: { status: 'VERIFIED' },
    });
    
    return res.status(201).json({
      statusCode: 201,
      message: 'Grading berhasil ditambahkan',
      data: createdGradings,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal menambah grading',
      error: (error as Error).message,
    });
  }
};
