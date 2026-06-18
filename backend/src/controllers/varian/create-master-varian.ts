import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const createMasterVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nama, deskripsi } = req.body;
    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ statusCode: 400, message: 'Nama varian wajib diisi' });
    }
    const namaVal = String(nama).trim();
    const existing = await prisma.masterVarian.findUnique({ where: { nama: namaVal } });
    if (existing) {
      return res.status(400).json({ statusCode: 400, message: `Varian "${namaVal}" sudah ada` });
    }
    const varian = await prisma.masterVarian.create({
      data: { nama: namaVal, deskripsi: deskripsi || null },
    });
    return res.status(201).json({ statusCode: 201, message: 'Master varian berhasil dibuat', data: varian });
  } catch (error: unknown) {
    console.error('Error creating master varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
