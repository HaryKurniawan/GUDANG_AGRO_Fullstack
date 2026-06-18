import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Plus, RotateCcw, ChevronRight, Calculator, AlertCircle, Trash2, Sparkles } from "lucide-react";
import { HppRecord, ProductionJob, UserSession } from "../types";

interface HppViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

export default function HppView({
  session, setErrorNotification, setSuccessNotification, triggerRefreshStats
}: HppViewProps) {
  const [hppList, setHppList] = useState<HppRecord[]>([]);
  const [completedJobs, setCompletedJobs] = useState<ProductionJob[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [productions, setProductions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // VIEW TAB TOGGLE
  const [activeTab, setActiveTab] = useState<"simulasi_mandiri" | "alokasi_sbu">("simulasi_mandiri");

  // CUSTOM HPP CALCULATOR (REQUESTED STYLING WITH DROPDOWN CHOICES: wortel, jagung, buncis, mix vegetable)
  const [customHppList, setCustomHppList] = useState<any[]>([]);
  const [customProductName, setCustomProductName] = useState("wortel");
  const [customMaterials, setCustomMaterials] = useState<Array<{ id: string; name: string; unit: string; price: string }>>([
    { id: "1", name: "Bahan Baku Wortel (300kg)", unit: "Kg", price: "900000" },
    { id: "2", name: "Kemasan Plastik", unit: "Pack", price: "15000" }
  ]);
  const [customLaborCost, setCustomLaborCost] = useState("400000");
  const [customOverheadCost, setCustomOverheadCost] = useState("50000");
  const [customYieldUnits, setCustomYieldUnits] = useState("195");
  const [priceInput, setPriceInput] = useState("15000");
  const [marginInput, setMarginInput] = useState("");
  const [latestChanged, setLatestChanged] = useState<"price" | "margin">("price");

  // Overhead & Bulk Cost Allocation States for SBU Batch Allocator Tab
  const [bulkOverheadWages, setBulkOverheadWages] = useState("1500000"); 
  const [bulkOverheadElectricity, setBulkOverheadElectricity] = useState("1200000"); 
  const [bulkPackagingCost, setBulkPackagingCost] = useState("800000"); 
  const [allocationMethod, setAllocationMethod] = useState<"weight" | "pack">("weight"); 

  // Cost Input states
  const [selectedJobId, setSelectedJobId] = useState("");
  const [productionYield, setProductionYield] = useState(0);
  const [rawMaterialCost, setRawMaterialCost] = useState("6545000"); 
  const [laborCost, setLaborCost] = useState("450000");
  const [operationalCost, setOperationalCost] = useState("600000");
  const [packagingCost, setPackagingCost] = useState("250000");
  const [depreciationCost, setDepreciationCost] = useState("150000");
  const [distributionCost, setDistributionCost] = useState("500000");

  const [activeCommodity, setActiveCommodity] = useState("Wortel");

  const syncData = async () => {
    setLoading(true);
    try {
      const hResponse = await fetch("/api/hpp");
      const hData = await hResponse.json();
      setHppList(hData);

      const pResponse = await fetch("/api/productions");
      const pData = await pResponse.json();
      setProductions(pData);
      
      const completeNoHpp = pData.filter((p: any) => 
        p.status === "Selesai" && !hData.some((h: any) => h.productionJobId === p.id)
      );
      setCompletedJobs(completeNoHpp);

      const procResponse = await fetch("/api/procurements");
      const procData = await procResponse.json();
      setProcurements(procData);

      // Fetch custom-hpp too
      try {
        const customRes = await fetch("/api/custom-hpp");
        if (customRes.ok) {
          const customData = await customRes.json();
          setCustomHppList(customData);
        }
      } catch (e) {
        console.error("Gagal sinkron HPP simulasi mandiri:", e);
      }
    } catch (e) {
      setErrorNotification("Gagal melacak entri HPP.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
  }, []);

  const handleJobSelection = (jobId: string) => {
    setSelectedJobId(jobId);
    const found = completedJobs.find((j) => j.id === jobId);
    if (found) {
      setProductionYield(found.yieldWeight);
      setActiveCommodity(found.commodity);
      
      let estimatedRawPrice = found.allocatedRawMaterial * 8500;
      if (found.commodity === "Buncis") estimatedRawPrice = found.allocatedRawMaterial * 11000;
      else if (found.commodity === "Jagung Manis") estimatedRawPrice = found.allocatedRawMaterial * 7000;
      setRawMaterialCost(String(estimatedRawPrice));
    }
  };

  const handlePostHpp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      setErrorNotification("Silakan tentukan nomor job produksi!");
      return;
    }

    try {
      const response = await fetch("/api/hpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionJobId: selectedJobId,
          rawMaterialCost: parseFloat(rawMaterialCost),
          laborCost: parseFloat(laborCost),
          operationalCost: parseFloat(operationalCost),
          packagingCost: parseFloat(packagingCost),
          depreciationCost: parseFloat(depreciationCost),
          distributionCost: parseFloat(distributionCost),
          yieldWeight: productionYield,
          operator: { username: session.username, role: session.role }
        })
      });

      if (!response.ok) {
        throw new Error("Gagal menyimpan alokasi nominal HPP SBU Bandung.");
      }

      setSuccessNotification("HPP SBU Bandung berhasil disahkan dan terekam!");
      setSelectedJobId("");
      setProductionYield(0);
      syncData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // CUSTOM INDEPENDENT HPP CALCULATOR HANDLERS
  const addCustomMaterial = () => {
    const nextId = String(Date.now());
    setCustomMaterials([
      ...customMaterials,
      { id: nextId, name: "", unit: "Kg", price: "0" }
    ]);
  };

  const removeCustomMaterial = (id: string) => {
    if (customMaterials.length <= 1) {
      setErrorNotification("Wajib mengisi minimal satu bahan pembentuk HPP!");
      return;
    }
    setCustomMaterials(customMaterials.filter((m) => m.id !== id));
  };

  const handleCustomMaterialChange = (id: string, field: "name" | "unit" | "price", value: string) => {
    setCustomMaterials(
      customMaterials.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const calculateAndSaveCustomHpp = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseFloat(customYieldUnits) || 0;
    if (qty <= 0) {
      setErrorNotification("Jumlah produk yang dihasilkan harus lebih besar dari nol!");
      return;
    }

    try {
      const totalMatCost = customMaterials.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
      const labor = parseFloat(customLaborCost) || 0;
      const overhead = parseFloat(customOverheadCost) || 0;
      const calculatedHppPerUnit = (totalMatCost + labor + overhead) / qty;

      const response = await fetch("/api/custom-hpp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: customProductName,
          materials: customMaterials.map((m) => ({
            name: m.name || "Bahan Baku",
            unit: m.unit || "Unit",
            price: parseFloat(m.price) || 0
          })),
          laborCost: labor,
          overheadCost: overhead,
          yieldUnits: qty,
          totalMaterialCost: totalMatCost,
          calculatedHpp: Math.round(calculatedHppPerUnit),
          sellingPrice: Math.round(finalSellingPrice),
          marginAmount: Math.round(finalMarginAmount),
          marginPercentage: parseFloat(finalMarginPercent.toFixed(2)),
          operator: { username: session.username, role: session.role }
        })
      });

      if (!response.ok) {
        throw new Error("Gagal mengirim simulasi HPP mandiri ke server database.");
      }

      setSuccessNotification(`Hasil perhitungan HPP untuk produk ${customProductName} sukses diarsipkan!`);
      syncData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const getRawMaterialPoCostByCommodity = (comm: string) => {
    return procurements.reduce((acc, proc) => {
      if (proc.items && proc.items.length > 0) {
        const itemSum = proc.items
          .filter((item: any) => item.commodity === comm)
          .reduce((sum: number, item: any) => sum + (parseFloat(item.totalPrice) || 0), 0);
        return acc + itemSum;
      }
      if (proc.commodity === comm) {
        return acc + (parseFloat(proc.totalPrice) || 0);
      }
      return acc;
    }, 0);
  };

  const getColdStorageWeights = () => {
    const weights: Record<string, { totalWeight: number; totalPacks: number }> = {
      "Wortel": { totalWeight: 0, totalPacks: 0 },
      "Buncis": { totalWeight: 0, totalPacks: 0 },
      "Jagung Manis": { totalWeight: 0, totalPacks: 0 },
      "Sayuran Mix": { totalWeight: 0, totalPacks: 0 }
    };

    productions.filter((p: any) => p.status === "Selesai").forEach((p: any) => {
      if (p.yieldItems && p.yieldItems.length > 0) {
        p.yieldItems.forEach((item: any) => {
          const comm = item.commodity || p.commodity;
          if (weights[comm]) {
            weights[comm].totalWeight += parseFloat(item.totalWeight) || (parseFloat(item.unitWeight) * parseInt(item.completedUnits)) || 0;
            weights[comm].totalPacks += parseInt(item.completedUnits) || 0;
          }
        });
      } else {
        const comm = p.commodity;
        if (weights[comm]) {
          weights[comm].totalWeight += parseFloat(p.yieldWeight) || 0;
          weights[comm].totalPacks += parseInt(p.packaging?.completedUnits || p.completedUnits || 0);
        }
      }
    });

    return weights;
  };

  const commoditiesList = ["Wortel", "Buncis", "Jagung Manis", "Sayuran Mix"];
  const csWeights = getColdStorageWeights();
  const totalWeightSystem = Object.values(csWeights).reduce((sum, item) => sum + item.totalWeight, 0);
  const totalPacksSystem = Object.values(csWeights).reduce((sum, item) => sum + item.totalPacks, 0);

  const wagesVal = parseFloat(bulkOverheadWages) || 0;
  const overheadVal = parseFloat(bulkOverheadElectricity) || 0;
  const plasticVal = parseFloat(bulkPackagingCost) || 0;
  const totalOverheadPool = wagesVal + overheadVal;

  const dynamicHppData = commoditiesList.map((comm) => {
    const cs = csWeights[comm] || { totalWeight: 0, totalPacks: 0 };
    const rawCost = getRawMaterialPoCostByCommodity(comm);

    let ratio = 0;
    if (allocationMethod === "weight") {
      ratio = totalWeightSystem > 0 ? (cs.totalWeight / totalWeightSystem) : 0;
    } else {
      ratio = totalPacksSystem > 0 ? (cs.totalPacks / totalPacksSystem) : 0;
    }

    const allocatedPlastic = plasticVal * ratio;
    const allocatedOverhead = totalOverheadPool * ratio;
    const totalCost = rawCost + allocatedPlastic + allocatedOverhead;
    const hppPerKg = cs.totalWeight > 0 ? Math.round(totalCost / cs.totalWeight) : 0;

    return {
      commodity: comm,
      rawCost,
      allocatedPlastic,
      allocatedOverhead,
      totalCost,
      yieldWeight: cs.totalWeight,
      yieldPacks: cs.totalPacks,
      hppPerKg
    };
  });

  const trendChartData = hppList.map((h) => ({
    name: h.id,
    HPP: h.hppPerKg,
    Raw: Math.round(h.rawMaterialCost / h.productionYield),
    BiayaLain: Math.round((h.laborCost + h.operationalCost + h.packagingCost + h.depreciationCost + h.distributionCost) / h.productionYield),
    Komoditas: h.commodity
  }));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        <p className="text-xs text-slate-400 font-mono">Sinkronisasi data HPP & persediaan...</p>
      </div>
    );
  }

  // DYNAMIC SIMULATION TARGET CALCULATOR
  const customTotalMatCost = customMaterials.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
  const customQty = parseFloat(customYieldUnits) || 1;
  const customLabor = parseFloat(customLaborCost) || 0;
  const customOverhead = parseFloat(customOverheadCost) || 0;
  const customCalculatedHppPerUnit = customQty > 0 ? (customTotalMatCost + customLabor + customOverhead) / customQty : 0;
  const customCalculatedHpp = Math.round(customCalculatedHppPerUnit);

  let finalSellingPrice = 0;
  let finalMarginPercent = 0;
  let finalMarginAmount = 0;

  if (latestChanged === "price") {
    finalSellingPrice = parseFloat(priceInput) || 0;
    finalMarginAmount = finalSellingPrice - customCalculatedHpp;
    finalMarginPercent = finalSellingPrice > 0 ? (finalMarginAmount / finalSellingPrice) * 100 : 0;
  } else {
    finalMarginPercent = parseFloat(marginInput) || 0;
    if (finalMarginPercent >= 100) {
      finalSellingPrice = customCalculatedHpp;
    } else {
      finalSellingPrice = customCalculatedHpp / (1 - (finalMarginPercent / 100));
    }
    finalSellingPrice = Math.round(finalSellingPrice);
    finalMarginAmount = finalSellingPrice - customCalculatedHpp;
  }

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <TrendingUp className="text-emerald-400" size={20} />
            <span>Manajemen Harga Pokok Penjualan (HPP)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Modul akuntansi biaya terpadu untuk simulasi kelayakan e-commerce & alokasi beban pabrik dingin SBU Bandung.
          </p>
        </div>

        {/* Master sub-tab switches */}
        <div className="shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800 flex space-x-1">
          <button
            type="button"
            onClick={() => setActiveTab("simulasi_mandiri")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "simulasi_mandiri"
                ? "bg-slate-900 border border-slate-800 text-white font-extrabold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Simulasi HPP Mandiri</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("alokasi_sbu")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "alokasi_sbu"
                ? "bg-slate-900 border border-slate-800 text-white font-extrabold shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calculator size={13} className="text-emerald-400" />
            <span>Alokasi Batch SBU</span>
          </button>
        </div>
      </div>

      {activeTab === "simulasi_mandiri" ? (
        // TAB 1: SIMULASI HPP MANDIRI
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Form Input HPP (Kiri) */}
            <form onSubmit={calculateAndSaveCustomHpp} className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 font-mono flex items-center mb-1">
                  <Sparkles size={14} className="text-amber-400 mr-2" />
                  Formulir Simulasi HPP Produk
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Sistem penaksiran Harga Pokok Penjualan instan untuk sayur beku kemasan maupun produk retail olahan.
                </p>
              </div>

              {/* 1. Informasi Produk */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-white font-semibold text-xs border-b border-slate-800/60 pb-2">
                  <span className="bg-emerald-500/10 text-emerald-400 p-1 rounded-md text-[10px] font-mono">01</span>
                  <span>Informasi Produk</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1.5">Nama Produk</label>
                  <select
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 text-slate-100 rounded-lg outline-none font-medium focus:border-emerald-500 transition-colors text-xs cursor-pointer"
                  >
                    <option value="wortel">Wortel</option>
                    <option value="jagung">Jagung</option>
                    <option value="buncis">Buncis</option>
                    <option value="mix vegetable">Mix Vegetable</option>
                  </select>
                </div>
              </div>

              {/* 2. Bahan yang Dibeli */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                  <div className="flex items-center space-x-2 text-white font-semibold text-xs">
                    <span className="bg-emerald-500/10 text-emerald-400 p-1 rounded-md text-[10px] font-mono">02</span>
                    <span>🛒 Bahan yang Dibeli</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {customMaterials.map((m) => (
                    <div key={m.id} className="grid grid-cols-12 gap-2 items-end bg-slate-900/60 p-3 rounded-lg border border-slate-800/40">
                      <div className="col-span-5">
                        <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Nama Bahan</label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: Gula pasir, Kemasan Plastik"
                          value={m.name}
                          onChange={(e) => handleCustomMaterialChange(m.id, "name", e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded text-xs focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Satuan</label>
                        <input
                          type="text"
                          required
                          placeholder="1kg, 1 box"
                          value={m.unit}
                          onChange={(e) => handleCustomMaterialChange(m.id, "unit", e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded text-xs text-center focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[9px] text-slate-500 uppercase font-bold mb-1">Harga Beli (Rp)</label>
                        <input
                          type="number"
                          required
                          placeholder="Rp 15000"
                          value={m.price}
                          min="0"
                          onChange={(e) => handleCustomMaterialChange(m.id, "price", e.target.value)}
                          className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 font-bold rounded text-xs text-right focus:border-emerald-500 outline-none"
                        />
                      </div>
                      <div className="col-span-1 pb-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeCustomMaterial(m.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1.5 hover:bg-slate-950 rounded cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={addCustomMaterial}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-xs transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus size={12} strokeWidth={2.5} />
                    <span>Tambah Bahan</span>
                  </button>
                </div>

                <div className="bg-blue-950/20 border border-blue-900/30 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-300">Total Pembelian Bahan:</span>
                  <span className="text-base font-black text-blue-400 font-mono">
                    Rp {customMaterials.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              {/* 3. Biaya Operasional */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-4">
                <div className="flex items-center space-x-2 text-white font-semibold text-xs border-b border-slate-800/60 pb-2">
                  <span className="bg-emerald-500/10 text-emerald-400 p-1 rounded-md text-[10px] font-mono">03</span>
                  <span>Biaya Operasional & Tenaga Kerja</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                      👨‍💼 Total Biaya Tenaga Kerja (Rp)
                    </label>
                    <input
                      type="number"
                      value={customLaborCost}
                      min="0"
                      onChange={(e) => setCustomLaborCost(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-100 font-bold rounded text-xs focus:border-emerald-500 outline-none"
                    />
                    <p className="text-[9.5px] text-slate-500 mt-1 italic">
                      💡 Cara hitung: Total biaya tenaga kerja langsung untuk batch/periode produksi ini. Contoh: Rp 400.000
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">
                      ⚡ Total Biaya Overhead (Rp)
                    </label>
                    <input
                      type="number"
                      value={customOverheadCost}
                      min="0"
                      onChange={(e) => setCustomOverheadCost(e.target.value)}
                      className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-100 font-bold rounded text-xs focus:border-emerald-500 outline-none"
                    />
                    <p className="text-[9.5px] text-slate-500 mt-1 italic">
                      💡 Cara hitung: Total pengeluaran tidak langsung (listrik, air, penyusutan) untuk batch ini. Contoh: Rp 50.000
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. Hasil Produk */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
                <div className="flex items-center space-x-2 text-white font-semibold text-xs border-b border-slate-800/60 pb-2">
                  <span className="bg-emerald-500/10 text-emerald-400 p-1 rounded-md text-[10px] font-mono">04</span>
                  <span>📦 Jumlah Produk yang Dihasilkan</span>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1">Jumlah Output Jadi (Unit / Pack)</label>
                  <input
                    type="number"
                    value={customYieldUnits}
                    min="1"
                    onChange={(e) => setCustomYieldUnits(e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-100 font-bold rounded text-xs focus:border-emerald-500 outline-none font-mono"
                  />
                </div>
              </div>

              {/* 5. Tentukan Harga Jual & Margin Keuntungan */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-4">
                <div className="flex items-center space-x-2 text-white font-semibold text-xs border-b border-slate-800/60 pb-2">
                  <span className="bg-emerald-500/10 text-emerald-400 p-1 rounded-md text-[10px] font-mono">05</span>
                  <span>💰 Penentuan Harga Jual & Margin Keuntungan</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1 col-span-1">
                      Harga Jual Satuan (Rp)
                    </label>
                    <input
                      type="number"
                      required
                      value={latestChanged === "price" ? priceInput : (finalSellingPrice > 0 ? Math.round(finalSellingPrice).toString() : "")}
                      min="0"
                      onChange={(e) => {
                        setPriceInput(e.target.value);
                        setLatestChanged("price");
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-100 font-bold rounded text-xs focus:border-emerald-500 outline-none"
                      placeholder="Contoh: 15000"
                    />
                    <p className="text-[9.5px] text-slate-500 mt-1 italic">
                      💡 Input harga jual eceran per pack/kilo.
                    </p>
                    {finalSellingPrice > 0 && (
                      <span className="text-[10px] text-emerald-400 font-mono font-bold mt-1 block">
                        = Rp {finalSellingPrice.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 uppercase font-semibold mb-1 col-span-1">
                      Target Margin Keuntungan (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={latestChanged === "margin" ? marginInput : (finalMarginPercent > 0 ? finalMarginPercent.toFixed(2) : "0")}
                      min="0"
                      max="99.9"
                      onChange={(e) => {
                        setMarginInput(e.target.value);
                        setLatestChanged("margin");
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 text-slate-100 font-bold rounded text-xs focus:border-emerald-500 outline-none font-mono"
                      placeholder="Contoh: 30"
                    />
                    <p className="text-[9.5px] text-slate-500 mt-1 italic">
                      💡 Atau input % margin yang diinginkan.
                    </p>
                    {finalMarginPercent > 0 && (
                      <span className="text-[10px] text-amber-400 font-mono font-bold mt-1 block">
                        = {finalMarginPercent.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Proyeksi Selisih Margin:</span>
                  <span className={`font-bold ${finalMarginAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {finalMarginAmount >= 0 ? '+' : ''} Rp {finalMarginAmount.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer text-xs"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Simpan & Tampilkan Hasil Simulasi HPP</span>
              </button>
            </form>

            {/* Display Real-time Preview (Kanan) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl relative overflow-hidden shadow-xl space-y-4">
                <span className="text-[9px] font-extrabold tracking-widest text-emerald-400 bg-emerald-950/35 border border-emerald-900/30 px-2 py-0.5 rounded leading-none">
                  Live Preview Kalkulator HPP
                </span>

                <div className="space-y-1">
                  <span className="block text-xs text-slate-400 font-medium">Proyeksi HPP Produk Mandiri:</span>
                  <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight leading-none pt-1">
                    Rp {customCalculatedHpp.toLocaleString("id-ID")}
                    <span className="text-xs font-normal text-slate-500 block mt-1.5">per Unit / Pack Jadi</span>
                  </div>
                </div>

                <div className="border-t border-slate-800 my-2 pt-4 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Biaya Bahan Baku:</span>
                    <span className="font-mono text-slate-100 font-bold">
                      Rp {customTotalMatCost.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Biaya Bahan per Unit Jadi:</span>
                    <span className="font-mono text-slate-100">
                      Rp {Math.round(customTotalMatCost / customQty).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Upah Tenaga Kerja per Unit:</span>
                    <span className="font-mono text-slate-100">
                      Rp {Math.round(customLabor / customQty).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Overhead pabrik per Unit:</span>
                    <span className="font-mono text-slate-100">
                      Rp {Math.round(customOverhead / customQty).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-805 pt-2 font-bold text-sm">
                    <span className="text-white">Estimasi HPP Standar:</span>
                    <span className="text-emerald-450 text-emerald-400 font-mono text-base font-black">
                      Rp {customCalculatedHpp.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex justify-between border-t border-slate-800/80 pt-2 font-bold">
                    <span className="text-slate-300">Harga Jual Target:</span>
                    <span className="text-cyan-400 font-mono">
                      Rp {finalSellingPrice.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold">
                    <span className="text-slate-300">Margin Keuntungan:</span>
                    <span className={`font-mono ${finalMarginAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      Rp {finalMarginAmount.toLocaleString("id-ID")} ({finalMarginPercent.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Formula Panel */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl text-[11px] text-slate-400 space-y-2.5">
                <span className="block font-bold text-slate-200 tracking-wider">FORMULA SIMULASI HPP</span>
                <p>Formula penaksiran kelayakan HPP mandiri (SBU Retail & Cold Processing):</p>
                <div className="bg-slate-950 p-2.5 text-emerald-400 font-mono text-center rounded border border-slate-800 text-[10.5px]">
                  HPP = (Bahan Baku ÷ Qty) + Labor_Unit + Overhead_Unit
                </div>
              </div>
            </div>

          </div>

          {/* HISTORICAL TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                  📂 Tabel Riwayat Perhitungan HPP Mandiri
                </p>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5">
                  Arsip kalkulasi simulasi yang telah diarsip tersimpan aman di database server.
                </p>
              </div>
              <button
                type="button"
                onClick={syncData}
                className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-300 p-1 bg-slate-900 border border-slate-800 rounded px-2"
              >
                <RotateCcw size={11} className="mr-0.5" />
                <span>Refresh Data</span>
              </button>
            </div>

            {customHppList.length === 0 ? (
              <div className="p-12 text-center text-slate-505 text-slate-500 italic text-xs">
                Belum ada data riwayat kalkulasi mandiri terekam di database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-slate-950/10">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[9.5px]">
                    <tr>
                      <th className="p-3 text-center">No</th>
                      <th className="p-3">Ref Code</th>
                      <th className="p-3">Tanggal Hitung</th>
                      <th className="p-3">Nama Produk</th>
                      <th className="p-3 text-right font-mono">Total Bahan</th>
                      <th className="p-3 text-right font-mono">Tenaga Kerja / Unit</th>
                      <th className="p-3 text-right font-mono">Overhead / Unit</th>
                      <th className="p-3 text-right font-mono">Yield Qty</th>
                      <th className="p-3 text-right text-emerald-400 bg-emerald-950/10 font-bold font-mono">Harga Pokok (HPP)</th>
                      <th className="p-3 text-right text-cyan-400 font-bold font-mono">Harga Jual</th>
                      <th className="p-3 text-right text-indigo-300 font-mono">Margin (Rp)</th>
                      <th className="p-3 text-right text-amber-400 font-mono">Margin (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 divide-slate-800/40">
                    {customHppList.map((h, idx) => (
                      <tr key={h.id} className="hover:bg-slate-850/20 text-slate-300 transition-colors">
                        <td className="p-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-3 font-mono text-amber-500 font-semibold">{h.id}</td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(h.calculatedAt).toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 font-bold text-white uppercase">{h.productName}</td>
                        <td className="p-3 text-right font-mono">Rp {(h.totalMaterialCost || 0).toLocaleString("id-ID")}</td>
                        <td className="p-3 text-right font-mono">Rp {(h.laborCostPerUnit || 0).toLocaleString("id-ID")}</td>
                        <td className="p-3 text-right font-mono">Rp {(h.overheadCostPerUnit || 0).toLocaleString("id-ID")}</td>
                        <td className="p-3 text-right font-semibold font-mono">{h.yieldUnits} Pack</td>
                        <td className="p-3 text-right font-black text-emerald-450 text-emerald-400 bg-emerald-950/10 font-mono text-[11px]">
                          Rp {(h.calculatedHpp || 0).toLocaleString("id-ID")}
                        </td>
                        <td className="p-3 text-right font-bold text-cyan-400 font-mono">
                          {h.sellingPrice ? `Rp ${h.sellingPrice.toLocaleString("id-ID")}` : "-"}
                        </td>
                        <td className={`p-3 text-right font-semibold font-mono ${h.marginAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {h.marginAmount !== undefined ? `${h.marginAmount >= 0 ? '+' : ''}Rp ${h.marginAmount.toLocaleString("id-ID")}` : "-"}
                        </td>
                        <td className="p-3 text-right font-semibold text-amber-400 font-mono">
                          {h.marginPercentage !== undefined ? `${h.marginPercentage.toLocaleString("id-ID")}%` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // TAB 2: ALOKASI BATCH SBU DARI STOK COLD STORAGE (ORIGINAL ANALYSIS)
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="bg-emerald-950/20 border border-emerald-900/30 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-widest text-emerald-400 font-mono">
                  ★ FORMULA STANDAR HPP & BIAYA UTAS (COLD STORAGE & IQF)
                </h3>
                <p className="text-[11px] text-slate-300 mt-1 max-w-2xl font-sans leading-relaxed">
                  Formulasi: <span className="font-bold text-emerald-300 font-mono text-xs">HPP = OPEX + Overhead Cost</span>, di mana OPEX mencakup Harga Beli Sayur dari PO Petani serta biaya kemasan plastik, dan Overhead Cost (Tenaga Kerja Harian, Listrik, Depresiasi, Air) dibagikan secara adil berdasarkan total hasil produksi di dalam Cold Storage.
                </p>
              </div>
              <div className="shrink-0 bg-slate-900/90 border border-slate-800 p-2.5 px-4 rounded-lg font-mono text-right">
                <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest">Kapasitas Produksi Aktif</span>
                <span className="text-lg font-black text-emerald-400">
                  {totalWeightSystem.toLocaleString("id-ID")} <span className="text-xs font-normal text-slate-400">Kg Jadi</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/50 p-4 border border-slate-800/60 rounded-xl">
              <div className="md:col-span-4 border-b border-slate-800/50 pb-1 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">Modul Setup Overhead Bersama</span>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Gaji Harian Pegawai</label>
                <input
                  type="number"
                  value={bulkOverheadWages}
                  onChange={(e) => setBulkOverheadWages(e.target.value)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-100 rounded text-xs font-mono text-right font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Listrik & Air Mesin</label>
                <input
                  type="number"
                  value={bulkOverheadElectricity}
                  onChange={(e) => setBulkOverheadElectricity(e.target.value)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-100 rounded text-xs font-mono text-right font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Kemasan Plastik Grosir</label>
                <input
                  type="number"
                  value={bulkPackagingCost}
                  onChange={(e) => setBulkPackagingCost(e.target.value)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-100 rounded text-xs font-mono text-right font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 uppercase mb-1">Dasar Alokasi</label>
                <select
                  value={allocationMethod}
                  onChange={(e: any) => setAllocationMethod(e.target.value)}
                  className="w-full p-1.5 bg-slate-900 border border-slate-800 text-slate-100 rounded text-xs font-mono"
                >
                  <option value="weight">Output Jadi (Kg)</option>
                  <option value="pack">Jumlah Unit Pack (Pcs)</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs bg-slate-950/20">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[9.5px]">
                  <tr>
                    <th className="p-3">Nama SBU Komoditas</th>
                    <th className="p-3 text-right">Harga Beli Sayur (PO)</th>
                    <th className="p-3 text-right">Alokasi Plastik Kemasan</th>
                    <th className="p-3 text-right">Tenaga Kerja & Overhead</th>
                    <th className="p-3 text-center">Stok Jadi (Cold Storage)</th>
                    <th className="p-3 text-center text-emerald-400 bg-emerald-950/15">HPP per Kg Jadi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {dynamicHppData.map((item) => (
                    <tr key={item.commodity} className="hover:bg-slate-850/10 transition-colors">
                      <td className="p-3 font-bold text-white uppercase">{item.commodity}</td>
                      <td className="p-3 text-right font-mono text-orange-400">Rp {item.rawCost.toLocaleString("id-ID")}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp {Math.round(item.allocatedPlastic).toLocaleString("id-ID")}</td>
                      <td className="p-3 text-right font-mono text-slate-400">Rp {Math.round(item.allocatedOverhead).toLocaleString("id-ID")}</td>
                      <td className="p-3 text-center font-bold">{item.yieldWeight.toLocaleString("id-ID")} Kg</td>
                      <td className="p-3 text-center font-black text-emerald-450 text-emerald-400 bg-emerald-950/10 font-mono text-[12px]">
                        {item.yieldWeight > 0 ? `Rp ${item.hppPerKg.toLocaleString("id-ID")}/Kg` : <span className="text-slate-500 italic text-[11px]">Tidak ada stok</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Saran Dan Rekomendasi Ahli HPP */}
            <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl space-y-2">
              <div className="flex items-center space-x-1 text-indigo-400 text-xs font-bold font-mono">
                <AlertCircle size={13} />
                <span>Saran Strategis Akuntansi Biaya SBU</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Biarkan upah kotor dicatat secara proporsional. overhead listrik & gas disusutkan bedasarkan unit output agar HPP per unit tidak terdampak fluktuasi panen. Pembelian kemasan dalam jumlah grosir wajib dicatat sebagai inventaris aset pergudangan terlebih dahulu, lalu dibagikan periodik agar laba bersih perusahaan tidak tergerus sepihak pada bulan awal pendaftaran.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* HPP INPUT CALCULATOR / CERTIFIER FOR BATCH SBU */}
            {session.role === "Kepala Produksi" || session.role === "Pimpinan" ? (
              <form onSubmit={handlePostHpp} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-emerald-450 text-emerald-400 font-mono text-xs uppercase tracking-wider pb-2 border-b border-slate-800">
                    <Calculator size={14} />
                    <span>Ratifikasi Harga HPP per Batch SBU</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Pilih Batch Laporan Selesai</label>
                      <select
                        value={selectedJobId}
                        onChange={(e) => handleJobSelection(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg outline-none text-xs"
                      >
                        <option value="">-- Pilih Batch Selesai --</option>
                        {completedJobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.id} - {j.commodity} ({j.yieldWeight} kg)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 uppercase font-medium mb-1">Output Hasil Jadi (Kg)</label>
                      <input
                        type="number"
                        disabled
                        value={productionYield}
                        className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-400 rounded-lg outline-none font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1 uppercase">A. Biaya Beli Sayur Petani (Rp)</label>
                      <input
                        type="number"
                        value={rawMaterialCost}
                        onChange={(e) => setRawMaterialCost(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 font-bold rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1">B. Gaji & Tenaga Kerja (Rp)</label>
                      <input
                        type="number"
                        value={laborCost}
                        onChange={(e) => setLaborCost(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 font-bold rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1">C. Kemasan Vacuum (Rp)</label>
                      <input
                        type="number"
                        value={packagingCost}
                        onChange={(e) => setPackagingCost(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 font-bold rounded"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 font-bold mb-1">D. Listrik & Utas IQF (Rp)</label>
                      <input
                        type="number"
                        value={operationalCost}
                        onChange={(e) => setOperationalCost(e.target.value)}
                        className="w-full p-2 bg-slate-950 border border-slate-800 text-slate-100 font-bold rounded"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={selectedJobId === ""}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-lg text-xs"
                >
                  Sahkan & Terapkan HPP Batch ini
                </button>
              </form>
            ) : (
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-6 rounded-2xl text-center flex flex-col justify-center text-xs text-slate-400">
                Gunakan login akun &quot;Admin Gudang&quot; atau &quot;Admin&quot; untuk mengabsahkan ratifikasi HPP periodik secara resmi.
              </div>
            )}

            {/* CHART */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl lg:col-span-5 flex flex-col justify-between">
              <span className="block text-xs font-bold text-slate-400 font-mono">TREND KOOP / PROSES COGS BATCH</span>
              
              {hppList.length === 0 ? (
                <p className="text-center italic text-slate-500 py-12 text-xs">Belum ada komparasi tren.</p>
              ) : (
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155" }} />
                      <Line type="monotone" dataKey="HPP" name="HPP per Kg" stroke="#34d399" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* HISTORICAL LOGS BATCH */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mt-6">
            <div className="p-4 border-b border-slate-800 bg-slate-955 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Buku Besar Perhitungan HPP Komulatif SBU</p>
            </div>

            {hppList.length === 0 ? (
              <p className="p-8 text-center text-xs text-slate-500">Belum ada kalkulasi HPP terekam.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs bg-slate-950/10">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="p-4">Kode HPP</th>
                      <th className="p-4">Tanggal Hitung</th>
                      <th className="p-4">Sayuran</th>
                      <th className="p-4">Yield Output</th>
                      <th className="p-4 text-right">Total Beli Sayur</th>
                      <th className="p-4 text-right">Tenaga Kerja + Op</th>
                      <th className="p-4 text-right text-emerald-400 bg-emerald-950/10">HPP per Kg Jadi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300 font-mono text-[11.5px]">
                    {hppList.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-850/30 transition-colors">
                        <td className="p-4 font-bold text-emerald-400">{h.id}</td>
                        <td className="p-4 text-slate-400">{new Date(h.calculatedAt).toLocaleString("id-ID")}</td>
                        <td className="p-4 text-white font-bold">{h.commodity}</td>
                        <td className="p-4 text-slate-300 font-bold">{h.productionYield} Kg</td>
                        <td className="p-4 text-right text-orange-400 font-semibold">Rp {h.rawMaterialCost.toLocaleString("id-ID")}</td>
                        <td className="p-4 text-right text-slate-400">Rp {(h.laborCost + h.operationalCost).toLocaleString("id-ID")}</td>
                        <td className="p-4 font-bold text-emerald-400 bg-emerald-950/10 text-right">
                          Rp {h.hppPerKg.toLocaleString("id-ID")}/Kg
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
