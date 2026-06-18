import { Request, Response } from 'express';
import { fetchHargaFromPetani, fetchHistoriHargaFromPetani } from '../services/harga-petani.service';
import { getHargaPetaniWithMapping } from '../services/harga-petani-sync.service';

export const getHargaPetani = async (req: Request, res: Response) => {
  try {
    // Return mapped data using kodeKomoditasGlobal
    const data = await getHargaPetaniWithMapping();
    res.json(data);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getHistoriHargaPetani = async (req: Request, res: Response) => {
  try {
    const data = await fetchHistoriHargaFromPetani();
    res.json(data);
  } catch (error: unknown) {
    res.status(500).json({ error: (error as Error).message });
  }
};
