import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 5. Update warehouse details
export const updateWarehouse = async (req: AuthenticatedRequest, res: Response) => {  try {
    const { id } = req.params;
    const { telepon, email, jamOperasional, catatan, kapasitasKg, status } = req.body;

    // Authorization check
    const isSuperAdmin = req.user?.peran === 'SUPER_ADMIN';
    const isManagerOfWarehouse = req.user?.managedWarehouses.includes(id);

    if (!isSuperAdmin && !isManagerOfWarehouse) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Anda tidak memiliki wewenang untuk memperbarui gudang ini',
      });
    }

    const existing = await prisma.gudang.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Gudang tidak ditemukan',
      });
    }

    const updated = await prisma.gudang.update({
      where: { id },
      data: {
        telepon: telepon !== undefined ? telepon : existing.telepon,
        email: email !== undefined ? email : existing.email,
        jamOperasional: jamOperasional !== undefined ? jamOperasional : existing.jamOperasional,
        catatan: catatan !== undefined ? catatan : existing.catatan,
        kapasitasKg: kapasitasKg !== undefined ? parseFloat(kapasitasKg) : existing.kapasitasKg,
        status: status !== undefined ? status : existing.status,
      },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Gudang berhasil diperbarui',
      data: updated,
    });
  } catch (error: unknown) {
    console.error('Error updating warehouse:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
