import { PrismaClient } from '@prisma/client';
import { fetchHargaFromPetani } from './harga-petani.service';

const prisma = new PrismaClient();

export async function getHargaPetaniWithMapping() {
  // 1. Fetch from PETANI
  const data: any = await fetchHargaFromPetani(); 
  
  if (!data || !data.harga) {
    return [];
  }

  const hargaList = data.harga;
  const mappedHarga = [];

  // 2. Get all master komoditas from local GUDANG db
  const masterKomoditasList = await prisma.masterKomoditas.findMany();

  // 3. Match them using kodeKomoditasGlobal
  for (const hp of hargaList) {
    if (!hp.kodeKomoditasGlobal) continue; // Skip if no global code
    
    // Find matching MasterKomoditas
    const master = masterKomoditasList.find(m => m.kodeKomoditasGlobal === hp.kodeKomoditasGlobal);
    
    mappedHarga.push({
      id: hp.id, // Petani's harga record ID
      petaniKomoditasId: hp.komoditasId,
      kodeKomoditasGlobal: hp.kodeKomoditasGlobal,
      namaPetani: hp.komoditasNama,
      namaMaster: master ? master.nama : null,
      masterKomoditasId: master ? master.id : null,
      hargaPetani: hp.harga,
      tanggalBerlaku: hp.tanggalBerlaku,
      wilayah: hp.wilayah,
      isMatched: !!master
    });
  }

  return mappedHarga;
}
