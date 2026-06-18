import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { JENIS_PEMBELI, STATUS_PENJUALAN } from './helpers';

export const updatePenjualanKeluar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
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

    const existing = await prisma.penjualanKeluar.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Data penjualan keluar tidak ditemukan' });
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

    // Hitung ulang totalNilai jika berat atau harga berubah
    const berat = beratKg !== undefined ? Number(beratKg) : existing.beratKg;
    const harga = hargaPerKg !== undefined ? Number(hargaPerKg) : existing.hargaPerKg;
    if (beratKg !== undefined && (!berat || berat <= 0)) {
      return res.status(400).json({ statusCode: 400, message: 'beratKg harus lebih besar dari 0' });
    }

    const updated = await prisma.penjualanKeluar.update({
      where: { id },
      data: {
        komoditasNama: komoditasNama !== undefined ? String(komoditasNama).trim() : undefined,
        kodeKomoditasGlobal:
          kodeKomoditasGlobal !== undefined
            ? kodeKomoditasGlobal
              ? String(kodeKomoditasGlobal).trim()
              : null
            : undefined,
        masterKomoditasId: masterKomoditasId !== undefined ? masterKomoditasId || null : undefined,
        penerimaanId: penerimaanId !== undefined ? penerimaanId || null : undefined,
        petaniNama: petaniNama !== undefined ? petaniNama || null : undefined,
        beratKg: beratKg !== undefined ? berat : undefined,
        hargaPerKg: hargaPerKg !== undefined ? harga : undefined,
        totalNilai: beratKg !== undefined || hargaPerKg !== undefined ? berat * harga : undefined,
        tujuanPenjualan: tujuanPenjualan !== undefined ? String(tujuanPenjualan).trim() : undefined,
        jenisPembeli: jenisPembeli !== undefined ? (jenisPembeli as any) : undefined,
        metodePembayaran: metodePembayaran !== undefined ? metodePembayaran || null : undefined,
        tanggalPenjualan: tanggalPenjualan !== undefined ? new Date(tanggalPenjualan) : undefined,
        catatan: catatan !== undefined ? catatan || null : undefined,
        status: status !== undefined ? (status as any) : undefined,
      },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Penjualan keluar berhasil diperbarui',
      data: updated,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal memperbarui penjualan keluar',
      error: (error as Error).message,
    });
  }
};
