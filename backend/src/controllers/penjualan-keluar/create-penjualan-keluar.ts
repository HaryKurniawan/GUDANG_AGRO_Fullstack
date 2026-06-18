import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { JENIS_PEMBELI, STATUS_PENJUALAN, generateNomorPenjualan } from './helpers';

export const createPenjualanKeluar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      gudangId,
      komoditasNama,
      kodeKomoditasGlobal,
      masterKomoditasId,
      penerimaanId,
      petaniNama,
      beratKg,
      hargaPerKg,
      tujuanPenjualan,
      jenisPembeli,
      metodePembayaran,
      tanggalPenjualan,
      catatan,
      status,
    } = req.body;

    const dicatatOlehId = req.user?.id;
    if (!dicatatOlehId) {
      return res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
    }

    // Validasi field wajib
    if (!komoditasNama || !String(komoditasNama).trim()) {
      return res.status(400).json({ statusCode: 400, message: 'komoditasNama wajib diisi' });
    }
    const berat = Number(beratKg);
    if (!berat || berat <= 0) {
      return res.status(400).json({ statusCode: 400, message: 'beratKg harus lebih besar dari 0' });
    }
    if (!tujuanPenjualan || !String(tujuanPenjualan).trim()) {
      return res.status(400).json({ statusCode: 400, message: 'tujuanPenjualan (pembeli) wajib diisi' });
    }
    if (jenisPembeli && !JENIS_PEMBELI.includes(String(jenisPembeli))) {
      return res.status(400).json({
        statusCode: 400,
        message: `jenisPembeli tidak valid. Pilihan: ${JENIS_PEMBELI.join(', ')}`,
      });
    }
    if (status && !STATUS_PENJUALAN.includes(String(status))) {
      return res.status(400).json({
        statusCode: 400,
        message: `status tidak valid. Pilihan: ${STATUS_PENJUALAN.join(', ')}`,
      });
    }

    const harga = Number(hargaPerKg) || 0;
    const totalNilai = berat * harga;

    const created = await prisma.penjualanKeluar.create({
      data: {
        nomorPenjualan: generateNomorPenjualan(),
        gudangId: gudangId || null,
        dicatatOlehId,
        komoditasNama: String(komoditasNama).trim(),
        kodeKomoditasGlobal: kodeKomoditasGlobal ? String(kodeKomoditasGlobal).trim() : null,
        masterKomoditasId: masterKomoditasId || null,
        penerimaanId: penerimaanId || null,
        petaniNama: petaniNama || null,
        beratKg: berat,
        hargaPerKg: harga,
        totalNilai,
        tujuanPenjualan: String(tujuanPenjualan).trim(),
        jenisPembeli: (jenisPembeli as any) || 'LAINNYA',
        metodePembayaran: metodePembayaran || null,
        tanggalPenjualan: tanggalPenjualan ? new Date(tanggalPenjualan) : new Date(),
        catatan: catatan || null,
        status: (status as any) || 'TERCATAT',
      },
    });

    return res.status(201).json({
      statusCode: 201,
      message: 'Penjualan keluar berhasil dicatat',
      data: created,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal mencatat penjualan keluar',
      error: (error as Error).message,
    });
  }
};
