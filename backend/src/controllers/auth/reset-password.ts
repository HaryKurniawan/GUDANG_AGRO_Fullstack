import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../../prisma/client';
import { sendPasswordResetSuccessEmail } from '../../services/email.service';

const BCRYPT_ROUNDS = 12;

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Token dan password baru wajib diisi',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Password minimal 8 karakter',
      });
    }

    // Hash token untuk dibandingkan dengan yang tersimpan
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Cari user dengan token yang valid dan belum kedaluwarsa
    const user = await (prisma.pengguna as any).findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: {
          gt: new Date(),
        },
      },
      select: { id: true, email: true, nama: true },
    });

    if (!user) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Token tidak valid atau sudah kedaluwarsa. Silakan minta reset password baru.',
      });
    }

    // Hash password baru
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Update password dan hapus token reset
    await (prisma.pengguna as any).update({
      where: { id: user.id },
      data: {
        kataSandi: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpiry: null,
      },
    });

    // Kirim email konfirmasi (non-blocking)
    sendPasswordResetSuccessEmail({
      toEmail: user.email,
      toNama: user.nama || user.email,
    }).catch((err) => {
      console.error('[ResetPassword] Gagal kirim email konfirmasi:', err);
    });

    console.log(`[ResetPassword] Password berhasil direset untuk: ${user.email}`);
    return res.status(200).json({
      statusCode: 200,
      message: 'Password berhasil diperbarui. Silakan login dengan password baru Anda.',
    });
  } catch (error: unknown) {
    console.error('[ResetPassword] Error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
};

/**
 * Validasi token reset password (untuk cek apakah token masih valid sebelum render form)
 */
export const validateResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        statusCode: 400,
        message: 'Token wajib disertakan',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await (prisma.pengguna as any).findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: {
          gt: new Date(),
        },
      },
      select: { email: true },
    });

    if (!user) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Token tidak valid atau sudah kedaluwarsa',
        valid: false,
      });
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Token valid',
      valid: true,
      email: user.email,
    });
  } catch (error: unknown) {
    console.error('[ValidateResetToken] Error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
    });
  }
};
