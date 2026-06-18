import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// ─── Helper: Hitung jadwal otomatis ─────────────────────────────────────────
function hitungJadwal(volumeTotalKg: number, tenggat: Date, kapasitasHarianKg = 1000) {
  const estimasiHari = Math.ceil(volumeTotalKg / kapasitasHarianKg);

  // Hitung tanggal mulai: mundur dari tenggat
  const tanggalMulai = new Date(tenggat);
  tanggalMulai.setDate(tanggalMulai.getDate() - estimasiHari);
  tanggalMulai.setHours(0, 0, 0, 0);

  const tanggalSelesai = new Date(tanggalMulai);
  tanggalSelesai.setDate(tanggalSelesai.getDate() + estimasiHari - 1);
  tanggalSelesai.setHours(23, 59, 59, 999);

  // Bagi volume per hari
  const hariProduksi = [];
  for (let i = 0; i < estimasiHari; i++) {
    const tgl = new Date(tanggalMulai);
    tgl.setDate(tgl.getDate() + i);
    const sisaVolume = volumeTotalKg - i * kapasitasHarianKg;
    hariProduksi.push({
      hariKe: i + 1,
      tanggal: new Date(tgl),
      targetKg: Math.min(kapasitasHarianKg, sisaVolume),
    });
  }

  return { estimasiHari, tanggalMulai, tanggalSelesai, hariProduksi };
}

