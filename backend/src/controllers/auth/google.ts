import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt, { type SignOptions } from 'jsonwebtoken';

import prisma from '../../prisma/client';

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.GUDANG_SELF_URL || 'http://localhost:5005'}/api/auth/google/callback`
);

export const getGoogleAuthUrl = (req: Request, res: Response) => {
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent'
  });
  
  res.redirect(url);
};

export const googleAuthCallback = async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3005';
  
  try {
    if (!code) {
      throw new Error('Tidak ada authorization code');
    }

    // Tukar code dengan token dari Google
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Ambil info profil user via Google userinfo endpoint
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userInfoResponse.json() as { email?: string; name?: string; picture?: string };

    if (!userInfo.email) {
      throw new Error('Email tidak ditemukan dari akun Google');
    }

    // Cek apakah user sudah terdaftar di DB
    const user = await prisma.pengguna.findUnique({
      where: { email: userInfo.email }
    });

    if (!user) {
      return res.redirect(`${frontendUrl}/login?error=Email+belum+terdaftar+di+sistem+Gudang`);
    }

    // Buat JWT Token Gudang
    const payload = {
      id: user.id,
      email: user.email,
      peran: user.peran,
    };

    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'];
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn });

    // Redirect kembali ke frontend dengan membawa token
    res.redirect(`${frontendUrl}/auth/callback?token=${jwtToken}`);

  } catch (error: unknown) {
    console.error('Error in googleAuthCallback:', error);
    res.redirect(`${frontendUrl}/login?error=Gagal+autentikasi+dengan+Google`);
  }
};
