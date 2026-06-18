import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PackageCheck, ArrowLeft, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import api from '../../lib/api';

interface GradingPenerimaan {
  namaGrade: string;
  beratKg: string;
  hargaPerKg?: string;
  isReject: boolean;
  alasanReject?: string;
  produkTerhubungId: string;
}

const CopyableId: React.FC<{ label?: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = value.length > 15 ? `${value.substring(0, 12)}...` : value;

  return (
    <div className="flex items-center gap-1.5 text-xs bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg w-fit">
      {label && <span className="text-slate-400 font-medium">{label}:</span>}
      <span className="font-mono text-slate-600 font-bold" title={value}>{display}</span>
      <button 
        onClick={handleCopy}
        className="ml-1 text-slate-400 hover:text-emerald-600 transition-colors focus:outline-none"
        title="Salin ID"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>
    </div>
  );
};

const GradingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [penerimaan, setPenerimaan] = useState<any>(null);
  const [, setProdukList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [gradings, setGradings] = useState<GradingPenerimaan[]>([
    { namaGrade: 'Berat Bersih (Masuk Stok)', beratKg: '', isReject: false, produkTerhubungId: '' },
    { namaGrade: 'Penyusutan / Reject', beratKg: '', isReject: true, produkTerhubungId: '', alasanReject: 'Penyusutan / Rusak' }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resPenerimaan, resProduk] = await Promise.all([
          api.get(`/penerimaan/${id}`),
          api.get(`/produk`)
        ]);

        const dataPenerimaan = resPenerimaan.data;
        const dataProduk = resProduk.data;

        if (dataPenerimaan.statusCode === 200) {
          setPenerimaan(dataPenerimaan.data);
        }
        if (dataProduk.statusCode === 200) {
          setProdukList(dataProduk.data);
        }

        // Auto-select produk berdasarkan komoditas
        if (dataPenerimaan.statusCode === 200 && dataProduk.statusCode === 200) {
          const pen = dataPenerimaan.data;
          const prods = dataProduk.data;
          
          const matchedProduct = prods.find((p: any) => 
            (pen.kodeKomoditasGlobal && p.kodeKomoditasGlobal === pen.kodeKomoditasGlobal) ||
            (pen.komoditasNama && p.nama.toLowerCase() === pen.komoditasNama.toLowerCase())
          );

          if (matchedProduct) {
            setGradings(prev => {
              const newGradings = [...prev];
              newGradings[0].produkTerhubungId = matchedProduct.id;
              return newGradings;
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const totalGrading = gradings.reduce((sum, g) => sum + (Number(g.beratKg) || 0), 0);
  const isSesuai = penerimaan ? Math.abs(totalGrading - penerimaan.beratDiterimaKg) < 0.1 : false;

  const handleUpdateGrading = (index: number, field: keyof GradingPenerimaan, value: any) => {
    const newGradings = [...gradings];
    newGradings[index] = { ...newGradings[index], [field]: value };

    if (index === 0 && field === 'beratKg') {
      const masukStok = Number(value) || 0;
      const totalPenerimaan = penerimaan?.beratDiterimaKg || 0;
      const reject = Math.max(0, totalPenerimaan - masukStok);
      newGradings[1] = {
        ...newGradings[1],
        beratKg: reject > 0 ? reject.toFixed(2) : ''
      };
    }

    setGradings(newGradings);
  };

  const submitGrading = async () => {
    try {
      const response = await api.post(`/penerimaan/${id}/grading`, {
        gradings: gradings.filter(g => Number(g.beratKg) > 0)
      });
      const data = response.data;
      if (data.statusCode === 201 || data.statusCode === 200) {
        alert('Grading berhasil disimpan!');
        window.location.reload();
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
      alert('Gagal: ' + errMsg);
    }
  };

  const selesaikanPenerimaan = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menyelesaikan penerimaan ini? Stok produk akan otomatis bertambah.')) return;

    try {
      const response = await api.post(`/penerimaan/${id}/selesaikan`);
      const data = response.data;
      if (data.statusCode === 200) {
        alert('Stok berhasil ditambahkan!');
        navigate('/penerimaan');
      } else {
        alert('Gagal: ' + data.message);
      }
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.message || error.message || 'Terjadi kesalahan sistem';
      alert('Gagal: ' + errMsg);
    }
  };

  if (loading) return <div className="p-8 text-center">Memuat data...</div>;
  if (!penerimaan) return <div className="p-8 text-center text-red-500">Penerimaan tidak ditemukan</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/penerimaan')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Sortir <span className="text-emerald-600">{penerimaan.komoditasNama || 'Komoditas'}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <CopyableId label="Penerimaan" value={penerimaan.nomorPenerimaan} />
              <CopyableId label="Penjemputan" value={penerimaan.penjemputanId} />
            </div>
          </div>
          <div className="bg-emerald-50 px-4 py-2 rounded-xl text-center">
            <span className="block text-xs text-emerald-600 font-bold mb-1">Total Diterima</span>
            <span className="text-2xl font-black text-emerald-700">{penerimaan.beratDiterimaKg} <span className="text-base font-semibold">Kg</span></span>
          </div>
        </div>

        {penerimaan.status === 'RECEIVED' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Card Berat Bersih */}
              <div className="bg-white border border-emerald-100 rounded-2xl p-5 shadow-sm shadow-emerald-50/50 hover:shadow-emerald-100/50 transition-shadow">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Berat Bersih</h3>
                    <p className="text-[11px] text-slate-500">Barang layak masuk stok</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Input Berat Masuk Stok</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full pl-4 pr-12 py-3 text-xl font-black text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50 focus:bg-white transition-all outline-none"
                        placeholder="0"
                        value={gradings[0].beratKg}
                        onChange={(e) => handleUpdateGrading(0, 'beratKg', e.target.value)}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">Kg</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Reject */}
              <div className="bg-white border border-red-100 rounded-2xl p-5 shadow-sm shadow-red-50/50">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shrink-0">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Penyusutan / Reject</h3>
                    <p className="text-[11px] text-slate-500">Barang afkir yang dibuang</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1.5">Otomatis Terhitung</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full pl-4 pr-12 py-3 text-xl font-black text-red-700 border border-transparent rounded-xl bg-red-50/50 outline-none"
                        value={gradings[1].beratKg}
                        readOnly
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-red-400 font-semibold">Kg</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className={`p-5 rounded-2xl flex items-center justify-between transition-all ${isSesuai ? 'bg-emerald-50 border border-emerald-100 text-emerald-800' : 'bg-amber-50 border border-amber-100 text-amber-800'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isSesuai ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {isSesuai ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <p className="font-bold text-lg leading-tight">Total: {totalGrading.toFixed(1)} Kg</p>
                  {!isSesuai && <p className="text-sm font-medium mt-0.5 opacity-90">Selisih {Math.abs(penerimaan.beratDiterimaKg - totalGrading).toFixed(2)} Kg. Harus sama persis!</p>}
                </div>
              </div>
              <button
                onClick={submitGrading}
                disabled={!isSesuai}
                className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <PackageCheck size={18} />
                Simpan & Lanjutkan
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-blue-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-bold">Grading Selesai</h4>
                <p className="text-sm mt-1">
                  Hasil sortir sudah dicatat. Tekan tombol di bawah untuk memasukkan hasil grading ini ke dalam stok gudang secara permanen.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-slate-600">Grade</th>
                    <th className="p-3 text-slate-600">Berat</th>
                    <th className="p-3 text-slate-600">Status Stok</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {penerimaan.gradings.map((g: any) => (
                    <tr key={g.id}>
                      <td className="p-3 font-medium">{g.namaGrade}</td>
                      <td className="p-3">{g.beratKg} Kg</td>
                      <td className="p-3">
                        {g.isReject ? (
                          <span className="text-red-500 font-medium">Reject (Tidak masuk stok)</span>
                        ) : (
                          <span className="text-emerald-600 font-medium">+ Tambah ke Stok</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {penerimaan.status === 'VERIFIED' && (
              <button
                onClick={selesaikanPenerimaan}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <PackageCheck className="w-5 h-5" />
                Selesaikan & Masukkan ke Stok Gudang
              </button>
            )}
            
            {penerimaan.status === 'STOCKED' && (
              <div className="w-full py-3 bg-slate-100 text-slate-500 text-center rounded-xl font-bold">
                Penerimaan Telah Selesai
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GradingPage;
