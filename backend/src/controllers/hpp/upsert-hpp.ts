import { Request, Response } from 'express';
import prisma from '../../prisma/client';

/**
 * POST /api/hpp
 * Create or Update HPP for a product (upsert)
 * Body: { produkGudangId, gudangId, hargaBeliPetani, biayaSortir, biayaGrading, biayaPengemasan, biayaOverhead, biayaLainnya, catatan }
 */
export const upsertHpp = async (req: Request, res: Response) => {
  try {
    const {
      produkGudangId,
      gudangId,
      hargaBeliPetani = 0,
      biayaSortir = 0,
      biayaGrading = 0,
      biayaPengemasan = 0,
      biayaOverhead = 0,
      biayaLainnya = 0,
      marginRp = 0,
      catatan,
    } = req.body;

    if (!produkGudangId || !gudangId) {
      return res.status(400).json({ statusCode: 400, message: 'produkGudangId dan gudangId wajib diisi' });
    }

    // Get produk to ensure it exists
    const produk = await prisma.produkGudang.findUnique({
      where: { id: produkGudangId },
    });

    if (!produk) {
      return res.status(404).json({ statusCode: 404, message: 'Produk gudang tidak ditemukan' });
    }

    const totalHpp = Number(hargaBeliPetani) + Number(biayaSortir) + Number(biayaGrading) + Number(biayaPengemasan) + Number(biayaOverhead) + Number(biayaLainnya);
    const calculatedHargaJual = totalHpp + Number(marginRp);
    const marginPersen = calculatedHargaJual > 0 ? (Number(marginRp) / calculatedHargaJual) * 100 : 0;

    const data = {
      gudangId,
      hargaBeliPetani: Number(hargaBeliPetani),
      biayaSortir: Number(biayaSortir),
      biayaGrading: Number(biayaGrading),
      biayaPengemasan: Number(biayaPengemasan),
      biayaOverhead: Number(biayaOverhead),
      biayaLainnya: Number(biayaLainnya),
      totalHpp,
      hargaJual: calculatedHargaJual,
      marginRp: Number(marginRp),
      marginPersen,
      catatan: catatan || null,
    };

    // Upsert HPP and update ProdukGudang price in transaction
    const [hpp] = await prisma.$transaction([
      prisma.hppProduk.upsert({
        where: { produkGudangId },
        create: { produkGudangId, ...data },
        update: data,
      }),
      prisma.produkGudang.update({
        where: { id: produkGudangId },
        data: { hargaGudang: calculatedHargaJual }
      })
    ]);

    return res.status(200).json({
      statusCode: 200,
      message: 'HPP berhasil disimpan',
      data: hpp,
    });
  } catch (error: unknown) {
    console.error('[HPP] Error upsertHpp:', error);
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};
