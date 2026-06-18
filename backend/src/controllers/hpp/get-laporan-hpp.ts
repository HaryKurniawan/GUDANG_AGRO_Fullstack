import { Request, Response } from 'express';
import prisma from '../../prisma/client';

/**
 * GET /api/hpp/laporan
 * Laporan HPP & Margin semua produk
 * Returns all products with their HPP breakdown and margin info
 */
export const getLaporanHpp = async (req: Request, res: Response) => {
  try {
    const { gudangId } = req.query;

    const where: any = {};
    if (gudangId) where.gudangId = String(gudangId);

    // Get all produk gudang
    const produkWhere: any = {};
    if (gudangId) produkWhere.gudangId = String(gudangId);

    const allProduk = await prisma.produkGudang.findMany({
      where: produkWhere,
      select: { id: true, nama: true, satuan: true, hargaGudang: true, stok: true, gudangId: true },
      orderBy: { nama: 'asc' },
    });

    // Get all HPP records
    const allHpp = await prisma.hppProduk.findMany({ where });
    const hppMap = new Map(allHpp.map(h => [h.produkGudangId, h]));

    // Build laporan
    const laporan = allProduk.map(produk => {
      const hpp = hppMap.get(produk.id);
      return {
        produkId: produk.id,
        produkNama: produk.nama,
        satuan: produk.satuan,
        stok: produk.stok,
        hargaJual: produk.hargaGudang,
        // HPP components
        hargaBeliPetani: hpp?.hargaBeliPetani || 0,
        biayaSortir: hpp?.biayaSortir || 0,
        biayaGrading: hpp?.biayaGrading || 0,
        biayaPengemasan: hpp?.biayaPengemasan || 0,
        biayaOverhead: hpp?.biayaOverhead || 0,
        biayaLainnya: hpp?.biayaLainnya || 0,
        totalHpp: hpp?.totalHpp || 0,
        marginRp: hpp ? hpp.marginRp : produk.hargaGudang,
        marginPersen: hpp ? hpp.marginPersen : 100,
        hppConfigured: !!hpp,
      };
    });

    // Summary
    const configured = laporan.filter(l => l.hppConfigured);
    const avgMarginPersen = configured.length > 0
      ? configured.reduce((s, l) => s + l.marginPersen, 0) / configured.length
      : 0;
    const totalRevenuePotensial = laporan.reduce((s, l) => s + (l.hargaJual * l.stok), 0);
    const totalHppPotensial = configured.reduce((s, l) => s + (l.totalHpp * l.stok), 0);

    return res.status(200).json({
      statusCode: 200,
      data: {
        laporan,
        summary: {
          totalProduk: laporan.length,
          hppConfigured: configured.length,
          avgMarginPersen: Math.round(avgMarginPersen * 10) / 10,
          totalRevenuePotensial,
          totalHppPotensial,
          totalMarginPotensial: totalRevenuePotensial - totalHppPotensial,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[HPP] Error getLaporanHpp:', error);
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};
