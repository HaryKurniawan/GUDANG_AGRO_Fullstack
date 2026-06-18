import { Request, Response } from 'express';
import prisma from '../../prisma/client';

/**
 * Intake dari PETANI: Kepala Petani melaporkan permintaan sudah dipenuhi
 * Menerima daftar petani yang akan datang ke gudang dengan barangnya
 * Membuat intake records untuk tracking penerimaan per petani
 */
export const intakeDariPetani = async (req: Request, res: Response) => {
  try {
    const {
      permintaanPengadaanId,
      gudangId,
      gudangNama,
      komoditasNama,
      kodeKomoditasGlobal,
      totalKomitmenKg,
      komitmenList,
      callbackUrlPetani,
    } = req.body;

    console.log('[intakeDariPetani] Received request:', {
      permintaanPengadaanId,
      gudangId,
      komoditasNama,
      komitmenListLength: komitmenList?.length,
    });

    if (!permintaanPengadaanId || !gudangId || !komoditasNama || !komitmenList || komitmenList.length === 0) {
      console.warn('[intakeDariPetani] Missing required fields');
      return res.status(400).json({
        statusCode: 400,
        message: 'Missing required fields: permintaanPengadaanId, gudangId, komoditasNama, komitmenList',
      });
    }

    // Resolve gudangId: bisa berupa UUID atau KODE gudang
    let resolvedGudangId = gudangId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gudangId);
    if (!isUUID) {
      // Coba cari by kode
      const gudangByKode = await prisma.gudang.findFirst({ where: { kode: gudangId } });
      if (gudangByKode) {
        resolvedGudangId = gudangByKode.id;
      } else {
        return res.status(400).json({
          statusCode: 400,
          message: `Gudang dengan kode/id "${gudangId}" tidak ditemukan`,
        });
      }
    }

    // Create intake records untuk setiap petani yang komit
    const intakes: any[] = [];

    // Cari penerima default (admin gudang) untuk FK constraint
    const defaultPenerima = await prisma.pengguna.findFirst({
      where: { peran: { in: ['ADMIN_GUDANG', 'SUPER_ADMIN'] } },
      orderBy: { createdAt: 'asc' },
    });
    const penerimaId = defaultPenerima?.id || '';

    if (!penerimaId) {
      return res.status(500).json({
        statusCode: 500,
        message: 'Tidak ada admin gudang untuk memproses intake',
      });
    }

    for (const komitmen of komitmenList) {
      const nomorPenerimaan = `INT-${permintaanPengadaanId.substring(0, 8)}-${Date.now()}`;

      console.log('[intakeDariPetani] Creating intake for:', komitmen.petaniNama);

      const intake = await prisma.penerimaanGudang.create({
        data: {
          nomorPenerimaan,
          penjemputanId: `INTAKE-${komitmen.komitmenPetaniId || komitmen.petaniId}`,
          penerimaId,
          gudangId: resolvedGudangId,
          beratDiterimaKg: 0,
          kondisi: 'BAIK',
          status: 'RECEIVED',
          catatan: `Intake dari Petani: ${komitmen.petaniNama}`,
          
          // Snapshot metadata
          petaniNama: komitmen.petaniNama,
          komoditasNama,
          kodeKomoditasGlobal: kodeKomoditasGlobal || null,
          sinkronisasiKePetani: 'pending',
          
          // Intake tracking fields
          permintaanPengadaanId,
          komitmenPetaniId: komitmen.komitmenPetaniId,
          petaniId: komitmen.petaniId,
          sanggupKg: komitmen.sanggupKg,
          estimasiTanggalPanen: komitmen.estimasiTanggalPanen || null,
          intakeStatus: 'menunggu_penerimaan',
        },
      });

      intakes.push({
        intakeId: intake.id,
        nomorPenerimaan: intake.nomorPenerimaan,
        petaniId: komitmen.petaniId,
        petaniNama: komitmen.petaniNama,
        sanggupKg: komitmen.sanggupKg,
        noHp: komitmen.noHp,
        estimasiTanggalPanen: komitmen.estimasiTanggalPanen,
      });
    }

    console.log('[intakeDariPetani] Created intakes:', intakes.length);

    return res.status(201).json({
      statusCode: 201,
      message: `Intake berhasil dibuat untuk ${intakes.length} petani. Menunggu penerimaan barang ke gudang.`,
      data: {
        permintaanPengadaanId,
        totalKomitmenKg,
        komoditasNama,
        intakes,
      },
    });
  } catch (error: unknown) {
    console.error('[intakeDariPetani]:', (error as Error).message, (error as Error).stack);
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal membuat intake records',
      error: (error as Error).message,
    });
  }
}
