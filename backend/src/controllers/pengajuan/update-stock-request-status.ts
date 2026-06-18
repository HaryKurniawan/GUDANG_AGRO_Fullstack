import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { sendNotificationToSellers } from '../sse.controller';
import { formatStockRequest } from './helpers';

export const updateStockRequestStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, catatan, itemUpdates } = req.body;

    if (!status) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Status wajib dicantumkan',
      });
    }

    const request = await prisma.pengajuanStokToko.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            kemasanDetail: true
          }
        }
      },
    });

    if (!request) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Pengajuan stok tidak ditemukan',
      });
    }

    // Authorization check
    const isSuperAdmin = req.user?.peran === 'SUPER_ADMIN';
    const isAuthorized = isSuperAdmin || req.user?.managedWarehouses.includes(request.gudangId);

    if (!isAuthorized) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Anda tidak mengelola gudang penanggung jawab pengajuan ini',
      });
    }

    // Update quantities approved & price & packaging details in DB if provided (when status is moving to DIPROSES or during editor)
    if (itemUpdates && itemUpdates.length > 0) {
      for (const update of itemUpdates) {
        const qtyApproved = update.jumlahDisetujui !== undefined ? Number(update.jumlahDisetujui) : undefined;
        const pricePerUnit = update.hargaPerUnit !== undefined ? Number(update.hargaPerUnit) : undefined;
        
        const updateObj: { jumlahDisetujui?: number; hargaPerUnit?: number; totalHarga?: number } = {};
        if (qtyApproved !== undefined) updateObj.jumlahDisetujui = qtyApproved;
        if (pricePerUnit !== undefined) updateObj.hargaPerUnit = pricePerUnit;
        
        if (qtyApproved !== undefined && pricePerUnit !== undefined) {
          updateObj.totalHarga = qtyApproved * pricePerUnit;
        }

        // Save selected packaging details to database if provided (kemasanDetail)
        if (update.kemasanDetail && Array.isArray(update.kemasanDetail)) {
          // Delete old packaging details
          await prisma.itemPengajuanStokKemasan.deleteMany({
            where: { itemPengajuanStokId: update.itemId }
          });

          // Insert new packaging details
          if (update.kemasanDetail.length > 0) {
            await prisma.itemPengajuanStokKemasan.createMany({
              data: update.kemasanDetail.map((k: any) => ({
                itemPengajuanStokId: update.itemId,
                ukuranKg: Number(k.ukuranKg),
                jumlahKemasan: Number(k.jumlahKemasan)
              }))
            });
          }
        }

        await prisma.itemPengajuanStok.update({
          where: { id: update.itemId },
          data: updateObj,
        });
      }
    }

    // ── Validasi stok cukup sebelum DIPROSES / DIKIRIM ───────────────────────
    // Pesanan mengambil stok terkemas sesuai ukuran; defisit ditutup dari stok
    // curah (bulk). Jika bulk pun tidak cukup → blok transisi.
    const akanMengurangiStok =
      (status === 'DIPROSES' && request.status !== 'DIPROSES') ||
      (status === 'DIKIRIM' && request.status === 'DIAJUKAN');

    if (akanMengurangiStok) {
      // Ambil ulang item dengan kemasanDetail terbaru (setelah itemUpdates disimpan)
      const itemsForCheck = await prisma.itemPengajuanStok.findMany({
        where: { pengajuanId: id },
        include: { kemasanDetail: true },
      });

      const kekurangan: string[] = [];

      for (const item of itemsForCheck) {
        const matchedUpdate = itemUpdates?.find((u: any) => u.itemId === item.id);
        const produkGudangId = matchedUpdate?.produkGudangId;

        let produkGudang = null;
        if (produkGudangId) {
          produkGudang = await prisma.produkGudang.findUnique({
            where: { id: produkGudangId },
            include: { kemasan: true },
          });
        }
        if (!produkGudang && item.produkId) {
          produkGudang = await prisma.produkGudang.findFirst({
            where: { id: item.produkId, gudangId: request.gudangId },
            include: { kemasan: true },
          });
        }
        if (!produkGudang && item.produkNama) {
          produkGudang = await prisma.produkGudang.findFirst({
            where: {
              gudangId: request.gudangId,
              nama: { equals: item.produkNama, mode: 'insensitive' },
            },
            include: { kemasan: true },
          });
        }

        if (!produkGudang) {
          kekurangan.push(`${item.produkNama || 'Produk'}: produk sumber tidak ditemukan di gudang`);
          continue;
        }

        const bulkTersedia = Number(produkGudang.stok) || 0;
        const kemasanDetailList = item.kemasanDetail || [];

        if (kemasanDetailList.length > 0) {
          // Hitung total kg yang perlu diambil dari bulk untuk menutup defisit pack
          let butuhDariBulk = 0;
          for (const pkg of kemasanDetailList) {
            const ukuranKg = Number(pkg.ukuranKg);
            const jumlahReq = Number(pkg.jumlahKemasan);
            if (jumlahReq <= 0) continue;
            const config = produkGudang.kemasan.find((k: any) => k.ukuranKg === ukuranKg);
            const stokKemasan = config ? config.stokKemasan : 0;
            const defisitPack = Math.max(0, jumlahReq - stokKemasan);
            butuhDariBulk += defisitPack * ukuranKg;
          }
          if (butuhDariBulk > bulkTersedia) {
            const kurangKg = Math.round((butuhDariBulk - bulkTersedia) * 10) / 10;
            kekurangan.push(`${produkGudang.nama}: kurang ${kurangKg} kg (perlu dikemas ${butuhDariBulk} kg dari curah, stok curah ${bulkTersedia} kg)`);
          }
        } else {
          // Tanpa rincian kemasan → ambil langsung dari bulk
          const qtyToDeduct = item.jumlahDisetujui || item.jumlahPermintaan;
          if (qtyToDeduct > bulkTersedia) {
            const kurangKg = Math.round((qtyToDeduct - bulkTersedia) * 10) / 10;
            kekurangan.push(`${produkGudang.nama}: kurang ${kurangKg} kg (butuh ${qtyToDeduct} kg, stok ${bulkTersedia} kg)`);
          }
        }
      }

      if (kekurangan.length > 0) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Stok gudang tidak mencukupi untuk memproses pengajuan. Teruskan ke kepala petani terlebih dahulu untuk menambah stok.',
          kekurangan,
        });
      }
    }

    // Update the parent status and description
    const updatedRequest = await prisma.pengajuanStokToko.update({
      where: { id },
      data: {
        status,
        catatan: catatan !== undefined ? catatan : request.catatan,
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

    // Business Logic: Deduct warehouse stock if status transitions to DIPROSES
    if (status === 'DIPROSES' && request.status !== 'DIPROSES') {
      try {
        for (const item of updatedRequest.items) {
          const qtyToDeduct = item.jumlahDisetujui || item.jumlahPermintaan;
          
          // Find the source product in this warehouse
          const matchedUpdate = itemUpdates?.find((u: any) => u.itemId === item.id);
          const produkGudangId = matchedUpdate?.produkGudangId;

          let produkGudang = null;
          if (produkGudangId) {
            produkGudang = await prisma.produkGudang.findUnique({
              where: { id: produkGudangId },
              include: { kemasan: true }
            });
          } else if (item.produkId) {
            produkGudang = await prisma.produkGudang.findFirst({
              where: {
                id: item.produkId,
                gudangId: updatedRequest.gudangId,
              },
              include: { kemasan: true }
            });
          }

          if (!produkGudang && item.produkNama) {
            produkGudang = await prisma.produkGudang.findFirst({
              where: {
                gudangId: updatedRequest.gudangId,
                nama: {
                  equals: item.produkNama,
                  mode: 'insensitive',
                },
              },
              include: { kemasan: true }
            });
          }

          if (produkGudang) {
            const kemasanDetailList = item.kemasanDetail || [];
            
            // Deduct each package size
            for (const pkg of kemasanDetailList) {
              const ukuranKg = Number(pkg.ukuranKg);
              const jumlahKemasanReq = Number(pkg.jumlahKemasan);
              if (jumlahKemasanReq <= 0) continue;

              // Find in KonfigurasiKemasan
              const configKemasan = produkGudang.kemasan.find((k: any) => k.ukuranKg === ukuranKg);
              const stokKemasanTersedia = configKemasan ? configKemasan.stokKemasan : 0;

              if (stokKemasanTersedia >= jumlahKemasanReq) {
                // Case 1: Enough packed stock in KonfigurasiKemasan
                await prisma.konfigurasiKemasan.update({
                  where: { id: configKemasan!.id },
                  data: {
                    stokKemasan: {
                      decrement: jumlahKemasanReq
                    }
                  }
                });
                console.log(`[Stok Gudang] Fulfill ${jumlahKemasanReq} packs @ ${ukuranKg}kg directly from package stock of ${produkGudang.nama}`);
              } else {
                // Case 2: Not enough packed stock. Auto-pack from bulk!
                const deficit = jumlahKemasanReq - stokKemasanTersedia;
                const kgFromBulk = deficit * ukuranKg;

                // Deduct any remaining packed stock
                if (stokKemasanTersedia > 0) {
                  await prisma.konfigurasiKemasan.update({
                    where: { id: configKemasan!.id },
                    data: { stokKemasan: 0 }
                  });
                }

                // If KonfigurasiKemasan doesn't exist at all, we create/upsert it with 0
                if (!configKemasan) {
                  await prisma.konfigurasiKemasan.create({
                    data: {
                      produkGudangId: produkGudang.id,
                      ukuranKg: ukuranKg,
                      stokKemasan: 0,
                      isActive: true
                    }
                  });
                }

                // Deduct bulk stock
                await prisma.produkGudang.update({
                  where: { id: produkGudang.id },
                  data: {
                    stok: {
                      decrement: kgFromBulk
                    }
                  }
                });
                console.log(`[Stok Gudang] Auto-packaged ${deficit} packs @ ${ukuranKg}kg from bulk stock for ${produkGudang.nama}. Deducted ${kgFromBulk}kg from bulk.`);
              }
            }

            // Fallback: If no packaging details were specified at all, deduct from bulk stock directly
            if (kemasanDetailList.length === 0 && qtyToDeduct > 0) {
              await prisma.produkGudang.update({
                where: { id: produkGudang.id },
                data: {
                  stok: {
                    decrement: qtyToDeduct
                  }
                }
              });
              console.log(`[Stok Gudang] Fulfill ${qtyToDeduct}kg directly from bulk stock (no packaging breakdown specified) for ${produkGudang.nama}`);
            }
          } else {
            console.warn(`[Stok Gudang] Peringatan: Produk sumber untuk '${item.produkNama}' tidak ditemukan di Gudang ${updatedRequest.gudangId}. Stok tidak dikurangi.`);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to deduct warehouse stock:', (err as Error).message || err);
      }
    }

    // Rich formatted request to return
    // Fetch matched products for the formatted return payload
    const itemsWithProductConfig = await Promise.all(
      updatedRequest.items.map(async (item) => {
        const produkGudang = await prisma.produkGudang.findUnique({
          where: { id: item.produkId },
          include: { kemasan: { orderBy: { ukuranKg: 'asc' } }, masterKomoditas: true }
        });
        return {
          ...item,
          produkGudang
        };
      })
    );
    const formatted = formatStockRequest(updatedRequest, itemsWithProductConfig);

    // Asynchronously synchronize status update to E-commerce NestJS backend
    const ecomBaseUrl = process.env.ECOMMERCE_BACKEND_URL || 'http://127.0.0.1:4000';
    
    // Use ecommerceRequestId if available, otherwise use GUDANG internal ID
    const ecommerceId = updatedRequest.ecommerceRequestId || id;
    const webhookUrl = `${ecomBaseUrl}/api/ecommerce/pengajuan-stok/webhook/${ecommerceId}/status`;
    
    const mappedItemUpdates = updatedRequest.items.map((it: any) => ({
      itemId: it.id,
      produkGudangId: it.produkId,
      jumlahDisetujui: it.jumlahDisetujui || it.jumlahPermintaan,
      hargaBeli: it.hargaPerUnit || undefined,
      kemasanDetail: (it.kemasanDetail || []).map((k: any) => ({
        ukuranKg: k.ukuranKg,
        jumlahKemasan: k.jumlahKemasan
      }))
    }));

    console.log(`[Webhook Sync] Mengirim update status ${updatedRequest.status} ke E-commerce: ${webhookUrl}`);

    fetch(webhookUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ECOMMERCE_API_KEY || 'ecommerce-nestjs-to-gudang-express-secure-key',
      },
      body: JSON.stringify({
        status: updatedRequest.status,
        catatan: updatedRequest.catatan,
        itemUpdates: mappedItemUpdates,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[Webhook Sync] ❌ GAGAL - Status ${response.status}: ${errText}`);
        } else {
          console.log(`[Webhook Sync] ✅ SUKSES - Status ${updatedRequest.status} untuk pengajuan #${id} berhasil dikirim ke E-commerce`);
        }
      })
      .catch((err) => {
        console.warn(`[Webhook Sync] ❌ GAGAL terhubung ke E-commerce:`, (err as Error).message, `| URL: ${webhookUrl}`);
      });

    // Notify the Ecommerce Seller via SSE update stream (gracefully fallback since it is separate now)
    try {
      sendNotificationToSellers(updatedRequest.tokoId, {
        type: 'STATUS_UPDATED',
        // Kirim ecommerceRequestId agar cocok dengan id yang dipakai frontend seller (ECOMMERCE)
        requestId: updatedRequest.ecommerceRequestId || updatedRequest.id,
        gudangRequestId: updatedRequest.id,
        status: updatedRequest.status,
        message: `Pengajuan stok Anda #${(updatedRequest.ecommerceRequestId || updatedRequest.id).substring(0, 8)} statusnya kini: ${updatedRequest.status}`,
      });
    } catch (sseErr) {
      console.log('SSE notification gracefully skipped in decoupled mode');
    }

    return res.status(200).json({
      statusCode: 200,
      message: 'Status pengajuan stok berhasil diperbarui',
      data: formatted,
    });
  } catch (error: unknown) {
    console.error('Error updating stock request status:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server',
      error: (error as Error).message,
    });
  }
};
