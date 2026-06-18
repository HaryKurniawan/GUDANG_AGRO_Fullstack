import { useState } from "react";
import { FileText, FileCode, GitBranch, Table, Share2, HelpCircle, Code, ShieldCheck } from "lucide-react";

export default function DocumentationView() {
  const [activeSubTab, setActiveSubTab] = useState<'erd' | 'flow' | 'api' | 'files'>('erd');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center space-x-2">
          <FileText className="text-emerald-400" size={20} />
          <span>Dokumentasi Sistem & Presentasi Skripsi</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1 font-sans">
          Arsitektur detail, skema relasional ERD, alur flowchart, dan tabel REST API pengawal operasional sayuran beku.
        </p>
      </div>

      {/* Navigation Sub Tabs */}
      <div className="flex border-b border-slate-800 space-x-1 font-sans select-none overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSubTab('erd')}
          className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'erd' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Table size={14} />
          <span>Skema ERD Database</span>
        </button>

        <button
          onClick={() => setActiveSubTab('flow')}
          className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'flow' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <GitBranch size={14} />
          <span>Flowchart Alur Sistem</span>
        </button>

        <button
          onClick={() => setActiveSubTab('api')}
          className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'api' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Code size={14} />
          <span>Arsitektur API Endpoints</span>
        </button>

        <button
          onClick={() => setActiveSubTab('files')}
          className={`px-4 py-2 border-b-2 font-bold transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap ${
            activeSubTab === 'files' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <FileCode size={14} />
          <span>Struktur Direktori Folder</span>
        </button>
      </div>

      {/* ACTIVE SUB TAB CONTENT */}
      {activeSubTab === 'erd' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
          <div className="flex items-start space-x-3 text-emerald-400">
            <ShieldCheck size={18} className="shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-300">Entity Relationship Diagram (ERD Schema) - MySQL / PostgreSQL compliant</p>
              <p className="text-slate-400">
                Hubungan relasional antar entitas dalam database WMS Lembang Cold Storage, dirancang dengan integrasi constraint database:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono text-[11px] leading-relaxed">
            {/* Table Users */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">1. tb_users</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">username</span> [VARCHAR(64)] (UNIQUE)</li>
                <li><span className="text-slate-300">password_hash</span> [VARCHAR(256)]</li>
                <li><span className="text-slate-300">full_name</span> [VARCHAR(128)]</li>
                <li><span className="text-slate-300">role</span> [ENUM('WMS-Admin', 'Ka-Produksi', 'Pimpinan')]</li>
              </ul>
            </div>

            {/* Table Orders */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">2. tb_orders</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">order_date</span> [DATE]</li>
                <li><span className="text-slate-300">commodity</span> [VARCHAR(64)]</li>
                <li><span className="text-slate-300">packaging</span> [VARCHAR(32)]</li>
                <li><span className="text-slate-300">package_weight</span> [DECIMAL(5,2)]</li>
                <li><span className="text-slate-300">quantity</span> [INT]</li>
                <li><span className="text-slate-300">total_weight</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">status</span> [VARCHAR(32)]</li>
              </ul>
            </div>

            {/* Table Procurements */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">3. tb_procurements</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">commodity</span> [VARCHAR(64)]</li>
                <li><span className="text-slate-300">needed_weight</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">est_shrinkage</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">to_order</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">market_price</span> [DECIMAL(12,2)]</li>
                <li><span className="text-slate-300">total_price</span> [DECIMAL(15,2)]</li>
                <li><span className="text-slate-300">expected_date</span> [DATE]</li>
                <li><span className="text-slate-300">status</span> [VARCHAR(32)]</li>
              </ul>
            </div>

            {/* Table Deliveries */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">4. tb_deliveries</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">procurement_id</span> [VARCHAR(32)] <span className="text-blue-400 font-bold">[FK]</span></li>
                <li><span className="text-slate-300">farmer_name</span> [VARCHAR(128)]</li>
                <li><span className="text-slate-300">sent_weight</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">scaled_weight_wh</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">scale_difference</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">photo_url</span> [TEXT]</li>
                <li><span className="text-slate-300">geotagging</span> [VARCHAR(256)]</li>
              </ul>
            </div>

            {/* Table QC Checklists */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">5. tb_qc_checklists</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">delivery_id</span> [VARCHAR(32)] <span className="text-blue-400 font-bold">[FK]</span></li>
                <li><span className="text-slate-300">warna_cerah</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">tekstur_padat</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">tidak_berlendir</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">bebas_busuk</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">bebas_rusak</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">is_reject</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">reject_weight</span> [DECIMAL(10,2)]</li>
              </ul>
            </div>

            {/* Table Productions */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">6. tb_productions</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">order_id</span> [VARCHAR(32)] <span className="text-blue-400 font-bold">[FK-Opt]</span></li>
                <li><span className="text-slate-300">target_weight</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">yield_weight</span> [DECIMAL(10,2)]</li>
                <li><span className="text-slate-300">package_type</span> [VARCHAR(32)]</li>
                <li><span className="text-slate-300">is_vacuum_checked</span> [BOOLEAN]</li>
                <li><span className="text-slate-300">freezer_location</span> [VARCHAR(128)]</li>
              </ul>
            </div>

            {/* Table HPP Records */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">7. tb_hpp_records</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">prod_job_id</span> [VARCHAR(32)] <span className="text-blue-400 font-bold">[FK]</span></li>
                <li><span className="text-slate-300">raw_material_cost</span> [DECIMAL(15,2)]</li>
                <li><span className="text-slate-300">labor_cost</span> [DECIMAL(12,2)]</li>
                <li><span className="text-slate-300">operational_cost</span> [DECIMAL(12,2)]</li>
                <li><span className="text-slate-300">packaging_cost</span> [DECIMAL(12,2)]</li>
                <li><span className="text-slate-300">depreciation_cost</span> [DECIMAL(12,2)]</li>
                <li><span className="text-slate-300">distribution_cost</span> [DECIMAL(12,2)]</li>
                <li><span className="text-slate-300">total_cost</span> [DECIMAL(15,2)]</li>
                <li><span className="text-slate-300">hpp_per_kg</span> [DECIMAL(12,2)]</li>
              </ul>
            </div>

            {/* Table Audit Logs */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 col-span-1 md:col-span-2">
              <p className="text-xs font-bold text-emerald-400 border-b border-slate-900 pb-1 font-sans">8. tb_audit_logs</p>
              <ul className="space-y-1 text-slate-400">
                <li><span className="text-white font-bold">id</span> [VARCHAR(32)] <span className="text-amber-500 font-bold">[PK]</span></li>
                <li><span className="text-slate-300">username</span> [VARCHAR(64)]</li>
                <li><span className="text-slate-300">role</span> [VARCHAR(64)]</li>
                <li><span className="text-slate-300">action</span> [VARCHAR(128)]</li>
                <li><span className="text-slate-300">details</span> [TEXT]</li>
                <li><span className="text-slate-300">timestamp</span> [TIMESTAMP]</li>
                <li><span className="text-slate-300">ip_address</span> [VARCHAR(45)]</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'flow' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2">
            Swimlane Sistem Alur Kerja Pergudangan Sayuran Beku (SBU ke Petani ke Pembekuan)
          </p>

          <div className="space-y-3 font-sans text-xs">
            <div className="bg-slate-955 p-3.5 rounded-lg border border-slate-850 space-y-2">
              <span className="bg-slate-900 p-1 px-2.5 rounded font-bold text-[10px] uppercase text-slate-400">Fase 1: Tangkap SBU Demand</span>
              <p className="text-slate-300 leading-normal">
                SBU Bandung mengirimkan permintaan (<strong>ORD-XXXX</strong>) berisi tipe komoditas sayur, berat, kemasan. Sistem merangkum total order yang masuk.
              </p>
            </div>

            <div className="text-center font-bold text-slate-600">▼</div>

            <div className="bg-slate-955 p-3.5 rounded-lg border border-slate-850 space-y-2">
              <span className="bg-slate-900 p-1 px-2.5 rounded font-bold text-[10px] uppercase text-emerald-400">Fase 2: Perhitungan Estimasi Susut PO</span>
              <p className="text-slate-300 leading-normal">
                Admin pergudangan mengkalkulasi kebutuhan sayur kotor dari kelompok tani dengan persentase penyusutan (Carrot: 35%, French Beans: 7%, Corn: 10%). Permintaan PO (<strong>REQ-XXXX</strong>) dikunci and diberikan ke Kepala Tani.
              </p>
            </div>

            <div className="text-center font-bold text-slate-600">▼</div>

            <div className="bg-slate-955 p-3.5 rounded-lg border border-slate-850 space-y-2">
              <span className="bg-slate-900 p-1 px-2.5 rounded font-bold text-[10px] uppercase text-cyan-400">Fase 3: Jembatan Timbang & Geotag</span>
              <p className="text-slate-300 leading-normal">
                Truk logistik tani datang membawa pasokan muatan. Sopir difoto live dari kamera jembatan timbang (anti-galeri) mencatatkan Geotag GPS. Dilakukan timbang berat bersih warehouse. Jika kurang/lebih langsung terpicu notifikasi logistik pertanian.
              </p>
            </div>

            <div className="text-center font-bold text-slate-600">▼</div>

            <div className="bg-slate-955 p-3.5 rounded-lg border border-slate-850 space-y-2">
              <span className="bg-slate-900 p-1 px-2.5 rounded font-bold text-[10px] uppercase text-amber-400">Fase 4: Checklist Fitosanitasi Lab (QC)</span>
              <p className="text-slate-300 leading-normal">
                Uji laboratorium visual, kelembapan, and saringan serangga. Jika terdeteksi berlendir, bercakar busuk/ulat, batch sayur langsung ditumpahkan ke log reject and tidak diajukan ke jajaran freezer IQF.
              </p>
            </div>

            <div className="text-center font-bold text-slate-600">▼</div>

            <div className="bg-slate-955 p-3.5 rounded-lg border border-slate-850 space-y-2">
              <span className="bg-slate-900 p-1 px-2.5 rounded font-bold text-[10px] uppercase text-purple-400">Fase 5: Pembekuan IQF & Sealing Vacuum</span>
              <p className="text-slate-300 leading-normal">
                Bahan dibilas, blanching uap panas, direndam batu es, disentrifugasi mesin spinner, lalu dikemas vacuum bag. Pimpinan menyetujui output dipindahkan ke zone sub-zero freezer.
              </p>
            </div>

            <div className="text-center font-bold text-slate-600">▼</div>

            <div className="bg-slate-955 p-3.5 rounded-lg border border-slate-850 space-y-2">
              <span className="bg-slate-900 p-1 px-2.5 rounded font-bold text-[10px] uppercase text-white">Fase 6: Penghitungan HPP Akurat & Dispatch BAST</span>
              <p className="text-slate-300 leading-normal">
                Perhitungan HPP otomatis yang menggabungkan upah pegawai, mesin, transport, dan bahan baku petani. Invoice dicetak bersandikan Berita Acara (BAST) untuk diserahkan ke SBU Bandung.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'api' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-4 bg-slate-955 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">REST API Server Route Map (Express.js Router)</span>
          </div>

          <div className="overflow-x-auto font-mono text-[11px]">
            <table className="w-full text-left text-slate-300">
              <thead className="bg-slate-955 text-slate-550 border-b border-slate-800 text-[10px] uppercase tracking-wide">
                <tr>
                  <th className="p-3">HTTP Methode</th>
                  <th className="p-3 text-emerald-400">API Endpoint Path</th>
                  <th className="p-3 text-slate-400">Parameter Payload Requred</th>
                  <th className="p-3">Rangkuman Kegunaan Controller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 divide-slate-800/60">
                <tr>
                  <td className="p-3 font-bold text-blue-400">POST</td>
                  <td className="p-3 text-emerald-400">/api/auth/login</td>
                  <td className="p-3 text-slate-500">{"{ username, password }"}</td>
                  <td className="p-3 text-slate-400">Autentikasi & mencatatkan log masuk audit</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-emerald-400">GET</td>
                  <td className="p-3 text-emerald-400">/api/orders</td>
                  <td className="p-3 text-slate-500">None</td>
                  <td className="p-3 text-slate-400">Membaca daftar pesanan cold pack SBU Bandung</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-400">POST</td>
                  <td className="p-3 text-emerald-400">/api/orders</td>
                  <td className="p-3 text-slate-500">{"{ commodity, packaging, packageWeight, quantity }"}</td>
                  <td className="p-3 text-slate-400">Mencatat permintaan order SBU Bandung baru</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-yellow-400">PUT</td>
                  <td className="p-3 text-emerald-400">/api/orders/:id</td>
                  <td className="p-3 text-slate-500">{"{ status, operator }"}</td>
                  <td className="p-3 text-slate-400">Mutasi status order (Menunggu menjadi selesai/kirim)</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-400">POST</td>
                  <td className="p-3 text-emerald-400">/api/procurements</td>
                  <td className="p-3 text-slate-500">{"{ commodity, rawMaterialToOrder, expectedDeliveryDate }"}</td>
                  <td className="p-3 text-slate-400">Mengajukan pemenuhan bahan baku sayur ke petani</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-400">POST</td>
                  <td className="p-3 text-emerald-400">/api/deliveries</td>
                  <td className="p-3 text-slate-500">{"{ procurementId, farmerName, sentWeight, photoUrl, photoMetadata }"}</td>
                  <td className="p-3 text-slate-400">Mendaftarkan pasokan masuk dari sopir tani luar</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-yellow-400">PUT</td>
                  <td className="p-3 text-emerald-400">/api/deliveries/:id/scale</td>
                  <td className="p-3 text-slate-500">{"{ scaledWeightWarehouse, scaleNotes }"}</td>
                  <td className="p-3 text-slate-400">Mencatat dan membandingkan deviasi timbangan</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-400">POST</td>
                  <td className="p-3 text-emerald-400">/api/qc-checklists</td>
                  <td className="p-3 text-slate-500">{"{ deliveryId, warnaCerah, teksturPadat, tidakBerlendir, rejectWeight }"}</td>
                  <td className="p-3 text-slate-400">Merekam pengawasan audit fitosanitasi reject</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-yellow-400">PUT</td>
                  <td className="p-3 text-emerald-400">/api/productions/:id/packaging</td>
                  <td className="p-3 text-slate-500">{"{ packageType, completedUnits, isVacuumChecked, freezerName }"}</td>
                  <td className="p-3 text-slate-400">Menyegel vacuum produk jadi pembekuan di lemari es</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-blue-400">POST</td>
                  <td className="p-3 text-emerald-400">/api/hpp</td>
                  <td className="p-3 text-slate-500">{"{ productionJobId, rawMaterialCost, laborCost, operationalCost }"}</td>
                  <td className="p-3 text-slate-400">Menetapkan HPP/Kg final terpadu komoditas beku</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'files' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <p className="text-xs font-bold text-emerald-405 text-emerald-400 uppercase tracking-widest border-b border-slate-800 pb-2">
            Struktur Komponen Program File (Full-Stack Architecture)
          </p>

          <pre className="text-amber-400 font-mono text-[11px] bg-slate-950 p-4 rounded-xl leading-relaxed whitespace-pre overflow-x-auto">
{`📂 frozen-vegetable-wms/
├── 📄 server-db.json            # Database Relasional-Semu (Buku Kas & Logistik)
├── 📄 server.ts                 # HTTP Express.js Controller & REST Gateway
├── 📄 package.json              # TypeScript dev tooling, Recharts & Tailwind scripts
├── 📄 vite.config.ts            # Bootloader SPA reverse-proxy
├── 📄 tsconfig.json             # Konfigurasi compiler tsx node-system
├── 📂 src/
│   ├── 📄 main.tsx              # React mounting root
│   ├── 📄 types.ts              # Model data struktur kontrak asersi
│   ├── 📄 index.css             # Root Tailwind CSS bundle loader
│   ├── 📄 App.tsx               # Wrapper tab navigasi & State synchronizer
│   └── 📂 components/
│       ├── 📄 Sidebar.tsx       # ERP enterprise navigation (Role-based access)
│       ├── 📄 LoginView.tsx      # Secure SHA-256 JWT Authentication portal
│       ├── 📄 DashboardView.tsx  # KPI charts, Recharts, live alerts, and warnings
│       ├── 📄 SBUOrdersView.tsx  # Bandung sales order & aggregate totals
│       ├── 📄 RawMaterialsProcurementView.tsx # Persentase susut & PO Kelompok Tani
│       ├── 📄 PenerimaanBahanBakuView.tsx # Camera Geotag tracker (Anti-Galeri)
│       ├── 📄 TimbangUlangView.tsx # Jembatan timbang & shortage WhatsApp notifier
│       ├── 📄 QualityControlView.tsx # Checklist sanitasi lab & reject logs
│       ├── 📄 ProductionView.tsx # IQF steps pipeline & vacuum packing seal
│       ├── 📄 HppView.tsx        # COGS HPP calculator & line charts trends
│       ├── 📄 ShipmentView.tsx   # Truck express dispacther & printable BAST sheets
│       ├── 📄 AuditLogView.tsx   # Pegawai activity secure log auditor
│       └── 📄 DocumentationView.tsx # ERD design, flowchart, API endpoints guide`}
          </pre>
        </div>
      )}
    </div>
  );
}
