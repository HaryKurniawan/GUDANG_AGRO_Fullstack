import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// GET /api/pemrosesan/ringkasan — Stats per tahap
export const getRingkasan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId } = req.query;
    const where: any = gudangId ? { gudangId: String(gudangId) } : {};

    const all = await prisma.pemrosesanGudang.findMany({ where });
    const stats = {
      total: all.length,
      sortir: all.filter(p => p.tahap === 'SORTIR').length,
      grading: all.filter(p => p.tahap === 'GRADING').length,
      pengemasan: all.filter(p => p.tahap === 'PENGEMASAN').length,
      stok: all.filter(p => p.tahap === 'STOK').length,
      selesai: all.filter(p => p.tahap === 'SELESAI').length,
      totalBeratMasukKg: all.reduce((s, p) => s + p.beratMasukKg, 0),
    };

    return res.json({ statusCode: 200, data: stats });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// GET /api/pemrosesan?tahap=SORTIR — List items at specific stage
export const getByTahap = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tahap, gudangId } = req.query;
    const where: any = {};
    if (tahap) where.tahap = String(tahap);
    if (gudangId) where.gudangId = String(gudangId);

    const data = await prisma.pemrosesanGudang.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ statusCode: 200, data });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// GET /api/pemrosesan/:id — Detail single item
export const getById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.pemrosesanGudang.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Tidak ditemukan' });
    return res.json({ statusCode: 200, data: item });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};


// POST /api/pemrosesan — Create from penerimaan (start pipeline)
export const createFromPenerimaan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { penerimaanId, gudangId, komoditasNama, beratMasukKg } = req.body;

    if (!penerimaanId || !gudangId || !komoditasNama || !beratMasukKg) {
      return res.status(400).json({ error: 'penerimaanId, gudangId, komoditasNama, beratMasukKg wajib diisi' });
    }

    const created = await prisma.pemrosesanGudang.create({
      data: {
        penerimaanId,
        gudangId,
        komoditasNama,
        beratMasukKg: parseFloat(beratMasukKg),
        tahap: 'SORTIR',
      },
    });

    return res.status(201).json({ statusCode: 201, data: created });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// PATCH /api/pemrosesan/:id/sortir — Complete sortir stage
export const completeSortir = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { beratBersihKg, rejectKg, catatan } = req.body;

    const updated = await prisma.pemrosesanGudang.update({
      where: { id },
      data: {
        sortirSelesai: true,
        sortirBeratBersihKg: beratBersihKg ? parseFloat(beratBersihKg) : null,
        sortirRejectKg: rejectKg ? parseFloat(rejectKg) : null,
        sortirCatatan: catatan || null,
        sortirOleh: req.user?.nama || 'Staff',
        sortirAt: new Date(),
        tahap: 'GRADING',
      },
    });

    return res.json({ statusCode: 200, data: updated, message: 'Sortir selesai, lanjut ke Grading' });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// PATCH /api/pemrosesan/:id/grading — Complete grading stage
export const completeGrading = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { gradeA_Kg, gradeB_Kg, gradeC_Kg, catatan } = req.body;

    const updated = await prisma.pemrosesanGudang.update({
      where: { id },
      data: {
        gradingSelesai: true,
        gradeA_Kg: gradeA_Kg ? parseFloat(gradeA_Kg) : null,
        gradeB_Kg: gradeB_Kg ? parseFloat(gradeB_Kg) : null,
        gradeC_Kg: gradeC_Kg ? parseFloat(gradeC_Kg) : null,
        gradingCatatan: catatan || null,
        gradingOleh: req.user?.nama || 'Staff',
        gradingAt: new Date(),
        tahap: 'PENGEMASAN',
      },
    });

    return res.json({ statusCode: 200, data: updated, message: 'Grading selesai, lanjut ke Pengemasan' });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// PATCH /api/pemrosesan/:id/kemas — Complete pengemasan stage
export const completePengemasan = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { jumlahKemasan, beratPerKemasan, jenisKemasan, catatan } = req.body;

    const updated = await prisma.pemrosesanGudang.update({
      where: { id },
      data: {
        kemasSelesai: true,
        jumlahKemasan: jumlahKemasan ? parseInt(jumlahKemasan) : null,
        beratPerKemasan: beratPerKemasan ? parseFloat(beratPerKemasan) : null,
        jenisKemasan: jenisKemasan || null,
        kemasCatatan: catatan || null,
        kemasOleh: req.user?.nama || 'Staff',
        kemasAt: new Date(),
        tahap: 'STOK',
      },
    });

    return res.json({ statusCode: 200, data: updated, message: 'Pengemasan selesai, siap masuk stok' });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// PATCH /api/pemrosesan/:id/masuk-stok — Finalize into stock
export const masukStok = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { produkGudangId } = req.body;

    const item = await prisma.pemrosesanGudang.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ error: 'Tidak ditemukan' });

    const updated = await prisma.pemrosesanGudang.update({
      where: { id },
      data: {
        masukStok: true,
        masukStokAt: new Date(),
        produkGudangId: produkGudangId || null,
        tahap: 'SELESAI',
      },
    });

    // If linked to a product, increment stock
    if (produkGudangId && item.sortirBeratBersihKg) {
      await prisma.produkGudang.update({
        where: { id: produkGudangId },
        data: { stok: { increment: item.sortirBeratBersihKg } },
      });
    }

    return res.json({ statusCode: 200, data: updated, message: 'Barang masuk stok gudang!' });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
