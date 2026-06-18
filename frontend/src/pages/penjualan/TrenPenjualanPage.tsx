import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import {
  TrendingUp,
  TrendingDown,
  Loader2,
  Leaf,
  ShoppingCart,
  BarChart3,
  Package,
  Store,
  Users,
} from 'lucide-react';

interface ProdukGudang {
  id: string;
  nama: string;
  satuan: string;
  hargaGudang: number;
  stok: number;
  deskripsi: string | null;
}

interface ProdukTren {
  nama: string;
  totalKgTerjual: number;
  totalNilai: number;
  jumlahTransaksi: number;
  sellerYangBeli: string[];
}

// Item dari endpoint demand-signal ECOMMERCE (penjualan riil seller ke konsumen)
interface DemandSignalItem {
  komoditasNama: string;
  jumlahTerjualKg: number;
  prevJumlahTerjualKg: number;
  totalRevenue: number;
  jumlahTransaksi: number;
  trendPersen: number | null;
  trendArah: 'UP' | 'DOWN' | 'STABLE';
  jumlahSeller: number;
}

const TrenPenjualanPage: React.FC = () => {
  const { user } = useAuthStore();
  const gudangId = user?.managedWarehouses?.[0]?.id || '';
  const [loading, setLoading] = useState(true);
  const [produkGudang, setProdukGudang] = useState<ProdukGudang[]>([]);
  const [produkTren, setProdukTren] = useState<Map<string, ProdukTren>>(new Map());
  const [demandSignal, setDemandSignal] = useState<DemandSignalItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch produk gudang (always available)
        // Endpoint root /produk tidak ada; gunakan /produk/admin (ADMIN_GUDANG / kepala-gudang)
        const produkRes = await api.get('/produk/admin');
        const allProduk: ProdukGudang[] = produkRes.data.data || [];
        setProdukGudang(allProduk);

        // 2. Fetch demand signal dari ECOMMERCE — produk yang BENAR-BENAR terjual
        //    oleh seller ke konsumen (sumber: transaksiKeuntungan SELESAI).
        //    Endpoint ini dilindungi ApiKeyGuard -> wajib kirim x-api-key.
        if (gudangId) {
          try {
            const ecommerceApiUrl = 'http://localhost:4000/api';
            const res = await fetch(
              `${ecommerceApiUrl}/analytics/demand-signal/gudang?gudangId=${gudangId}`,
              {
                headers: {
                  'x-api-key': 'ecommerce-nestjs-to-gudang-express-secure-key',
                },
              },
            );
            const json = await res.json();
            // Response terbungkus TransformInterceptor: { success, data: { data: [...] } }
            const payload = json?.data?.data ?? json?.data ?? json;
            const items: DemandSignalItem[] = Array.isArray(payload?.data)
              ? payload.data
              : Array.isArray(payload)
                ? payload
                : [];
            setDemandSignal(items);
          } catch (e) {
            console.warn('Gagal memuat demand signal dari ECOMMERCE:', e);
          }
        }

        // 3. Fetch pengajuan data to compute which products are selling
        const trenMap = new Map<string, ProdukTren>();
        try {
          const pengajuanRes = await api.get('/pengajuan');
          const allPengajuan: any[] = pengajuanRes.data.data || [];

          for (const pj of allPengajuan) {
            if (pj.status !== 'SELESAI') continue;
            const tokoNama = pj.tokoNama || 'Seller';

            for (const item of (pj.items || [])) {
              const nama = item.produkNama || 'Produk';
              const kg = item.jumlahDisetujui || item.jumlahPermintaan || 0;
              const nilai = item.totalHarga || 0;

              if (!trenMap.has(nama)) {
                trenMap.set(nama, { nama, totalKgTerjual: 0, totalNilai: 0, jumlahTransaksi: 0, sellerYangBeli: [] });
              }
              const t = trenMap.get(nama)!;
              t.totalKgTerjual += kg;
              t.totalNilai += nilai;
              t.jumlahTransaksi++;
              if (!t.sellerYangBeli.includes(tokoNama)) {
                t.sellerYangBeli.push(tokoNama);
              }
            }
          }
        } catch { /* pengajuan endpoint might be empty */ }

        setProdukTren(trenMap);
      } catch (err) {
        console.error('Error fetching tren data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [gudangId]);

  const formatRp = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}jt` : n >= 1_000 ? `${(n / 1_000).toFixed(0)}rb` : `${n}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  // Merge produk gudang with tren data
  const produkWithTren = produkGudang.map((p) => {
    const tren = produkTren.get(p.nama);
    return {
      ...p,
      totalKgTerjual: tren?.totalKgTerjual || 0,
      totalNilai: tren?.totalNilai || 0,
      jumlahTransaksi: tren?.jumlahTransaksi || 0,
      sellerYangBeli: tren?.sellerYangBeli || [],
    };
  }).sort((a, b) => b.totalKgTerjual - a.totalKgTerjual);

  const hasTrenData = produkWithTren.some(p => p.totalKgTerjual > 0);
  const maxKg = produkWithTren[0]?.totalKgTerjual || 1;

  // Rangkum seller unik dari seluruh produk yang terjual
  const sellerSummary = new Map<string, { nama: string; totalKg: number; totalNilai: number; produk: Set<string> }>();
  produkWithTren.forEach((p) => {
    p.sellerYangBeli.forEach((sellerNama) => {
      if (!sellerSummary.has(sellerNama)) {
        sellerSummary.set(sellerNama, { nama: sellerNama, totalKg: 0, totalNilai: 0, produk: new Set() });
      }
      const s = sellerSummary.get(sellerNama)!;
      s.produk.add(p.nama);
    });
  });
  const sellerList = Array.from(sellerSummary.values());

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Tren Penjualan Produk</h1>
        <p className="text-xs text-slate-400 mt-0.5">Produk gudang mana yang paling laku terjual oleh seller</p>
      </div>

      {/* Produk Terlaris di Seller (penjualan riil seller ke konsumen dari ECOMMERCE) */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-2">
          <ShoppingCart size={14} className="text-emerald-600" />
          Produk Terjual di Seller
        </h3>
        <p className="text-[11px] text-slate-400 mb-4">
          Komoditas yang paling laku dijual seller ke konsumen bulan ini (sumber: transaksi ECOMMERCE)
        </p>

        {demandSignal.length === 0 ? (
          <div className="text-center py-10">
            <ShoppingCart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Belum ada penjualan di seller</p>
            <p className="text-[11px] text-slate-300 mt-1">
              Data akan muncul setelah seller afiliasi menyelesaikan transaksi penjualan ke konsumen.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {demandSignal.map((item, idx) => {
              const maxSignal = demandSignal[0]?.jumlahTerjualKg || 1;
              const barWidth = maxSignal > 0 ? (item.jumlahTerjualKg / maxSignal) * 100 : 0;
              return (
                <div key={`${item.komoditasNama}-${idx}`} className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/30">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-600' :
                      idx === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">{item.komoditasNama}</span>
                        <span className="text-xs font-bold text-emerald-600 ml-2 flex-shrink-0">
                          {item.jumlahTerjualKg.toLocaleString('id-ID')} kg
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-emerald-400' : 'bg-emerald-300'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">{item.jumlahTransaksi} transaksi</span>
                        <span className="text-[10px] text-slate-400">{item.jumlahSeller} seller</span>
                        <span className="text-[10px] text-amber-600 font-medium">Rp {formatRp(item.totalRevenue)}</span>
                        {item.trendPersen !== null && (
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${
                            item.trendArah === 'UP' ? 'text-emerald-600' :
                            item.trendArah === 'DOWN' ? 'text-red-500' :
                            'text-slate-400'
                          }`}>
                            {item.trendArah === 'UP' ? <TrendingUp size={10} /> : item.trendArah === 'DOWN' ? <TrendingDown size={10} /> : null}
                            {item.trendPersen > 0 ? '+' : ''}{item.trendPersen}% vs bulan lalu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info banner if no tren data yet */}
      {!hasTrenData && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <ShoppingCart size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-700">Belum ada data penjualan</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Data tren akan muncul setelah ada pengajuan stok dari seller yang statusnya selesai. 
              Saat ini menampilkan daftar produk gudang.
            </p>
          </div>
        </div>
      )}

      {/* Summary cards (only if has tren) */}
      {hasTrenData && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Produk Terjual</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{produkWithTren.filter(p => p.totalKgTerjual > 0).length}</p>
            <p className="text-[10px] text-slate-400">dari {produkGudang.length} produk</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Volume</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{produkWithTren.reduce((s, p) => s + p.totalKgTerjual, 0).toLocaleString('id-ID')} kg</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase">Total Nilai</p>
            <p className="text-xl font-bold text-amber-600 mt-1">Rp {formatRp(produkWithTren.reduce((s, p) => s + p.totalNilai, 0))}</p>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <BarChart3 size={14} className="text-emerald-600" />
          {hasTrenData ? 'Peringkat Produk Terlaris' : 'Daftar Produk Gudang'}
        </h3>

        {produkGudang.length === 0 ? (
          <div className="text-center py-10">
            <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Belum ada produk di gudang</p>
          </div>
        ) : (
          <div className="space-y-3">
            {produkWithTren.map((produk, idx) => {
              const barWidth = hasTrenData && maxKg > 0 ? (produk.totalKgTerjual / maxKg) * 100 : 0;
              const hasData = produk.totalKgTerjual > 0;

              return (
                <div key={produk.id} className={`p-3 rounded-xl border ${hasData ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-50 bg-white'}`}>
                  <div className="flex items-start gap-3">
                    {/* Rank / Icon */}
                    {hasTrenData ? (
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 && hasData ? 'bg-amber-100 text-amber-700' :
                        idx === 1 && hasData ? 'bg-slate-200 text-slate-600' :
                        idx === 2 && hasData ? 'bg-orange-100 text-orange-600' :
                        hasData ? 'bg-emerald-100 text-emerald-600' :
                        'bg-slate-50 text-slate-300'
                      }`}>
                        {hasData ? idx + 1 : '-'}
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <Leaf size={14} className="text-emerald-500" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-700">{produk.nama}</span>
                        {hasData && (
                          <span className="text-xs font-bold text-emerald-600 ml-2 flex-shrink-0">{produk.totalKgTerjual.toLocaleString('id-ID')} kg</span>
                        )}
                      </div>

                      {/* Tren bar */}
                      {hasData && (
                        <div className="mt-1.5">
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === 1 ? 'bg-emerald-400' : 'bg-emerald-300'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Info row */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">Harga: <span className="font-semibold text-amber-600">Rp {produk.hargaGudang.toLocaleString('id-ID')}/{produk.satuan}</span></span>
                        <span className="text-[10px] text-slate-400">Stok: <span className="font-semibold">{produk.stok} {produk.satuan}</span></span>
                        {hasData && (
                          <>
                            <span className="text-[10px] text-slate-400">{produk.jumlahTransaksi} transaksi</span>
                            <span className="text-[10px] text-slate-400">{produk.sellerYangBeli.length} seller</span>
                            <span className="text-[10px] text-amber-600 font-medium">Rp {formatRp(produk.totalNilai)}</span>
                          </>
                        )}
                      </div>

                      {/* Seller yang beli */}
                      {hasData && produk.sellerYangBeli.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {produk.sellerYangBeli.map((seller) => (
                            <span key={seller} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-50 border border-blue-100 rounded text-[9px] text-blue-600 font-medium">
                              <TrendingUp size={8} />
                              {seller}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* No data message */}
                      {!hasData && hasTrenData && (
                        <p className="text-[10px] text-slate-300 italic mt-1">Belum ada penjualan</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daftar Seller */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Users size={14} className="text-emerald-600" />
          Daftar Seller
        </h3>

        {sellerList.length === 0 ? (
          <div className="text-center py-10">
            <Store className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Belum ada penjualan ke seller</p>
            <p className="text-[11px] text-slate-300 mt-1">
              Daftar seller akan muncul setelah ada pengajuan stok yang selesai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sellerList.map((seller) => (
              <div
                key={seller.nama}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:border-emerald-100 hover:bg-emerald-50/20 transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Store size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{seller.nama}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Membeli {seller.produk.size} jenis produk
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-full text-[10px] text-blue-600 font-medium flex-shrink-0">
                  <TrendingUp size={10} />
                  Aktif
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrenPenjualanPage;
