import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const updateMasterVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nama, deskripsi, isActive } = req.body;

    const existing = await prisma.masterVarian.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Master varian tidak ditemukan' });
    }

    if (nama && String(nama).trim() !== existing.nama) {
      const conflict = await prisma.masterVarian.findUnique({ where: { nama: String(nama).trim() } });
      if (conflict) {
        return res.status(400).json({ statusCode: 400, message: `Varian "${String(nama).trim()}" sudah ada` });
      }
    }

    const varian = await prisma.masterVarian.update({
      where: { id },
      data: {
        ...(nama !== undefined ? { nama: String(nama).trim() } : {}),
        ...(deskripsi !== undefined ? { deskripsi } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });
    return res.status(200).json({ statusCode: 200, message: 'Master varian berhasil diperbarui', data: varian });
  } catch (error: unknown) {
    console.error('Error updating master varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
