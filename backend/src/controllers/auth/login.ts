import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email dan password wajib diisi',
      });
    }

    // Find user in pengguna table
    const user = await prisma.pengguna.findUnique({
      where: { email },
      include: {
        managedWarehouses: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Kredensial tidak valid: email atau password salah',
      });
    }

    // Verify role - only allow warehouse admins, staff, or super admins
    const allowedRoles = ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.peran)) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Akun Anda tidak memiliki hak akses gudang',
      });
    }

    // Compare bcrypt password
    const isMatch = await bcrypt.compare(password, user.kataSandi);
    if (!isMatch) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Kredensial tidak valid: email atau password salah',
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        peran: user.peran,
      },
      process.env.JWT_SECRET || 'gudang-fullstack-independent-super-secret-key-2026',
      {
        expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any,
      } as jwt.SignOptions
    );

    return res.status(200).json({
      statusCode: 200,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nama: user.nama,
          noTelepon: user.noTelepon,
          peran: user.peran,
          managedWarehouses: user.managedWarehouses,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error during login:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
