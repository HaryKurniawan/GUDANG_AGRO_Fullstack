import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 4. Create new warehouse (SUPER_ADMIN only)
export const createWarehouse = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.peran !== 'SUPER_ADMIN') {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Hanya SUPER_ADMIN yang dapat membuat gudang baru',
      });
    }

    const { nama, kode, tipe, alamat, kabupaten, provinsi, lat, lng, telepon, email, kapasitasKg, jamOperasional } = req.body;

    if (!nama || !kode || !alamat || !kabupaten || !provinsi) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Nama, kode, alamat, kabupaten, dan provinsi wajib diisi',
      });
    }

    // Check kode uniqueness
    const existing = await prisma.gudang.findFirst({ where: { kode } });
    if (existing) {
      return res.status(400).json({
        statusCode: 400,
        message: `Gudang dengan kode "${kode}" sudah ada`,
      });
    }

    const gudang = await prisma.gudang.create({
      data: {
        nama,
        kode,
        tipe: tipe || 'REGIONAL',
        alamat,
        kabupaten,
        provinsi,
        lat: lat ? parseFloat(lat) : 0,
        lng: lng ? parseFloat(lng) : 0,
        telepon: telepon || null,
        email: email || null,
        kapasitasKg: kapasitasKg ? parseFloat(kapasitasKg) : 0,
        jamOperasional: jamOperasional || '08:00 - 17:00',
        status: 'ACTIVE',
      },
    });

    return res.status(201).json({
      statusCode: 201,
      message: 'Gudang berhasil dibuat',
      data: gudang,
    });
  } catch (error: unknown) {
    console.error('Error creating warehouse:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
