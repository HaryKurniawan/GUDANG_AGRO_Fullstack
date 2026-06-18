import { Request, Response } from 'express';
import prisma from '../../prisma/client';
import { sendNotificationToSellers } from '../sse.controller';
import { formatStockRequest } from './helpers';

export const createStockRequestFromEcommerce = async (req: Request, res: Response) => {
  try {
    const {
      ecommerceRequestId,
      tokoId,
      tokoNama,
      gudangId,
      catatan,
      modePengemasan,
      items,
    } = req.body;

    if (!ecommerceRequestId || !tokoId || !gudangId || !items || items.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields: ecommerceRequestId, tokoId, gudangId, items',
      });
    }

    // Check if pengajuan already exists (idempotency)
    const existing = await prisma.pengajuanStokToko.findUnique({
      where: { ecommerceRequestId },
      include: {
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        items: {
          include: {
            kemasanDetail: true
          }
        },
      },
    });

    if (existing) {
      console.log(`[Webhook] Pengajuan ${ecommerceRequestId} sudah ada, skip duplikat`);
      return res.status(200).json({
        statusCode: 200,
        message: 'Pengajuan stok sudah ada (idempotent)',
        data: formatStockRequest(existing),
      });
    }

    // Create pengajuan stok in GUDANG database
    const pengajuan = await prisma.pengajuanStokToko.create({
      data: {
        ecommerceRequestId,
        tokoId,
        tokoNama,
        gudangId,
        catatan,
        status: 'DIAJUKAN',
        modePengemasan: modePengemasan || 'DEFAULT',
        items: {
          create: items.map((item: any) => ({
            produkId: item.produkGudangId,
            produkNama: item.namaProduk,
            jumlahPermintaan: item.jumlahPermintaan,
            ukuranKemasanKg: item.ukuranKemasanKg !== undefined ? Number(item.ukuranKemasanKg) : null,
            jumlahKemasan: item.jumlahKemasan !== undefined ? Number(item.jumlahKemasan) : null,
            totalKg: item.totalKg !== undefined ? Number(item.totalKg) : null,
            kemasanDetail: item.kemasanDetail ? {
              create: item.kemasanDetail.map((k: any) => ({
                ukuranKg: Number(k.ukuranKg),
                jumlahKemasan: Number(k.jumlahKemasan)
              }))
            } : undefined
          })),
        },
      },
      include: {
        gudang: {
          select: {
            id: true,
            kode: true,
            nama: true,
          },
        },
        items: {
          include: {
            kemasanDetail: true
          }
        },
      },
    });

    console.log(`[Webhook] ✅ Pengajuan stok ${ecommerceRequestId} berhasil dibuat di GUDANG DB`);

    // Trigger SSE notification to warehouse staff
    try {
      sendNotificationToSellers(gudangId, {
        type: 'NEW_STOCK_REQUEST',
        requestId: pengajuan.id,
        tokoNama,
        message: `Ada pengajuan stok baru dari ${tokoNama}`,
      });
    } catch (sseErr) {
      console.warn('SSE notification failed:', sseErr);
    }

    return res.status(201).json({
      statusCode: 201,
      message: 'Pengajuan stok berhasil diterima dan disimpan',
      data: formatStockRequest(pengajuan),
    });
  } catch (error: unknown) {
    console.error('[Webhook] Error creating stock request:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
