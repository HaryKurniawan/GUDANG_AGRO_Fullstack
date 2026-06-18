// Fetch mechanism for Petani API
const PETANI_API_URL = process.env.PETANI_API_URL || 'http://localhost:5000/api';

export const fetchHargaFromPetani = async () => {
  try {
    const response = await fetch(`${PETANI_API_URL}/harga`);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error: unknown) {
    console.error('[HargaPetaniService] Error fetching harga from Petani:', (error as Error).message);
    throw new Error(`Gagal menarik data harga dari Petani: ${(error as Error).message}`);
  }
};

export const fetchHistoriHargaFromPetani = async () => {
  try {
    const response = await fetch(`${PETANI_API_URL}/harga/histori`);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error: unknown) {
    console.error('[HargaPetaniService] Error fetching histori harga from Petani:', (error as Error).message);
    throw new Error(`Gagal menarik histori harga dari Petani: ${(error as Error).message}`);
  }
};
