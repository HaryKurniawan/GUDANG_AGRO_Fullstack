import { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../../prisma/client';
import { sendResetPasswordEmail } from '../../services/email.service';

// URL frontend gudang untuk halaman reset password
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3005';
// Token berlaku selama 1 jam
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000;

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Email wajib diisi',
      });
    }

    // Selalu kembalikan 200 meskipun email tidak ditemukan (security best practice)
    const successResponse = () =>
      res.status(200).json({
        statusCode: 200,
        message:
          'Jika email Anda terdaftar, Anda akan menerima instruksi reset password.',
      });

    const user = await prisma.pengguna.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, nama: true, peran: true },
    });

    if (!user) {
      return successResponse();
    }

    // Pastikan hanya akun gudang yang bisa reset
    const allowedRoles = ['ADMIN_GUDANG', 'STAF_GUDANG', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(user.peran)) {
      return successResponse();
    }

    // Generate secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    // Simpan token (hashed) ke database
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    await (prisma.pengguna as any).update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: resetExpiry,
      },
    });

    // Kirim email dengan raw token (bukan hashed)
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    await sendResetPasswordEmail({
      toEmail: user.email,
      toNama: user.nama || user.email,
      resetToken,
      resetUrl,
    });

    console.log(`[ForgotPassword] Email reset dikirim ke: ${user.email}`);
    return successResponse();
  } catch (error: unknown) {
    console.error('[ForgotPassword] Error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
    });
  }
};
