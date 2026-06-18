import { Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 6. Create Kepala Gudang (ADMIN_GUDANG account) with optional afiliasi to kepala petani
export const createKepalGudang = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.peran !== 'SUPER_ADMIN') {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Hanya SUPER_ADMIN yang dapat membuat kepala gudang',
      });
    }

    const {
      gudangId,
      nama,
      email,
      password,
      noTelepon,
    } = req.body;

    if (!gudangId || !nama || !email || !password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'gudangId, nama, email, dan password wajib diisi',
      });
    }

    // Verify gudang exists
    const gudang = await prisma.gudang.findUnique({
      where: { id: gudangId },
    });

    if (!gudang) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Gudang tidak ditemukan',
      });
    }

    // Check if email already exists
    const existingUser = await prisma.pengguna.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        statusCode: 400,
        message: `Email "${email}" sudah digunakan`,
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create kepala gudang user
    const kepalGudang = await prisma.pengguna.create({
      data: {
        nama,
        email,
        kataSandi: hashedPassword,
        noTelepon: noTelepon || null,
        peran: 'ADMIN_GUDANG',
      },
    });

    // Link kepala gudang to warehouse
    await prisma.gudang.update({
      where: { id: gudangId },
      data: {
        penanggungJawabId: kepalGudang.id,
      },
    });

    console.log(
      `✓ [Kepala Gudang] Dibuat: ${kepalGudang.id}, linked to ${gudang.nama}`
    );

    return res.status(201).json({
      statusCode: 201,
      message: 'Kepala gudang berhasil dibuat',
      data: {
        kepalGudang,
        gudang: {
          id: gudang.id,
          kode: gudang.kode,
          nama: gudang.nama,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error creating kepala gudang:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
