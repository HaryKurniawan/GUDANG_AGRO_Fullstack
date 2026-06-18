import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@agro-gudang.web.id';
const APP_NAME = 'Agro Jabar Gudang';

/**
 * Kirim email reset password ke pengguna
 */
export async function sendResetPasswordEmail(params: {
  toEmail: string;
  toNama: string;
  resetToken: string;
  resetUrl: string;
}): Promise<void> {
  const { toEmail, toNama, resetToken, resetUrl } = params;

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password - ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#16a34a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${APP_NAME}</h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Sistem Manajemen Gudang</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">Reset Password</h2>
              <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                Halo <strong>${toNama || toEmail}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                Kami menerima permintaan untuk mereset password akun Anda di ${APP_NAME}. 
                Klik tombol di bawah ini untuk membuat password baru. 
                Link ini akan kedaluwarsa dalam <strong>1 jam</strong>.
              </p>
              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding:8px 0 32px;">
                    <a href="${resetUrl}" 
                       style="background-color:#16a34a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;display:inline-block;">
                      Reset Password Saya
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">
                Atau salin link berikut ke browser Anda:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#16a34a;font-size:13px;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Jika Anda tidak meminta reset password, abaikan email ini. 
                Password Anda tidak akan berubah. Untuk keamanan, jangan bagikan link ini kepada siapapun.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. Seluruh hak cipta dilindungi.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject: `Reset Password - ${APP_NAME}`,
    html,
  });

  if (error) {
    console.error('[EmailService] Gagal mengirim email reset password:', error);
    throw new Error(`Gagal mengirim email: ${error.message}`);
  }
}

/**
 * Kirim email konfirmasi password berhasil direset
 */
export async function sendPasswordResetSuccessEmail(params: {
  toEmail: string;
  toNama: string;
}): Promise<void> {
  const { toEmail, toNama } = params;

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Berhasil Direset - ${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#16a34a;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">${APP_NAME}</h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Sistem Manajemen Gudang</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#1f2937;font-size:20px;">✅ Password Berhasil Diperbarui</h2>
              <p style="margin:0 0 16px;color:#4b5563;font-size:15px;line-height:1.6;">
                Halo <strong>${toNama || toEmail}</strong>,
              </p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                Password akun Anda di ${APP_NAME} telah berhasil diperbarui. 
                Anda sekarang bisa login menggunakan password baru Anda.
              </p>
              <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                Jika Anda tidak melakukan perubahan ini, segera hubungi administrator sistem.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
                Email ini dikirim otomatis, harap jangan membalas email ini.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. Seluruh hak cipta dilindungi.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: toEmail,
    subject: `Password Berhasil Diperbarui - ${APP_NAME}`,
    html,
  });

  if (error) {
    console.error('[EmailService] Gagal mengirim email konfirmasi reset:', error);
    // Tidak throw di sini - email konfirmasi bukan critical path
  }
}
