import { Request, Response } from 'express';
import prisma from '../../prisma/client';
import { sendNotificationToGudang } from './send-notification-to-gudang';

// Endpoint to trigger a new stock request event from the ECOMMERCE backend to warehouse admins
export const triggerNewRequestEvent = async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key';

    if (apiKey !== validApiKey) {
      return res.status(401).json({ message: 'API Key tidak valid' });
    }

    const { gudangId, pengajuanId, tokoId, tokoNama, catatan, items, message, isPesananGrosir, alamatKirim, lat, lng, konsumenId } = req.body;

    if (!gudangId || !pengajuanId || !tokoId || !items) {
      return res.status(400).json({ message: 'Parameter tidak lengkap: membutuhkan gudangId, pengajuanId, tokoId, dan items' });
    }

    // 1. Sync the Stock Request to the Gudang Database
    // Using upsert in case of duplicate webhook firing
    await prisma.pengajuanStokToko.upsert({
      where: { id: pengajuanId },
      update: {
        catatan,
        status: 'DIAJUKAN',
        isPesananGrosir: isPesananGrosir || false,
        alamatKirim,
        lat,
        lng,
        konsumenId,
      },
      create: {
        id: pengajuanId,
        tokoId,
        tokoNama,
        gudangId,
        catatan,
        status: 'DIAJUKAN',
        isPesananGrosir: isPesananGrosir || false,
        alamatKirim,
        lat,
        lng,
        konsumenId,
        items: {
          create: items.map((item: any) => ({
            produkId: item.produkId || item.produkGudangId,
            produkNama: item.produkNama || item.namaProduk || 'Produk',
            jumlahPermintaan: item.jumlahPermintaan,
          })),
        },
      },
    });

    // 2. Fire the SSE Notification to connected Warehouse Admins/Staff
    sendNotificationToGudang(gudangId, {
      type: 'NEW_REQUEST',
      pengajuanId,
      tokoNama,
      message: message || `Ada pengajuan stok baru dari toko ${tokoNama}`,
    });

    return res.status(200).json({ message: 'Request stok berhasil disinkronisasi ke Gudang dan Event dipancarkan' });
  } catch (error: unknown) {
    return res.status(500).json({ message: 'Gagal memancarkan event', error: (error as Error).message });
  }
};
