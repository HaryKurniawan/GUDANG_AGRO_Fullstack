import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        statusCode: 401,
        message: 'Pengguna tidak terautentikasi',
      });
    }

    const { nama, noTelepon } = req.body;

    const updated = await prisma.pengguna.update({
      where: { id: req.user.id },
      data: {
        ...(nama !== undefined && { nama }),
        ...(noTelepon !== undefined && { noTelepon }),
      },
      select: {
        id: true,
        email: true,
        nama: true,
        noTelepon: true,
        peran: true,
      },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Profil berhasil diperbarui',
      data: updated,
    });
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
