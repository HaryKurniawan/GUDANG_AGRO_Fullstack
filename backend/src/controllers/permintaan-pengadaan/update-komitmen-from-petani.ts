import { Request, Response } from 'express';
import prisma from '../../prisma/client';

export const updateKomitmenFromPetani = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { totalKomitmenKg, jumlahKepalaPetaniRespon } = req.body;

    const pp = await prisma.permintaanPengadaan.findUnique({ where: { id } });
    if (!pp) return res.status(404).json({ error: 'Tidak ditemukan' });

    const totalKomitmen = parseFloat(totalKomitmenKg) || 0;
    const jumlahRespon = parseInt(jumlahKepalaPetaniRespon) || 0;

    // Tentukan status berdasarkan pemenuhan
    let newStatus = pp.status;
    if (totalKomitmen >= pp.targetKg) {
      newStatus = 'TERPENUHI';
    } else if (totalKomitmen > 0) {
      newStatus = 'SEBAGIAN_TERPENUHI';
    }

    const updated = await prisma.permintaanPengadaan.update({
      where: { id },
      data: {
        totalKomitmenKg: totalKomitmen,
        jumlahKepalaPetaniRespon: jumlahRespon,
        status: newStatus,
      },
    });

    return res.json({ statusCode: 200, data: updated });
  } catch (error: unknown) {
    return res.status(500).json({ error: (error as Error).message });
  }
};