// ─── POST /api/jadwal-produksi/hitung ─────────────────────────────────────────
// Preview kalkulasi jadwal tanpa menyimpan ke DB
export const hitungPreviewJadwal = async (req: Request, res: Response) => {
  try {
    const { volumeTotalKg, tenggat, kapasitasHarianKg } = req.body;

    if (!volumeTotalKg || !tenggat) {
      return res.status(400).json({ error: 'volumeTotalKg dan tenggat wajib diisi' });
    }

    const tenggatDate = new Date(tenggat);
    const kapasitas = kapasitasHarianKg ? parseFloat(kapasitasHarianKg) : 1000;
    const hasil = hitungJadwal(parseFloat(volumeTotalKg), tenggatDate, kapasitas);

    // Cek apakah ada jadwal yang overlap di tanggal tersebut
    const overlap: any[] = [];
    for (const hari of hasil.hariProduksi) {
      const existingHari = await prisma.hariProduksi.findMany({
        where: {
          tanggal: {
            gte: new Date(hari.tanggal.toISOString().split('T')[0] + 'T00:00:00.000Z'),
            lt: new Date(hari.tanggal.toISOString().split('T')[0] + 'T23:59:59.999Z'),
          },
          statusHari: { not: 'SELESAI' },
        },
        include: { jadwal: { select: { komoditasNama: true, statusJadwal: true } } },
      });

      const totalTerjadwal = existingHari.reduce((s, h) => s + h.targetKg, 0);
      if (totalTerjadwal + hari.targetKg > kapasitas) {
        overlap.push({
          tanggal: hari.tanggal,
          kapasitasTerpakai: totalTerjadwal,
          tambahanDiminta: hari.targetKg,
          kelebihan: totalTerjadwal + hari.targetKg - kapasitas,
        });
      }
    }

    return res.json({
      statusCode: 200,
      data: {
        ...hasil,
        kapasitasHarianKg: kapasitas,
        estimasiBiayaBorongan: parseFloat(volumeTotalKg) * 1500, // Rp 1.500/kg
        peringatanOverlap: overlap,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── POST /api/jadwal-produksi ─────────────────────────────────────────────────
// Simpan jadwal baru beserta hari-hari produksinya
export const createJadwal = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gudangId, komoditasNama, volumeTotalKg, tenggat, kapasitasHarianKg, pengajuanId, catatanJadwal } = req.body;

    if (!gudangId || !komoditasNama || !volumeTotalKg || !tenggat) {
      return res.status(400).json({ error: 'gudangId, komoditasNama, volumeTotalKg, tenggat wajib diisi' });
    }

    const tenggatDate = new Date(tenggat);
    const kapasitas = kapasitasHarianKg ? parseFloat(kapasitasHarianKg) : 1000;
    const hasil = hitungJadwal(parseFloat(volumeTotalKg), tenggatDate, kapasitas);

    const jadwal = await prisma.jadwalProduksi.create({
      data: {
        gudangId,
        pengajuanId: pengajuanId || null,
        komoditasNama,
        volumeTotalKg: parseFloat(volumeTotalKg),
        kapasitasHarianKg: kapasitas,
        tenggat: tenggatDate,
        tanggalMulai: hasil.tanggalMulai,
        tanggalSelesai: hasil.tanggalSelesai,
        estimasiHari: hasil.estimasiHari,
        statusJadwal: 'AKTIF',
        catatanJadwal: catatanJadwal || null,
        hariProduksi: {
          create: hasil.hariProduksi.map((h) => ({
            hariKe: h.hariKe,
            tanggal: h.tanggal,
            targetKg: h.targetKg,
            statusHari: 'BELUM',
          })),
        },
      },
      include: {
        hariProduksi: { orderBy: { hariKe: 'asc' } },
      },
    });

    return res.status(201).json({ statusCode: 201, data: jadwal });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── GET /api/jadwal-produksi ───────────────────────────────────────────────
// Daftar jadwal (filter: gudangId, status)
export const getJadwalList = async (req: Request, res: Response) => {
  try {
    const { gudangId, statusJadwal } = req.query;

    const where: any = {};
    if (gudangId) where.gudangId = String(gudangId);
    if (statusJadwal) where.statusJadwal = String(statusJadwal);

    const data = await prisma.jadwalProduksi.findMany({
      where,
      orderBy: { tanggalMulai: 'asc' },
      include: {
        hariProduksi: {
          orderBy: { hariKe: 'asc' },
          include: {
            tenagaKerja: true,
          },
        },
      },
    });

    // Hitung summary per jadwal
    const dataWithSummary = data.map((jadwal) => {
      const totalRealisasi = jadwal.hariProduksi.reduce((s, h) => s + (h.realisasiKg || 0), 0);
      const totalBiayaBorongan = jadwal.hariProduksi.reduce(
        (s, h) => s + h.tenagaKerja.reduce((ts, t) => ts + t.totalUpah, 0),
        0
      );
      const hariSelesai = jadwal.hariProduksi.filter((h) => h.statusHari === 'SELESAI').length;
      return {
        ...jadwal,
        summary: {
          totalRealisasiKg: totalRealisasi,
          persenSelesai: jadwal.volumeTotalKg > 0 ? Math.round((totalRealisasi / jadwal.volumeTotalKg) * 100) : 0,
          hariSelesai,
          hariTotal: jadwal.estimasiHari,
          totalBiayaBorongan,
        },
      };
    });

    return res.json({ statusCode: 200, data: dataWithSummary });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── GET /api/jadwal-produksi/:id ──────────────────────────────────────────
// Detail jadwal lengkap
export const getJadwalById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const jadwal = await prisma.jadwalProduksi.findUnique({
      where: { id },
      include: {
        hariProduksi: {
          orderBy: { hariKe: 'asc' },
          include: {
            tenagaKerja: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    if (!jadwal) return res.status(404).json({ error: 'Jadwal tidak ditemukan' });

    const totalRealisasi = jadwal.hariProduksi.reduce((s, h) => s + (h.realisasiKg || 0), 0);
    const totalBiayaBorongan = jadwal.hariProduksi.reduce(
      (s, h) => s + h.tenagaKerja.reduce((ts, t) => ts + t.totalUpah, 0),
      0
    );

    return res.json({
      statusCode: 200,
      data: {
        ...jadwal,
        summary: {
          totalRealisasiKg: totalRealisasi,
          persenSelesai: jadwal.volumeTotalKg > 0 ? Math.round((totalRealisasi / jadwal.volumeTotalKg) * 100) : 0,
          hariSelesai: jadwal.hariProduksi.filter((h) => h.statusHari === 'SELESAI').length,
          totalBiayaBorongan,
          estimasiBiayaBoronganTotal: jadwal.volumeTotalKg * 1500,
        },
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── PATCH /api/jadwal-produksi/:id/status ─────────────────────────────────
// Ubah status jadwal (AKTIF → SELESAI / BATAL)
export const updateJadwalStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { statusJadwal, catatanJadwal } = req.body;

    const validStatus = ['DRAFT', 'AKTIF', 'SELESAI', 'BATAL'];
    if (!validStatus.includes(statusJadwal)) {
      return res.status(400).json({ error: `Status harus salah satu dari: ${validStatus.join(', ')}` });
    }

    const updated = await prisma.jadwalProduksi.update({
      where: { id },
      data: { statusJadwal, catatanJadwal: catatanJadwal ?? undefined },
    });

    return res.json({ statusCode: 200, data: updated });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── PATCH /api/jadwal-produksi/hari/:hariId ──────────────────────────────
// Update realisasi produksi hari tertentu
export const updateRealisasiHari = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hariId } = req.params;
    const { realisasiKg, statusHari, catatan } = req.body;

    const hari = await prisma.hariProduksi.findUnique({ where: { id: hariId } });
    if (!hari) return res.status(404).json({ error: 'Hari produksi tidak ditemukan' });

    const validStatusHari = ['BELUM', 'BERJALAN', 'SELESAI'];
    if (statusHari && !validStatusHari.includes(statusHari)) {
      return res.status(400).json({ error: `statusHari harus salah satu dari: ${validStatusHari.join(', ')}` });
    }

    const updated = await prisma.hariProduksi.update({
      where: { id: hariId },
      data: {
        realisasiKg: realisasiKg !== undefined ? parseFloat(realisasiKg) : undefined,
        statusHari: statusHari || undefined,
        catatan: catatan ?? undefined,
      },
      include: {
        tenagaKerja: true,
      },
    });

    return res.json({ statusCode: 200, data: updated });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── POST /api/jadwal-produksi/hari/:hariId/tenaga-kerja ──────────────────
// Tambah catatan pekerja borongan untuk hari tertentu
export const addTenagaKerja = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { hariId } = req.params;
    const { namaPekerja, kgDikerjakan, tarifPerKg, catatan } = req.body;

    if (!namaPekerja || !kgDikerjakan) {
      return res.status(400).json({ error: 'namaPekerja dan kgDikerjakan wajib diisi' });
    }

    const hari = await prisma.hariProduksi.findUnique({ where: { id: hariId } });
    if (!hari) return res.status(404).json({ error: 'Hari produksi tidak ditemukan' });

    const tarif = tarifPerKg ? parseFloat(tarifPerKg) : 1500;
    const kgFloat = parseFloat(kgDikerjakan);
    const totalUpah = kgFloat * tarif;

    const pekerja = await prisma.tenagaKerjaBorongan.create({
      data: {
        hariProduksiId: hariId,
        namaPekerja: String(namaPekerja).trim(),
        kgDikerjakan: kgFloat,
        tarifPerKg: tarif,
        totalUpah,
        catatan: catatan || null,
      },
    });

    return res.status(201).json({
      statusCode: 201,
      data: pekerja,
      message: `Upah borongan ${namaPekerja}: Rp ${totalUpah.toLocaleString('id-ID')}`,
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── DELETE /api/jadwal-produksi/tenaga-kerja/:id ─────────────────────────
// Hapus catatan pekerja borongan
export const deleteTenagaKerja = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.tenagaKerjaBorongan.delete({ where: { id } });
    return res.json({ statusCode: 200, message: 'Data pekerja dihapus' });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ─── GET /api/jadwal-produksi/kapasitas ────────────────────────────────────
// Cek kapasitas tersedia di tanggal tertentu
export const getKapasitasTanggal = async (req: Request, res: Response) => {
  try {
    const { tanggal, kapasitasHarianKg } = req.query;

    if (!tanggal) return res.status(400).json({ error: 'tanggal wajib diisi (YYYY-MM-DD)' });

    const tgl = new Date(String(tanggal) + 'T00:00:00.000Z');
    const tglEnd = new Date(String(tanggal) + 'T23:59:59.999Z');
    const kapasitas = kapasitasHarianKg ? parseFloat(String(kapasitasHarianKg)) : 1000;

    const hariTerjadwal = await prisma.hariProduksi.findMany({
      where: {
        tanggal: { gte: tgl, lt: tglEnd },
        statusHari: { not: 'SELESAI' },
      },
      include: { jadwal: { select: { komoditasNama: true, statusJadwal: true } } },
    });

    const totalTerjadwal = hariTerjadwal.reduce((s, h) => s + h.targetKg, 0);
    const sisaKapasitas = Math.max(0, kapasitas - totalTerjadwal);

    return res.json({
      statusCode: 200,
      data: {
        tanggal: String(tanggal),
        kapasitasTotal: kapasitas,
        kapasitasTerpakai: totalTerjadwal,
        kapasitasTersedia: sisaKapasitas,
        jadwalAktif: hariTerjadwal,
      },
    });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
