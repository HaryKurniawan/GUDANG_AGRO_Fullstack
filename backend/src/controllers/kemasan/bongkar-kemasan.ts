import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

// 3. Unpack packaged product back to bulk stock
export const bongkarKemasan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { produkGudangId, ukuranKg, jumlahKemasan } = req.body;

    if (!produkGudangId || !ukuranKg || !jumlahKemasan) {
      return res.status(400).json({
        statusCode: 400,
        message: 'produkGudangId, ukuranKg, dan jumlahKemasan wajib diisi'
      });
    }

    if (ukuranKg <= 0 || jumlahKemasan <= 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'ukuranKg dan jumlahKemasan harus lebih besar dari 0'
      });
    }

    // Get packaging configuration
    const kemasan = await prisma.konfigurasiKemasan.findUnique({
      where: {
        produkGudangId_ukuranKg: {
          produkGudangId,
          ukuranKg
        }
      }
    });

    if (!kemasan || kemasan.stokKemasan < jumlahKemasan) {
      return res.status(400).json({
        statusCode: 400,
        message: `Stok kemasan tidak mencukupi. Tersedia ${kemasan?.stokKemasan || 0} unit, ingin dibongkar ${jumlahKemasan} unit`
      });
    }

    const totalKgDikembalikan = ukuranKg * jumlahKemasan;

    // Execute in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Decrement packaging stock
      const updatedKemasan = await tx.konfigurasiKemasan.update({
        where: {
          id: kemasan.id
        },
        data: {
          stokKemasan: {
            decrement: jumlahKemasan
          }
        }
      });

      // 2. Increment bulk stock
      const updatedProduk = await tx.produkGudang.update({
        where: { id: produkGudangId },
        data: {
          stok: {
            increment: totalKgDikembalikan
          }
        }
      });

      return { updatedProduk, updatedKemasan };
    });

    return res.status(200).json({
      statusCode: 200,
      message: `Berhasil membongkar ${jumlahKemasan} unit kemasan ukuran ${ukuranKg}kg kembali ke bulk (Total: ${totalKgDikembalikan}kg)`,
      data: {
        produkGudangId: result.updatedProduk.id,
        nama: result.updatedProduk.nama,
        stokBulkKgBaru: result.updatedProduk.stok,
        kemasan: {
          id: result.updatedKemasan.id,
          ukuranKg: result.updatedKemasan.ukuranKg,
          stokKemasan: result.updatedKemasan.stokKemasan,
          totalKg: result.updatedKemasan.ukuranKg * result.updatedKemasan.stokKemasan
        }
      }
    });

  } catch (error: unknown) {
    console.error('Error unpacking product:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Terjadi kesalahan internal server saat pembongkaran kemasan',
      error: (error as Error).message
    });
  }
};
