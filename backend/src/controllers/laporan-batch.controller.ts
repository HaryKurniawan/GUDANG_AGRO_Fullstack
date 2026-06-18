import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

/**
 * GET /api/laporan/batch
 * Laporan batch pemrosesan: dari penerimaan petani → hasil akhir stok/kemasan
 *
 * Setiap batch = 1 PenerimaanGudang + linked PemrosesanGudang
 * Output: berapa masuk, berapa bersih, grade A/B/C, kemasan berapa, reject berapa
 */
export const getLaporanBatch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId, status, dateFrom, dateTo, komoditas, limit = '50', page = '1' } = req.query;

    const where: any = {};

    // Filter by gudang
    if (gudangId) {
      where.gudangId = String(gudangId);
    } else if (req.user?.peran !== 'SUPER_ADMIN') {
      const myGudangs = req.user?.managedWarehouses || [];
      if (myGudangs.length > 0) {
        where.gudangId = { in: myGudangs };
      }
    }

    // Date filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(String(dateFrom));
      if (dateTo) {
        const to = new Date(String(dateTo));
        to.setHours(23, 59, 59);
        where.createdAt.lte = to;
      }
    }

    // Komoditas filter
    if (komoditas) {
      where.komoditasNama = { contains: String(komoditas), mode: 'insensitive' };
    }

    const pageNum = parseInt(String(page));
    const limitNum = parseInt(String(limit));
    const skip = (pageNum - 1) * limitNum;

    // Fetch penerimaan with linked processing
    const [penerimaanList, total] = await Promise.all([
      (prisma.penerimaanGudang as any).findMany({
        where,
        include: {
          gudang: { select: { id: true, nama: true, kode: true } },
          penerima: { select: { id: true, nama: true } },
          gradings: { select: { namaGrade: true, beratKg: true, isReject: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      (prisma.penerimaanGudang as any).count({ where }),
    ]);

    // For each penerimaan, find linked pemrosesan
    const penerimaanIds = penerimaanList.map((p: any) => p.id);
    const pemrosesanList = await prisma.pemrosesanGudang.findMany({
      where: { penerimaanId: { in: penerimaanIds } },
    });
    const pemrosesanMap = new Map(pemrosesanList.map((pm: any) => [pm.penerimaanId, pm]));

    // Build batch report
    const batchReport = penerimaanList.map((pn: any) => {
      const pm = pemrosesanMap.get(pn.id) as any;

      // From grading records
      const gradeA = pn.gradings.filter((g: any) => g.namaGrade === 'A' && !g.isReject).reduce((s: number, g: any) => s + g.beratKg, 0);
      const gradeB = pn.gradings.filter((g: any) => g.namaGrade === 'B' && !g.isReject).reduce((s: number, g: any) => s + g.beratKg, 0);
      const gradeC = pn.gradings.filter((g: any) => g.namaGrade === 'C' && !g.isReject).reduce((s: number, g: any) => s + g.beratKg, 0);
      const reject = pn.gradings.filter((g: any) => g.isReject).reduce((s: number, g: any) => s + g.beratKg, 0);

      // From pemrosesan (if exists)
      const beratBersih = pm?.sortirBeratBersihKg || null;
      const sortirReject = pm?.sortirRejectKg || 0;
      const gradeA_pm = pm?.gradeA_Kg || gradeA;
      const gradeB_pm = pm?.gradeB_Kg || gradeB;
      const gradeC_pm = pm?.gradeC_Kg || gradeC;
      const jumlahKemasan = pm?.jumlahKemasan || 0;
      const beratPerKemasan = pm?.beratPerKemasan || null;
      const jenisKemasan = pm?.jenisKemasan || null;
      const totalKgKemasan = jumlahKemasan * (beratPerKemasan || 0);

      const tahapSaatIni = pm?.tahap || 'BELUM_DIPROSES';
      const selesai = pm?.masukStok || false;

      return {
        // Identifiers
        penerimaanId: pn.id,
        nomorPenerimaan: pn.nomorPenerimaan,
        pemrosesanId: pm?.id || null,
        tanggal: pn.createdAt,

        // Komoditas & Asal
        komoditasNama: pn.komoditasNama || 'Tidak diketahui',
        petaniNama: pn.petaniNama || 'Tidak diketahui',
        gudang: pn.gudang,
        penerima: pn.penerima,

        // INPUT
        beratMasukKg: pn.beratDiterimaKg,
        kondisiMasuk: pn.kondisi,

        // SORTIR
        beratBersihKg: beratBersih || pn.beratDiterimaKg,
        sortirRejectKg: sortirReject,
        sortirSelesai: pm?.sortirSelesai || false,
        sortirAt: pm?.sortirAt || null,

        // GRADING
        gradeA_Kg: gradeA_pm,
        gradeB_Kg: gradeB_pm,
        gradeC_Kg: gradeC_pm,
        rejectKg: reject || 0,
        gradingSelesai: pm?.gradingSelesai || false,
        gradingAt: pm?.gradingAt || null,

        // PENGEMASAN
        jumlahKemasan,
        beratPerKemasan,
        jenisKemasan,
        totalKgKemasan,
        kemasSelesai: pm?.kemasSelesai || false,
        kemasAt: pm?.kemasAt || null,

        // HASIL AKHIR
        masukStok: selesai,
        masukStokAt: pm?.masukStokAt || null,
        stokAkhirKg: gradeA_pm + gradeB_pm + gradeC_pm,

        // SUSUT (berat hilang saat proses)
        susutKg: pn.beratDiterimaKg - (gradeA_pm + gradeB_pm + gradeC_pm + (reject || 0) + sortirReject),
        susutPersen: pn.beratDiterimaKg > 0
          ? ((pn.beratDiterimaKg - (gradeA_pm + gradeB_pm + gradeC_pm + (reject || 0) + sortirReject)) / pn.beratDiterimaKg * 100)
          : 0,

        // STATUS PIPELINE
        tahap: tahapSaatIni,
        statusPenerimaan: pn.status,
      };
    });

    // Aggregate summary
    const summary = {
      totalBatch: total,
      totalBeratMasukKg: batchReport.reduce((s: number, b: any) => s + b.beratMasukKg, 0),
      totalBeratBersihKg: batchReport.reduce((s: number, b: any) => s + b.beratBersihKg, 0),
      totalGradeA: batchReport.reduce((s: number, b: any) => s + b.gradeA_Kg, 0),
      totalGradeB: batchReport.reduce((s: number, b: any) => s + b.gradeB_Kg, 0),
      totalGradeC: batchReport.reduce((s: number, b: any) => s + b.gradeC_Kg, 0),
      totalRejectKg: batchReport.reduce((s: number, b: any) => s + b.rejectKg, 0),
      totalKemasan: batchReport.reduce((s: number, b: any) => s + b.jumlahKemasan, 0),
      totalStokAkhirKg: batchReport.reduce((s: number, b: any) => s + b.stokAkhirKg, 0),
      batchSelesai: batchReport.filter((b: any) => b.masukStok).length,
      batchDiproses: batchReport.filter((b: any) => !b.masukStok && b.tahap !== 'BELUM_DIPROSES').length,
      batchBelumDiproses: batchReport.filter((b: any) => b.tahap === 'BELUM_DIPROSES').length,
    };

    return res.status(200).json({
      statusCode: 200,
      data: batchReport,
      summary,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: unknown) {
    console.error('[Laporan Batch] Error:', error);
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};

/**
 * GET /api/laporan/batch/:penerimaanId
 * Detail satu batch
 */
export const getLaporanBatchDetail = async (req: Request, res: Response) => {
  try {
    const { penerimaanId } = req.params;

    const penerimaan = await (prisma.penerimaanGudang as any).findUnique({
      where: { id: penerimaanId },
      include: {
        gudang: true,
        penerima: { select: { id: true, nama: true, peran: true } },
        gradings: true,
      },
    });

    if (!penerimaan) return res.status(404).json({ statusCode: 404, message: 'Batch tidak ditemukan' });

    const pemrosesan = await prisma.pemrosesanGudang.findFirst({
      where: { penerimaanId },
    });

    // Info kepala gudang
    let kepalasGudang: any[] = [];
    if (penerimaan.gudangId) {
      kepalasGudang = await prisma.pengguna.findMany({
        where: {
          peran: { in: ['ADMIN_GUDANG', 'SUPER_ADMIN'] },
        },
        select: { id: true, nama: true, peran: true, email: true },
      });
    }

    return res.status(200).json({
      statusCode: 200,
      data: { penerimaan, pemrosesan, kepalasGudang },
    });
  } catch (error: unknown) {
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};

/**
 * GET /api/laporan/staf-info
 * Staf can see their supervisor (kepala gudang)
 */
export const getStafInfo = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ statusCode: 401, message: 'Unauthorized' });

    const user = await prisma.pengguna.findUnique({
      where: { id: req.user.id },
      include: {
        managedWarehouses: {
          include: {
            penanggungJawab: { select: { id: true, nama: true, email: true, peran: true, noTelepon: true } },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ statusCode: 404, message: 'User tidak ditemukan' });

    // Find who is ADMIN_GUDANG for gudangs this user works in
    const gudangIds = user.managedWarehouses.map((w: any) => w.id);

    // For staf: find the ADMIN_GUDANG users (kepala gudang)
    const kepalasGudang = await prisma.pengguna.findMany({
      where: { peran: { in: ['ADMIN_GUDANG', 'SUPER_ADMIN'] } },
      select: { id: true, nama: true, email: true, noTelepon: true, peran: true,
        managedWarehouses: { select: { id: true, nama: true, kode: true } }
      },
    });

    return res.status(200).json({
      statusCode: 200,
      data: {
        staf: {
          id: user.id,
          nama: user.nama,
          email: user.email,
          peran: user.peran,
          noTelepon: user.noTelepon,
        },
        managedWarehouses: user.managedWarehouses,
        kepalasGudang,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({ statusCode: 500, message: (error as Error).message });
  }
};
