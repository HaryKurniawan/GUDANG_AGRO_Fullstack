import { Router } from 'express';
import { login, getMe, updateProfile, forgotPassword, resetPassword, validateResetToken, getGoogleAuthUrl, googleAuthCallback } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Public: login
router.post('/login', login);

// Public: google auth
router.get('/google', getGoogleAuthUrl);
router.get('/google/callback', googleAuthCallback);

// Public: forgot password - kirim email reset
router.post('/forgot-password', forgotPassword);

// Public: validasi token reset (GET, untuk cek sebelum render form)
router.get('/reset-password/validate', validateResetToken as any);

// Public: reset password dengan token
router.post('/reset-password', resetPassword);

// Protected: get current user
router.get('/me', authMiddleware as any, getMe as any);

// Protected: update profile (nama, noTelepon)
router.patch('/me', authMiddleware as any, updateProfile as any);

export default router;
