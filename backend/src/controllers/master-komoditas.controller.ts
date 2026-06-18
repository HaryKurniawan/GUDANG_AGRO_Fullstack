import { Request, Response } from 'express';
import prisma from '../prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

// GET /api/master-komoditas/admin — list all (with _count)
export const getAllMasterKomoditas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search, kategori, isActive } = req.query;

    const where: any = {};
    if (search) {
      where.nama = { contains: String(search), mode: 'insensitive' };
    }
    if (kategori) {
      where.kategori = String(kategori);
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const data = await prisma.masterKomoditas.findMany({
      where,
      include: {
        _count: { select: { produkGudang: true } },
      },
      orderBy: { nama: 'asc' },
    });

    return res.status(200).json({ statusCode: 200, message: 'OK', data });
  } catch (error: unknown) {
    console.error('Error fetching master komoditas:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server' });
  }
};

// GET /api/master-komoditas/public/all — public (no auth), for ecommerce proxy
export const getPublicMasterKomoditas = async (req: Request, res: Response) => {
  try {
    const { search, kategori, isActive } = req.query;

    const where: any = {};
    if (search) {
      where.nama = { contains: String(search), mode: 'insensitive' };
    }
    if (kategori) {
      where.kategori = String(kategori);
    }
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    } else {
      where.isActive = true; // Default: only active for public
    }

    const data = await prisma.masterKomoditas.findMany({
      where,
      include: {
        _count: { select: { produkGudang: true } },
      },
      orderBy: { nama: 'asc' },
    });

    return res.status(200).json({ statusCode: 200, message: 'OK', data });
  } catch (error: unknown) {
    console.error('Error fetching public master komoditas:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server' });
  }
};

// POST /api/master-komoditas/admin — create
export const createMasterKomoditas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nama, kategori, satuan, harga, deskripsi, gambarUrl, kodeKomoditasGlobal } = req.body;

    if (!nama || !nama.trim()) {
      return res.status(400).json({ statusCode: 400, message: 'Nama komoditas wajib diisi' });
    }

    // Check duplicate nama
    const existing = await prisma.masterKomoditas.findFirst({ where: { nama: nama.trim() } });
    if (existing) {
      return res.status(400).json({ statusCode: 400, message: `Komoditas "${nama}" sudah ada` });
    }

    // Check duplicate kodeKomoditasGlobal
    if (kodeKomoditasGlobal) {
      const existingKode = await prisma.masterKomoditas.findFirst({
        where: { kodeKomoditasGlobal: kodeKomoditasGlobal.trim() },
      });
      if (existingKode) {
        return res.status(400).json({ statusCode: 400, message: `Kode komoditas global "${kodeKomoditasGlobal}" sudah dipakai` });
      }
    }

    const data = await prisma.masterKomoditas.create({
      data: {
        nama: nama.trim(),
        kategori: kategori?.trim() || null,
        satuan: satuan || 'kg',
        harga: Number(harga) || 0,
        deskripsi: deskripsi?.trim() || null,
        gambarUrl: gambarUrl?.trim() || null,
        kodeKomoditasGlobal: kodeKomoditasGlobal?.trim() || null,
      },
    });

    return res.status(201).json({ statusCode: 201, message: 'Komoditas berhasil ditambahkan', data });
  } catch (error: unknown) {
    console.error('Error creating master komoditas:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server' });
  }
};

// PUT /api/master-komoditas/admin/:id — update
export const updateMasterKomoditas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nama, kategori, satuan, harga, deskripsi, gambarUrl, kodeKomoditasGlobal } = req.body;

    const existing = await prisma.masterKomoditas.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Komoditas tidak ditemukan' });
    }

    // Check duplicate nama (exclude current)
    if (nama && nama.trim() !== existing.nama) {
      const duplicate = await prisma.masterKomoditas.findFirst({ where: { nama: nama.trim(), NOT: { id } } });
      if (duplicate) {
        return res.status(400).json({ statusCode: 400, message: `Komoditas "${nama}" sudah ada` });
      }
    }

    // Check duplicate kode (exclude current)
    if (kodeKomoditasGlobal && kodeKomoditasGlobal.trim() !== existing.kodeKomoditasGlobal) {
      const duplicateKode = await prisma.masterKomoditas.findFirst({
        where: { kodeKomoditasGlobal: kodeKomoditasGlobal.trim(), NOT: { id } },
      });
      if (duplicateKode) {
        return res.status(400).json({ statusCode: 400, message: `Kode komoditas global "${kodeKomoditasGlobal}" sudah dipakai` });
      }
    }

    const data = await prisma.masterKomoditas.update({
      where: { id },
      data: {
        nama: nama?.trim() ?? existing.nama,
        kategori: kategori !== undefined ? (kategori?.trim() || null) : existing.kategori,
        satuan: satuan || existing.satuan,
        harga: harga !== undefined ? Number(harga) : existing.harga,
        deskripsi: deskripsi !== undefined ? (deskripsi?.trim() || null) : existing.deskripsi,
        gambarUrl: gambarUrl !== undefined ? (gambarUrl?.trim() || null) : existing.gambarUrl,
        kodeKomoditasGlobal: kodeKomoditasGlobal !== undefined
          ? (kodeKomoditasGlobal?.trim() || null)
          : existing.kodeKomoditasGlobal,
      },
    });

    return res.status(200).json({ statusCode: 200, message: 'Komoditas berhasil diperbarui', data });
  } catch (error: unknown) {
    console.error('Error updating master komoditas:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server' });
  }
};

// DELETE /api/master-komoditas/admin/:id
export const deleteMasterKomoditas = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.masterKomoditas.findUnique({
      where: { id },
      include: { _count: { select: { produkGudang: true } } },
    });

    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Komoditas tidak ditemukan' });
    }

    if (existing._count.produkGudang > 0) {
      return res.status(400).json({
        statusCode: 400,
        message: `Tidak dapat menghapus komoditas "${existing.nama}" karena masih digunakan oleh ${existing._count.produkGudang} produk gudang`,
      });
    }

    await prisma.masterKomoditas.delete({ where: { id } });

    return res.status(200).json({ statusCode: 200, message: 'Komoditas berhasil dihapus' });
  } catch (error: unknown) {
    console.error('Error deleting master komoditas:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server' });
  }
};

// PATCH /api/master-komoditas/admin/:id/status — toggle isActive
export const toggleMasterKomoditasStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const existing = await prisma.masterKomoditas.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ statusCode: 404, message: 'Komoditas tidak ditemukan' });
    }

    const data = await prisma.masterKomoditas.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    return res.status(200).json({ statusCode: 200, message: 'Status komoditas berhasil diubah', data });
  } catch (error: unknown) {
    console.error('Error toggling master komoditas status:', error);
    return res.status(500).json({ statusCode: 500, message: 'Terjadi kesalahan internal server' });
  }
};
