import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const createPengajuanVarian = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nama, deskripsi, alasan } = req.body;
    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ statusCode: 400, message: 'Nama varian wajib diisi' });
    }
    const namaVal = String(nama).trim();

    // Sudah ada di master?
    const existingMaster = await prisma.masterVarian.findUnique({ where: { nama: namaVal } });
    if (existingMaster) {
      return res.status(400).json({ statusCode: 400, message: `Varian "${namaVal}" sudah tersedia, tidak perlu diajukan` });
    }

    // Sudah ada pengajuan MENUNGGU dengan nama sama?
    const dupPending = await prisma.pengajuanVarian.findFirst({
      where: { nama: namaVal, status: 'MENUNGGU' },
    });
    if (dupPending) {
      return res.status(400).json({ statusCode: 400, message: `Pengajuan varian "${namaVal}" sudah ada dan sedang menunggu persetujuan` });
    }

    const gudangId = req.user?.managedWarehouses?.[0] || null;

    const pengajuan = await prisma.pengajuanVarian.create({
      data: {
        nama: namaVal,
        deskripsi: deskripsi || null,
        alasan: alasan || null,
        diajukanOlehId: req.user!.id,
        gudangId,
        status: 'MENUNGGU',
      },
    });
    return res.status(201).json({ statusCode: 201, message: 'Pengajuan varian terkirim, menunggu persetujuan admin', data: pengajuan });
  } catch (error: unknown) {
    console.error('Error creating pengajuan varian:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server', error: (error as Error).message });
  }
};
