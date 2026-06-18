import { Response } from 'express';
import prisma from '../../prisma/client';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export const updateProdukGudang = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nama, deskripsi, satuan, hargaGudang, stok, gambarUrl, isActive } = req.body;

    const existingProduct = await prisma.produkGudang.findUnique({
      where: { id },
      include: {
        masterKomoditas: {
          select: {
            id: true,
            nama: true,
            kategori: true,
            satuan: true,
            harga: true,
          },
        },
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        statusCode: 404,
        message: 'Produk gudang tidak ditemukan',
      });
    }

    // Authorization Check: Must manage the warehouse of this product unless SUPER_ADMIN
    if (req.user && req.user.peran !== 'SUPER_ADMIN' && !req.user.managedWarehouses.includes(existingProduct.gudangId)) {
      return res.status(403).json({
        statusCode: 403,
        message: 'Akses ditolak: Anda tidak mengelola gudang untuk produk ini',
      });
    }

    // ✅ Prevent editing nama/satuan if linked to Master Komoditas
    if (existingProduct.masterKomoditasId) {
      if (nama && nama !== existingProduct.nama) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Nama produk tidak dapat diubah karena terhubung dengan Master Komoditas. Hubungi Admin untuk mengubah nama.',
        });
      }
      if (satuan && satuan !== existingProduct.satuan) {
        return res.status(400).json({
          statusCode: 400,
          message: 'Satuan tidak dapat diubah karena terhubung dengan Master Komoditas. Hubungi Admin untuk mengubah satuan.',
        });
      }
    }

    // Build update data (only editable fields)
    const updateData: any = {};
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (hargaGudang !== undefined) updateData.hargaGudang = Number(hargaGudang);
    if (stok !== undefined) updateData.stok = Number(stok);
    if (req.body.minimalPembelianKg !== undefined) updateData.minimalPembelianKg = Number(req.body.minimalPembelianKg);
    if (gambarUrl !== undefined) updateData.gambarUrl = gambarUrl;
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);
    
    // ✅ varianProduk hanya boleh diubah oleh ADMIN_GUDANG / SUPER_ADMIN.
    // Staf gudang tidak boleh mengubah varian (mempengaruhi label produk yang
    // tampil ke seller). Defense-in-depth selain pembatasan di route.
    if (req.body.varianProduk !== undefined) {
      const isAdmin =
        req.user?.peran === 'SUPER_ADMIN' || req.user?.peran === 'ADMIN_GUDANG';
      if (!isAdmin) {
        return res.status(403).json({
          statusCode: 403,
          message: 'Hanya Admin Gudang yang dapat mengubah varian produk',
        });
      }
      const varianVal = req.body.varianProduk ? String(req.body.varianProduk).trim() : null;
      // Validasi varian harus dari Master Varian aktif (jika diisi)
      if (varianVal) {
        const masterVarian = await prisma.masterVarian.findFirst({
          where: { nama: varianVal, isActive: true },
        });
        if (!masterVarian) {
          return res.status(400).json({
            statusCode: 400,
            message: `Varian "${varianVal}" tidak terdaftar di Master Varian. Ajukan varian baru ke admin terlebih dahulu.`,
          });
        }
      }
      updateData.varianProduk = varianVal;
    }

    // Only allow nama/satuan update if NOT linked to master
    if (!existingProduct.masterKomoditasId) {
      if (nama !== undefined) updateData.nama = nama;
      if (satuan !== undefined) updateData.satuan = satuan;
    }

    const updatedProduct = await prisma.produkGudang.update({
      where: { id },
      data: updateData,
      include: {
        masterKomoditas: {
          select: {
            id: true,
            nama: true,
            kategori: true,
            satuan: true,
          },
        },
      },
    });

    return res.status(200).json({
      statusCode: 200,
      message: 'Produk gudang berhasil diperbarui',
      data: updatedProduct,
    });
  } catch (error: unknown) {
    console.error('Error updating warehouse product:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Gagal memperbarui produk gudang',
      error: (error as Error).message,
    });
  }
};
