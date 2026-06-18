import React, { useState, useEffect } from "react";
import { Package, RotateCcw, Play, CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Plus, Lock, CheckSquare, Layers, Calendar, X, Truck } from "lucide-react";
import { ProductionJob, UserSession, CommodityType, PackagingType, SBUOrder, QCChecklist } from "../types";

interface ProductionViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

export default function ProductionView({
  session, setErrorNotification, setSuccessNotification, triggerRefreshStats
}: ProductionViewProps) {
  const [productions, setProductions] = useState<ProductionJob[]>([]);
  const [orders, setOrders] = useState<SBUOrder[]>([]);
  const [qcChecklists, setQcChecklists] = useState<QCChecklist[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [queueSortDir, setQueueSortDir] = useState<'asc' | 'desc'>('asc');
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Scheduling states
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedQcChecklistId, setSelectedQcChecklistId] = useState("");
  const [commodity, setCommodity] = useState<CommodityType>("Wortel");
  const [targetWeight, setTargetWeight] = useState("500");
  const [allocatedRaw, setAllocatedRaw] = useState("770");
  const [schedDate, setSchedDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("16:00");
  const [operatorNames, setOperatorNames] = useState("Yusuf, Dani, Eko");

  // Terminal active state
  const [selectedActiveJob, setSelectedActiveJob] = useState<ProductionJob | null>(null);

  // Packaging input states
  const [pType, setPType] = useState<PackagingType>("1 Kg");
  const [pWeight, setPWeight] = useState("1");
  const [pCount, setPCount] = useState("500");
  const [isVacuumChecked, setIsVacuumChecked] = useState(false);
  const [freezerLocation, setFreezerLocation] = useState("Freezer-Zone-Alpha");

  // Dynamic list of yield outputs to support multi-vegetable/size output logging
  const [yieldItems, setYieldItems] = useState<{
    commodity: string;
    packageType: string;
    unitWeight: string;
    completedUnits: string;
  }[]>([]);

  // Selected Stock Filter state
  const [stockFilter, setStockFilter] = useState("Semua");

  const handleAddYieldItem = () => {
    if (!selectedActiveJob) return;
    setYieldItems([
      ...yieldItems,
      {
        commodity: selectedActiveJob.commodity,
        packageType: "1 Kg",
        unitWeight: "1.0",
        completedUnits: "100"
      }
    ]);
  };

  const handleRemoveYieldItem = (index: number) => {
    if (yieldItems.length <= 1) {
      setErrorNotification("Minimal harus tercatat 1 baris hasil produksi.");
      return;
    }
    setYieldItems(yieldItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateYieldItem = (index: number, field: string, value: string) => {
    const updated = [...yieldItems];
    updated[index] = { ...updated[index], [field]: value };
    setYieldItems(updated);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const pResponse = await fetch("/api/productions");
      const pData = await pResponse.json();
      setProductions(pData);

      const oResponse = await fetch("/api/orders");
      const oData = await oResponse.json();
      setOrders(oData || []);

      const qResponse = await fetch("/api/qc-checklists");
      const qData = await qResponse.json();
      setQcChecklists(qData || []);

      const dResponse = await fetch("/api/deliveries");
      const dData = await dResponse.json();
      setDeliveries(dData || []);

      const pcResponse = await fetch("/api/procurements");
      const pcData = await pcResponse.json();
      setProcurements(pcData || []);
    } catch (e) {
      setErrorNotification("Gagal meload modul produksi & integrasi QC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter QC Passed Raw Material entries (isReject === false and passedWeight > 0)
  const eligibleQcPassedItems = qcChecklists.filter((qc) => !qc.isReject && qc.passedWeight > 0);

  // When a QC Checklist item is picked, automatically pre-set the vegetable and raw weight limit
  const handleQcPickAndAutofill = (qcId: string) => {
    setSelectedQcChecklistId(qcId);
    const foundQc = eligibleQcPassedItems.find((q) => q.id === qcId);
    if (foundQc) {
      setCommodity(foundQc.commodity);
      setAllocatedRaw(String(foundQc.passedWeight));
      
      // Attempt to estimate target frozen weight based on shrinkage factor
      const factor = foundQc.commodity === "Wortel" ? 0.65 : foundQc.commodity === "Buncis" ? 0.93 : foundQc.commodity === "Jagung Manis" ? 0.90 : 0.82;
      setTargetWeight(String(Math.floor(foundQc.passedWeight * factor)));
      setSuccessNotification(`Bahan baku Lulus QC terverifikasi: ${foundQc.passedWeight} Kg ${foundQc.commodity}`);
    }
  };

  // Sync to sales order
  const handleOrderChangeInSchedule = (id: string) => {
    setSelectedOrderId(id);
    const foundOrder = orders.find((o) => o.id === id);
    if (foundOrder) {
      setCommodity(foundOrder.commodity);
      setTargetWeight(String(foundOrder.totalWeight));
      const factor = foundOrder.commodity === "Wortel" ? 1.54 : foundOrder.commodity === "Buncis" ? 1.08 : foundOrder.commodity === "Jagung Manis" ? 1.11 : 1.22;
      setAllocatedRaw(String(Math.ceil(foundOrder.totalWeight * factor)));
    }
  };

  // Helper to compile details of selected QC Checklist
  const getSelectedQcDetails = () => {
    if (!selectedQcChecklistId) return [];
    const foundQc = qcChecklists.find(q => q.id === selectedQcChecklistId);
    if (!foundQc) return [];

    const foundDelivery = deliveries.find(d => d.id === foundQc.deliveryId);
    const foundProcurement = foundDelivery ? procurements.find(p => p.id === foundDelivery.procurementId) : null;

    if (foundProcurement && foundProcurement.items && foundProcurement.items.length > 0) {
      return foundProcurement.items.map((it: any) => {
        const itemWeight = parseFloat(it.totalWeight || it.neededWeight || 0);
        const name = it.commodity || "Sayur";
        const factor = name === "Wortel" ? 0.65 : name === "Buncis" ? 0.93 : name === "Jagung Manis" ? 0.90 : 0.82;
        return {
          commodity: name,
          passedWeight: itemWeight,
          estimatedYield: Math.floor(itemWeight * factor)
        };
      });
    }

    // Default fallback
    const name = foundQc.commodity;
    const factor = name === "Wortel" ? 0.65 : name === "Buncis" ? 0.93 : name === "Jagung Manis" ? 0.90 : 0.82;
    return [{
      commodity: name,
      passedWeight: foundQc.passedWeight,
      estimatedYield: Math.floor(foundQc.passedWeight * factor)
    }];
  };

  const getDaysRemaining = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Submit and schedule job
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedDate) {
      setErrorNotification("Silahkan pilih tanggal jadwal produksi.");
      return;
    }

    // MANDATORY REQUIREMENT: MUST SELECT PASSED QC MATERIALS (Fitur 7)
    if (!selectedQcChecklistId) {
      setErrorNotification("Batal membuat jadwal! Produksi HANYA dapat dischedule-kan dengan memilih bahan baku berstatus LOLOS QC terlebih dahulu.");
      return;
    }

    try {
      const response = await fetch("/api/productions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId || undefined,
          qcChecklistId: selectedQcChecklistId, // Save the security reference
          commodity,
          targetWeight: parseFloat(targetWeight),
          allocatedRawMaterial: parseFloat(allocatedRaw),
          date: schedDate,
          startTime,
          endTime,
          pic: session.fullName,
          operatorNames: operatorNames.split(",").map(n => n.trim()),
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal mengesahkan jadwal");

      setSuccessNotification(`Selamat! Jadwal produksi berhasil disatukan bersama rekap QC-Passed ${selectedQcChecklistId}.`);
      setShowAddForm(false);
      setSelectedOrderId("");
      setSelectedQcChecklistId("");
      setSchedDate("");
      fetchData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Move production steps (Fitur 8 / Custom checklists)
  const handleAdvanceStep = async (job: ProductionJob) => {
    const nextIdx = job.currentStepIndex + 1;
    let nextStatus = job.status;

    if (nextIdx === 1) {
      nextStatus = "Pencucian/Pemotongan";
    } else if (nextIdx >= 3 && nextIdx < job.steps.length) {
      nextStatus = "Blanching/Perendaman";
    } else if (nextIdx === job.steps.length) {
      nextStatus = "Penirisan/Packaging";
    }

    try {
      const response = await fetch(`/api/productions/${job.id}/advance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStepIndex: nextIdx,
          status: nextStatus,
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal memajukan langkah kerja");

      const updated = await response.json();
      if (selectedActiveJob && selectedActiveJob.id === job.id) {
        setSelectedActiveJob(updated);
        // If we are at the final packaging step, automatically process customer order specifications (Fitur 9)
        if (nextIdx === job.steps.length) {
          applyPackagingAutoSynchronization(updated);
        }
      }
      setSuccessNotification(`Langkah produksi ${job.id} melaju ke tahap ${nextIdx + 1}`);
      fetchData();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Open Terminal and automatically load customer packing standard if there is an active order
  const handleOpenTerminalAndSync = (job: ProductionJob) => {
    setSelectedActiveJob(job);
    applyPackagingAutoSynchronization(job);
  };

  // Automates packaging selections according to connected client orders (Fitur 9)
  const applyPackagingAutoSynchronization = (job: ProductionJob) => {
    let initialList = [];
    if (job.orderId) {
      const matchedOrder = orders.find((o) => o.id === job.orderId);
      if (matchedOrder) {
        // Set dynamic packaging variations from the buyer order
        const pkgOption = matchedOrder.packagingType || "1 Kg";
        setPType(pkgOption as PackagingType);
        
        let numericWeight = 1.0;
        if (pkgOption === "2.5 Kg") {
          numericWeight = 2.5;
        } else if (pkgOption.toLowerCase().includes("custom")) {
          // parse coordinate weight e.g. "Custom - 10 Kg"
          const parsed = parseFloat(pkgOption.replace(/[^0-9.]/g, ""));
          numericWeight = isNaN(parsed) ? 5.0 : parsed;
        }

        setPWeight(String(numericWeight));
        
        // Calculate needed pack count automatically (targetWeight / weightPerPack)
        const counts = Math.ceil(job.targetWeight / numericWeight);
        setPCount(String(counts));

        initialList = [{
          commodity: job.commodity,
          packageType: pkgOption,
          unitWeight: String(numericWeight),
          completedUnits: String(counts)
        }];
        setSuccessNotification(`Sistem Otomatis menyinkronkan spesifikasi kemasan ke SBU Order: ${pkgOption} (${counts} Packs)`);
      }
    }
    
    if (initialList.length === 0) {
      // Default fallback
      setPType("1 Kg");
      setPWeight("1");
      setPCount(String(job.targetWeight));
      initialList = [{
        commodity: job.commodity,
        packageType: "1 Kg",
        unitWeight: "1",
        completedUnits: String(job.targetWeight)
      }];
    }

    setYieldItems(initialList);
  };

  // Final Seal submit
  const handleCompletePackagingAndSeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActiveJob) return;

    if (!isVacuumChecked) {
      setErrorNotification("Pemeriksaan segel kemasan vakum wajib disahkan oleh Kepala Lapangan!");
      return;
    }

    try {
      const parsedItems = yieldItems.map((item) => {
        const uUnits = parseInt(item.completedUnits) || 0;
        const uWeight = parseFloat(item.unitWeight) || 0;
        return {
          commodity: item.commodity,
          packageType: item.packageType,
          unitWeight: uWeight,
          completedUnits: uUnits,
          totalWeight: uUnits * uWeight
        };
      });

      const totalWeightSum = parsedItems.reduce((acc, curr) => acc + curr.totalWeight, 0);
      const totalUnitsSum = parsedItems.reduce((acc, curr) => acc + curr.completedUnits, 0);

      const response = await fetch(`/api/productions/${selectedActiveJob.id}/packaging`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType: parsedItems[0]?.packageType || "1 Kg",
          unitWeight: parsedItems[0]?.unitWeight || 1.0,
          completedUnits: totalUnitsSum,
          yieldItems: parsedItems,
          isVacuumChecked: true,
          vacuumCheckedBy: session.fullName,
          isStoredInFreezer: true,
          freezerName: freezerLocation,
          operator: { username: session.username, role: session.role }
        }),
      });

      if (!response.ok) throw new Error("Gagal mengunci hasil kemasan.");

      setSuccessNotification(`Sukses! ${parsedItems.length} hasil kemasan telah dicatat untuk ${selectedActiveJob.id} (Total: ${totalWeightSum} Kg, ${totalUnitsSum} Packs) dan dipindahkan ke Cold Locker.`);
      setSelectedActiveJob(null);
      setIsVacuumChecked(false);
      fetchData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Today and 3 days schedulers
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomStr = tomorrow.toISOString().split("T")[0];
  const day2 = new Date(); day2.setDate(day2.getDate() + 2);
  const day2Str = day2.toISOString().split("T")[0];
  const day3 = new Date(); day3.setDate(day3.getDate() + 3);
  const day3Str = day3.toISOString().split("T")[0];

  const jobsToday = productions.filter(p => p.date === todayStr);
  const jobs3DaysAhead = productions.filter(p => p.date === tomStr || p.date === day2Str || p.date === day3Str);

  // Deduction weight helper for dispatched shipments
  const getDispatchedWeight = (commodityName: string) => {
    let total = 0;
    orders.filter(o => o.status === "Dikirim").forEach(o => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((it: any) => {
          const c = it.commodity || it.nama_komoditas || o.commodity;
          if (c === commodityName) {
            total += parseFloat(it.totalWeight) || parseFloat(it.total_berat) || 0;
          }
        });
      } else {
        if (o.commodity === commodityName) {
          total += parseFloat(o.totalWeight) || 0;
        }
      }
    });
    return total;
  };

  const baseStockWortel = productions.filter(p => p.commodity === "Wortel" && p.status === "Selesai").reduce((acc, curr) => acc + (curr.yieldWeight || 0), 0);
  const baseStockBuncis = productions.filter(p => p.commodity === "Buncis" && p.status === "Selesai").reduce((acc, curr) => acc + (curr.yieldWeight || 0), 0);
  const baseStockJagung = productions.filter(p => p.commodity === "Jagung Manis" && p.status === "Selesai").reduce((acc, curr) => acc + (curr.yieldWeight || 0), 0);
  const baseStockMix = productions.filter(p => p.commodity === "Sayuran Mix" && p.status === "Selesai").reduce((acc, curr) => acc + (curr.yieldWeight || 0), 0);

  const stockWortel = Math.max(0, baseStockWortel - getDispatchedWeight("Wortel"));
  const stockBuncis = Math.max(0, baseStockBuncis - getDispatchedWeight("Buncis"));
  const stockJagung = Math.max(0, baseStockJagung - getDispatchedWeight("Jagung Manis"));
  const stockMix = Math.max(0, baseStockMix - getDispatchedWeight("Sayuran Mix"));

  // Dynamic storage inventory details by type and size
  const getColdStorageInventory = () => {
    const inventoryMap: Record<string, { commodity: string; packageType: string; unitWeight: number; totalPacks: number; totalWeight: number }> = {};
    
    productions.filter((p) => p.status === "Selesai").forEach((p) => {
      if (p.yieldItems && p.yieldItems.length > 0) {
        p.yieldItems.forEach((item: any) => {
          const key = `${item.commodity}_${item.packageType}_${item.unitWeight}`;
          if (!inventoryMap[key]) {
            inventoryMap[key] = {
              commodity: item.commodity,
              packageType: item.packageType,
              unitWeight: parseFloat(item.unitWeight) || 0,
              totalPacks: 0,
              totalWeight: 0,
            };
          }
          inventoryMap[key].totalPacks += parseInt(item.completedUnits) || 0;
          inventoryMap[key].totalWeight += parseFloat(item.totalWeight) || 0;
        });
      } else if (p.packaging) {
        // Fallback for legacy items
        const key = `${p.commodity}_${p.packaging.packageType}_${p.packaging.unitWeight}`;
        if (!inventoryMap[key]) {
          inventoryMap[key] = {
            commodity: p.commodity,
            packageType: p.packaging.packageType,
            unitWeight: parseFloat(p.packaging.unitWeight) || 0,
            totalPacks: 0,
            totalWeight: 0,
          };
        }
        inventoryMap[key].totalPacks += parseInt(p.packaging.completedUnits) || 0;
        inventoryMap[key].totalWeight += parseFloat(p.yieldWeight) || 0;
      }
    });

    // Subtract dispatched SBU shipments
    orders.filter(o => o.status === "Dikirim").forEach(o => {
      const itemsToDeduct = o.items && o.items.length > 0 ? o.items : [{
        commodity: o.commodity,
        packageWeight: parseFloat(o.packageWeight) || 1,
        quantity: parseInt(o.quantity) || 0,
        totalWeight: parseFloat(o.totalWeight) || 0
      }];

      itemsToDeduct.forEach((it: any) => {
        const dComm = it.commodity || it.nama_komoditas || o.commodity;
        const dWeight = parseFloat(it.packageWeight) || parseFloat(it.berat_kemasan) || parseFloat(o.packageWeight) || 1;
        const dQty = parseInt(it.quantity) || parseInt(it.qty_pack) || parseInt(o.quantity) || 0;
        const dTotalWeight = parseFloat(it.totalWeight) || parseFloat(it.total_berat) || parseFloat(o.totalWeight) || 0;

        // Find match by commodity & weight first
        let matched = false;
        for (const key of Object.keys(inventoryMap)) {
          const invItem = inventoryMap[key];
          if (invItem.commodity === dComm && Math.abs(invItem.unitWeight - dWeight) < 0.1) {
            invItem.totalPacks = Math.max(0, invItem.totalPacks - dQty);
            invItem.totalWeight = Math.max(0, invItem.totalWeight - dTotalWeight);
            matched = true;
            break;
          }
        }

        // If not matched exactly by weight, default and deduct by commodity alone
        if (!matched) {
          for (const key of Object.keys(inventoryMap)) {
            const invItem = inventoryMap[key];
            if (invItem.commodity === dComm) {
              invItem.totalPacks = Math.max(0, invItem.totalPacks - dQty);
              invItem.totalWeight = Math.max(0, invItem.totalWeight - dTotalWeight);
              break;
            }
          }
        }
      });
    });

    return Object.values(inventoryMap);
  };

  const coldStorageInventory = getColdStorageInventory();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200 space-y-3 sm:space-y-0 text-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Package className="text-emerald-600" size={20} />
            <span>Manufaktur & Alur IQF Freezing</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Alur steril pemrosesan sayuran segar pilihan beralih kemas menjadi komoditas dingin bernilai tinggi.
          </p>
        </div>

        {session.role === "Kepala Produksi" && (
          <button
            onClick={() => {
              if (eligibleQcPassedItems.length === 0) {
                setErrorNotification("Maaf, tidak ada bahan baku berstatus Lolos QC hari ini. Lakukan audit QC pada barang masuk hulu!");
              }
              setShowAddForm(!showAddForm);
            }}
            className="flex items-center justify-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            <span>Tetapkan Jadwal Produksi Baru</span>
          </button>
        )}
      </div>

      {/* PANEL STATUS GUDANG STOK HASIL JADI COLD STORAGE */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <div className="bg-gradient-to-br from-orange-50/70 to-white border border-orange-200 p-4 rounded-2xl shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-[10px] uppercase font-bold text-orange-600 tracking-wider">Stok Wortel Beku</p>
          <p className="text-xl font-bold text-slate-800 mt-1.5 font-mono">
            {stockWortel.toLocaleString("id-ID")} <span className="text-xs font-sans text-slate-500 font-normal">Kg</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50/70 to-white border border-emerald-200 p-4 rounded-2xl shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Stok Buncis Beku</p>
          <p className="text-xl font-bold text-slate-800 mt-1.5 font-mono">
            {stockBuncis.toLocaleString("id-ID")} <span className="text-xs font-sans text-slate-500 font-normal">Kg</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50/70 to-white border border-amber-200 p-4 rounded-2xl shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Stok Jagung Beku</p>
          <p className="text-xl font-bold text-slate-800 mt-1.5 font-mono">
            {stockJagung.toLocaleString("id-ID")} <span className="text-xs font-sans text-slate-500 font-normal">Kg</span>
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50/70 to-white border border-blue-200 p-4 rounded-2xl shadow-xs transition-shadow hover:shadow-sm">
          <p className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">Stok Sayuran Mix Beku</p>
          <p className="text-xl font-bold text-slate-800 mt-1.5 font-mono">
            {stockMix.toLocaleString("id-ID")} <span className="text-xs font-sans text-slate-500 font-normal">Kg</span>
          </p>
        </div>
      </div>

      {/* PANEL ANTREAN BAHAN BAKU & ORDER SBU UNTUK PRODUKSI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
              <Calendar size={16} className="text-amber-500" />
              <span>Daftar Antrean Order SBU &amp; Prioritas Produksi</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-sans font-medium">
              Kelola prioritas pengerjaan IQF Freezing berdasarkan tenggat jadwal kirim terdekat untuk meminimalisasi keterlambatan SBU.
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-2.5 sm:mt-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Urutkan:</span>
            <button
              type="button"
              onClick={() => setQueueSortDir(queueSortDir === "asc" ? "desc" : "asc")}
              className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 border border-slate-205 hover:bg-slate-100 font-bold rounded-lg text-[10px] text-slate-705 transition cursor-pointer"
            >
              <span>{queueSortDir === "asc" ? "📅 Kirim Terdekat Pertama" : "📅 Kirim Terlama Pertama"}</span>
            </button>
          </div>
        </div>

        {(() => {
          const activeSbuOrders = orders.filter(o => 
            o.status === "Menunggu Produksi" || 
            o.status === "Siap Produksi" ||
            o.status === "Pesanan Diterima" || 
            o.status === "Diproses"
          );

          const sortedActiveSbuOrders = [...activeSbuOrders].sort((a, b) => {
            const timeA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
            const timeB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
            return queueSortDir === "asc" ? timeA - timeB : timeB - timeA;
          });

          if (sortedActiveSbuOrders.length === 0) {
            return (
              <p className="text-center font-sans text-xs italic text-slate-400 py-6">
                Alhamdulillah, seluruh pesanan SBU telah selesai diproduksi dan dikirim.
              </p>
            );
          }

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-205 font-extrabold text-[9px] uppercase tracking-wider text-slate-500">
                    <th className="p-3">Ref. Order ID</th>
                    <th className="p-3">SBU Tujuan</th>
                    <th className="p-3">Komoditas / Sayur</th>
                    <th className="p-3 text-right">Target Berat SBU (Kg)</th>
                    <th className="p-3 text-center">Jadwal Kirim</th>
                    <th className="p-3 text-center">Status Produksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {sortedActiveSbuOrders.map((o) => {
                    const daysLeft = getDaysRemaining(o.deliveryDate);
                    
                    let urgencyBadgeClass = "bg-slate-50 text-slate-600 border border-slate-200";
                    let remainingText = daysLeft !== null ? `${daysLeft} Hari Lagi` : "Mendesak";
                    
                    if (daysLeft === null) {
                      urgencyBadgeClass = "bg-rose-50 text-rose-700 border border-rose-250 font-bold";
                    } else if (daysLeft < 0) {
                      remainingText = `Terlambat ${Math.abs(daysLeft)} Hari`;
                      urgencyBadgeClass = "bg-rose-100 text-rose-800 border border-rose-200 font-extrabold";
                    } else if (daysLeft <= 1) {
                      urgencyBadgeClass = "bg-orange-50 text-orange-700 border border-orange-200 animate-pulse font-bold";
                    } else if (daysLeft <= 3) {
                      urgencyBadgeClass = "bg-amber-50 text-amber-700 border border-amber-200 font-bold";
                    } else {
                      urgencyBadgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-250";
                    }

                    const isWortel = o.commodity === "Wortel";
                    const isBuncis = o.commodity === "Buncis";
                    const isJagung = o.commodity === "Jagung Manis";

                    return (
                      <tr key={o.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
                            {o.id}
                          </span>
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-extrabold text-slate-800 leading-tight">{o.customer}</p>
                            <p className="text-[10px] text-slate-400 font-sans mt-0.5">SBU Food Retail Agency</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${
                              isWortel ? "bg-orange-500" : isBuncis ? "bg-emerald-500" : isJagung ? "bg-amber-400" : "bg-blue-500"
                            }`} />
                            <span className="font-semibold text-slate-700">{o.commodity}</span>
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-900 font-bold">{o.totalWeight.toLocaleString("id-ID")} Kg</td>
                        <td className="p-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-[11px] text-slate-800 font-bold">{o.deliveryDate || "-"}</span>
                            <span className={`px-2 py-0.5 text-[9px] rounded-full mt-1 ${urgencyBadgeClass}`}>
                              {remainingText}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] border border-amber-200">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* DETAIL INVENTARIS STOK COLD STORAGE (REAL-TIME) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block animate-pulse"></span>
              <span>Rincian Stok Hasil Jadi di Cold Storage</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 font-sans font-medium">
              Menampilkan rincian partisi stok sayuran beku berdasarkan tipe ukuran kemasan dan jumlah pack secara aktual.
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-2.5 sm:mt-0">
            <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Filter:</span>
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
              {["Semua", "Wortel", "Buncis", "Jagung Manis", "Sayuran Mix"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStockFilter(f)}
                  className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                    stockFilter === f
                      ? "bg-white text-slate-800 shadow-2xs font-extrabold"
                      : "text-slate-500 hover:text-slate-705 hover:text-slate-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inventory list/table */}
        {coldStorageInventory.length === 0 ? (
          <p className="text-center font-sans text-xs italic text-slate-400 py-6">Belum ada barang selesai dimatangkan di Cold Storage.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-extrabold text-[9px] uppercase tracking-wider text-slate-500">
                  <th className="p-3">Komoditas / Sayur</th>
                  <th className="p-3">Tipe/Ukuran Kemas</th>
                  <th className="p-3 text-right">Berat / Pack</th>
                  <th className="p-3 text-right">Total Pack (Pcs)</th>
                  <th className="p-3 text-right">Total Berat Jadi (Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtered = coldStorageInventory.filter(item => {
                    if (stockFilter === "Semua") return true;
                    return item.commodity === stockFilter;
                  });

                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400 italic font-sans font-medium">
                          Tidak ada stok beku untuk komoditas pilihan.
                        </td>
                      </tr>
                    );
                  }

                  // Grand calculations
                  const totalPacksSum = filtered.reduce((acc, curr) => acc + curr.totalPacks, 0);
                  const totalWeightSum = filtered.reduce((acc, curr) => acc + curr.totalWeight, 0);

                  return (
                    <>
                      {filtered.map((item, index) => {
                        const isWortel = item.commodity === "Wortel";
                        const isBuncis = item.commodity === "Buncis";
                        const isJagung = item.commodity === "Jagung Manis";

                        return (
                          <tr key={index} className="hover:bg-slate-50/45 font-medium transition-colors">
                            <td className="p-3 flex items-center space-x-2">
                              <span className={`w-2 h-2 rounded-full ${
                                isWortel ? "bg-orange-500" : isBuncis ? "bg-emerald-500" : isJagung ? "bg-amber-400" : "bg-blue-500"
                              }`} />
                              <span className="font-semibold text-slate-800">{item.commodity}</span>
                            </td>
                            <td className="p-3 text-slate-600">{item.packageType}</td>
                            <td className="p-3 text-right font-mono text-slate-500">{item.unitWeight} Kg</td>
                            <td className="p-3 text-right font-mono text-slate-800 font-bold">{item.totalPacks.toLocaleString("id-ID")} Box/Pack</td>
                            <td className="p-3 text-right font-mono text-emerald-700 font-extrabold">{item.totalWeight.toLocaleString("id-ID")} Kg</td>
                          </tr>
                        );
                      })}
                      {/* Grand Total Row */}
                      <tr className="bg-slate-50/60 font-black border-t-2 border-slate-200">
                        <td colSpan={2} className="p-3 text-slate-700">TOTAL KELOMPOK FILTER</td>
                        <td className="p-3 text-right">-</td>
                        <td className="p-3 text-right font-mono text-slate-900 text-xs">{totalPacksSum.toLocaleString("id-ID")} Pack</td>
                        <td className="p-3 text-right font-mono text-emerald-800 text-xs bg-emerald-50/40 rounded-br-lg">{totalWeightSum.toLocaleString("id-ID")} Kg</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HISTORI OUTFLOW BARANG KELUAR COLD STORAGE */}
      <div id="histori-barang-keluar" className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm animate-fade-in text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 text-slate-800">
              <Truck size={16} className="text-rose-600 animate-pulse" />
              <span>Histori Pengiriman SBU (Barang Keluar)</span>
            </h4>
            <p className="text-[10px] text-slate-400 mt-1 font-sans">
              Daftar rilis muatan cold storage yang telah didispatch via ekspedisi armada berpendingin ke SBU Bandung.
            </p>
          </div>
          <div className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Automated Outflow Sync
          </div>
        </div>

        {orders.filter(o => o.status === "Dikirim").length === 0 ? (
          <p className="text-center font-sans text-xs italic text-slate-400 py-6">Belum ada barang keluar yang didispatch saat ini huku-hilir.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white text-slate-705">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-extrabold text-[9px] uppercase tracking-wider text-slate-500">
                  <th className="p-3">Tanggal Dispatched</th>
                  <th className="p-3">ID Order / Ref</th>
                  <th className="p-3">Destinasi Pasar / SBU</th>
                  <th className="p-3">Rincian Muatan Produk</th>
                  <th className="p-3">Kurir & No. Polisi</th>
                  <th className="p-3 text-right">Berat Keluar (Kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.filter(o => o.status === "Dikirim").map((o, index) => {
                  const formattedDate = o.dispatchedAt 
                    ? new Date(o.dispatchedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) 
                    : o.deliveryDate;

                  return (
                    <tr key={index} className="hover:bg-slate-50/45 transition-colors">
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{formattedDate}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap">
                          {o.id}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 font-bold">
                        {o.customer || "SBU Bandung - Logistics & Food Retail"}
                      </td>
                      <td className="p-3">
                        {o.items && o.items.length > 0 ? (
                          <div className="space-y-1">
                            {o.items.map((it, idx) => (
                              <div key={idx} className="text-[10px] text-slate-700 leading-tight">
                                • <span className="text-slate-900 font-bold">{it.commodity}</span>: {it.quantity} Pack ({it.packaging})
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="font-bold text-slate-800">{o.commodity || "-"} ({o.quantity} Pack - {o.packaging})</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 text-[11px]">{o.driverName || "Agus Salim"}</p>
                          <p className="font-mono text-[9px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 font-bold tracking-wider inline-block">
                            {o.vehicleNumber || "D 1902 FZ"}
                          </p>
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono text-rose-700 font-extrabold bg-rose-50/10">
                        {o.totalWeight.toLocaleString("id-ID")} Kg
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleCreateSchedule} className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center space-x-1">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Lembar Form Jadwal Produksi</span>
            </h3>
            <span className="text-[10px] bg-red-50 text-red-700 uppercase font-mono px-2 py-0.5 rounded font-bold">Verifikasi QC Terpadu</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
            
            {/* MANDATORY QC SELECTION (Fitur 7) */}
            <div className="md:col-span-2 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
              <label className="block text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Pilih Bahan Baku Lolos QC (Fardhu/Wajib)</span>
              </label>
              <select
                required
                value={selectedQcChecklistId}
                onChange={(e) => handleQcPickAndAutofill(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none font-bold text-xs"
              >
                <option value="">-- [PILIH BAHAN BAKU PASSED QC] --</option>
                {eligibleQcPassedItems.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.id} - {q.commodity} ({q.passedWeight} kg Lolos Cek)
                  </option>
                ))}
              </select>
              {eligibleQcPassedItems.length === 0 ? (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-[10.5px] text-red-700 font-semibold space-y-1">
                  <p className="font-bold">⚠️ Belum Ada Bahan Baku Lolos QC!</p>
                  <p className="font-normal text-slate-600 leading-normal">
                    Silakan ke menu <span className="bg-red-100 px-1 rounded font-mono">Penerimaan Bahan</span> &amp; <span className="bg-red-100 px-1 rounded font-mono">Quality Control</span> terlebih dahulu untuk meligitimasi barang datang luar agar berstatus LULOS QC. Setelah itu, pilihan komoditas & berat akan otomatis terbuka di sini.
                  </p>
                </div>
              ) : selectedQcChecklistId ? (
                <div className="bg-white p-2.5 border border-emerald-200 rounded-lg space-y-1.5 shadow-3xs mt-2 text-[11px]">
                  <p className="font-bold text-emerald-800 uppercase text-[9px] tracking-wide">Rincian Komoditas di QC Terpilih:</p>
                  <div className="divide-y divide-slate-100">
                    {getSelectedQcDetails().map((it: any, index: number) => (
                      <div key={index} className="flex justify-between py-1 text-slate-800 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                          {it.commodity}
                        </span>
                        <span className="font-mono text-slate-900 font-bold">
                          Lolos: {it.passedWeight}kg ➜ Target Jadi: <span className="text-emerald-700">{it.estimatedYield}kg</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-slate-500 leading-normal">
                  * Sesuai regulasi mutu Agro Produksi, dilarang memproses bahan bakar sayur tanpa tanda stempel QC Lulus.
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Korelasikan Ke SBU Order (Terurut Jadwal Kirim)</label>
              <select
                value={selectedOrderId}
                onChange={(e) => handleOrderChangeInSchedule(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none font-semibold text-xs"
              >
                <option value="">-- Produksi Stok Bebas (Gudang) --</option>
                {[...orders]
                  .filter(o => o.status === "Menunggu Produksi" || o.status === "Siap Produksi" || o.status === "Pesanan Diterima" || o.status === "Diproses")
                  .sort((a, b) => {
                    const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : 0;
                    const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : 0;
                    return dateA - dateB; // closest first
                  })
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.commodity} ({o.totalWeight} kg) | Kirim: {o.deliveryDate || "-"}
                    </option>
                  ))
                }
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Komoditas Terpilih</label>
              <input
                type="text"
                disabled
                value={commodity}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg font-bold text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Alokasi Bahan Baku Lolos QC (Kg)</label>
              <input
                type="number"
                disabled
                value={allocatedRaw}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 text-slate-800 font-bold rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Target Beku Jadi (Kg)</label>
              <input
                type="number"
                required
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Hari Kerja Produksi</label>
              <input
                type="date"
                required
                value={schedDate}
                onChange={(e) => setSchedDate(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Pukul Operasional</label>
              <div className="flex space-x-1.5">
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-1/2 p-2 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-1/2 p-2 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Nama Tim Regu Lapangan (Pisahkan Koma)</label>
              <input
                type="text"
                value={operatorNames}
                onChange={(e) => setOperatorNames(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg cursor-pointer font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              className="text-xs px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-lg cursor-pointer shadow-xs"
            >
              Ulas & Sahkan Penugasan
            </button>
          </div>
        </form>
      )}

      {/* THREE DAYS SCHEDULE BREAKDOWN PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
        
        {/* SCHEDULE TODAY */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl max-h-[380px] overflow-y-auto shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest pb-2 border-b border-slate-100 mb-4 flex justify-between items-center">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Lini Manufaktur Berjalan Hari Ini</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500 font-semibold">{todayStr}</span>
          </h3>

          <div className="space-y-3">
            {jobsToday.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center italic font-mono">Belum ada agenda produksi dijadwalkan hari ini.</p>
            ) : (
              jobsToday.map((j) => (
                <div key={j.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-xs">
                  <div className="flex justify-between items-start text-xs border-b border-slate-200 pb-2">
                    <div>
                      <p className="font-mono font-bold text-emerald-700">{j.id}</p>
                      <p className="text-slate-800 font-bold text-sm mt-0.5">{j.commodity} ({j.targetWeight} Kg)</p>
                      {j.qcChecklistId && (
                        <p className="text-[9px] font-bold text-emerald-600 mt-0.5 bg-emerald-100 px-1.5 py-0.5 rounded inline-block">
                          Ref QC-Lolos: {j.qcChecklistId}
                        </p>
                      )}
                    </div>
                    <span className="bg-white text-slate-650 px-2 py-0.5 rounded border border-slate-250 font-mono text-[10px] font-semibold">
                      {j.startTime} - {j.endTime}
                    </span>
                  </div>

                  <div className="text-[10px] leading-normal text-slate-500 flex justify-between font-mono">
                    <span>Regu: {j.operatorNames.join(", ")}</span>
                    <span className="font-bold text-emerald-700 uppercase">{j.status}</span>
                  </div>

                  {session.role === "Admin Gudang" && j.status !== "Selesai" && (
                    <button
                      onClick={() => handleOpenTerminalAndSync(j)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all cursor-pointer text-center flex items-center justify-center space-x-1"
                    >
                      <Play size={12} />
                      <span>Masuki Terminal & Selesaikan IQF</span>
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3 DAYS PLANS */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl max-h-[380px] overflow-y-auto shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest pb-2 border-b border-slate-100 mb-4">
            Rencana Perputaran Manufaktur Besok / Lusa
          </h3>

          <div className="space-y-3">
            {jobs3DaysAhead.length === 0 ? (
              <p className="text-xs text-slate-400 py-12 text-center italic font-mono font-medium">Bebas antrean kerja untuk 3 hari ke depan.</p>
            ) : (
              jobs3DaysAhead.map((j) => (
                <div key={j.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <p className="font-mono font-bold text-slate-700">{j.id} • {j.commodity}</p>
                    <p className="text-slate-550 text-[10px] mt-0.5 text-slate-500">Tanggal: {j.date} | Target: {j.targetWeight} Kg</p>
                  </div>
                  <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold border border-blue-200">
                    Jadwal
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ACTIVE JOB TERMINAL AND PACKAGING SEALING WIZARD */}
      {selectedActiveJob && (
        <div className="bg-white border border-emerald-500 p-6 rounded-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 relative shadow-lg">
          <button 
            onClick={() => setSelectedActiveJob(null)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
          >
            <X size={18} />
          </button>

          <span className="absolute top-4 right-12 text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-300">
            TERMINAL AKTIF: {selectedActiveJob.id}
          </span>

          {/* Stepper column (Alur Produksi Komoditas - REVISI 8) */}
          <div className="lg:col-span-6 space-y-4">
            <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles size={14} className="text-emerald-600 animate-spin" />
              <span>Alur IQF Sterilisasi Komoditas ({selectedActiveJob.commodity})</span>
            </h4>

            <div className="space-y-2">
              {selectedActiveJob.steps.map((step, idx) => {
                const isDone = selectedActiveJob.currentStepIndex > idx;
                const isActive = selectedActiveJob.currentStepIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isDone
                        ? "bg-slate-50 border-slate-200 text-slate-400"
                        : isActive
                        ? "bg-emerald-50 border-emerald-400 text-emerald-900 font-bold shadow-xs"
                        : "bg-white border-slate-200 text-slate-500"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold font-mono text-[10px] ${
                        isDone ? "bg-slate-200 text-slate-500" : isActive ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-400"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{step}</span>
                    </div>

                    {isActive && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStep(selectedActiveJob)}
                        className="bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded transition-transform hover:scale-105 cursor-pointer"
                      >
                        Berikutnya
                      </button>
                    )}

                    {isDone && (
                      <span className="text-[10px] uppercase font-mono font-bold text-emerald-600 font-bold">
                        Selesai ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sealing Packaging Column (Vacuum otomatis - REVISI 9) */}
          {selectedActiveJob.currentStepIndex === selectedActiveJob.steps.length ? (
            <form onSubmit={handleCompletePackagingAndSeal} className="lg:col-span-6 border-l border-slate-205 pl-0 lg:pl-6 space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h4 className="text-xs font-semibold text-slate-805 text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Play size={14} className="text-emerald-600" />
                  <span>Segel Kemasan & Laporan Hasil (IQF)</span>
                </h4>
                {selectedActiveJob.orderId && (
                  <span className="text-[9px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200 inline-block mt-1 font-bold">
                    CONNECTED SBU ORDER: Otomatisasi Kemasan Aktif
                  </span>
                )}
              </div>

              {/* Multi-Item Yield Inputs Panel */}
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-3">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-[10px] font-extrabold uppercase text-slate-600 tracking-wider">
                    Rincian Output Pengemasan ({yieldItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddYieldItem}
                    className="bg-emerald-600 hover:bg-emerald-750 hover:bg-emerald-700 text-white font-black text-[9px] uppercase px-2.5 py-1 rounded shadow-xs cursor-pointer transition-transform active:scale-95 flex items-center space-x-1"
                  >
                    <span>+ Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                  {yieldItems.map((item, index) => {
                    const rowTotalKg = (parseFloat(item.unitWeight) || 0) * (parseInt(item.completedUnits) || 0);
                    return (
                      <div key={index} className="p-3 bg-white border border-slate-200 rounded-xl relative space-y-2.5 shadow-2xs">
                        {/* Header Row */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">No. {index + 1}</span>
                          {yieldItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveYieldItem(index)}
                              className="text-red-500 hover:text-red-700 font-bold text-[9px] uppercase font-mono cursor-pointer transition-colors"
                            >
                              Hapus
                            </button>
                          )}
                        </div>

                        {/* Row Inputs */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Jenis Sayur</label>
                            <select
                              value={item.commodity}
                              onChange={(e) => handleUpdateYieldItem(index, "commodity", e.target.value)}
                              className="w-full mt-1 p-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-medium"
                            >
                              <option value="Wortel">Wortel</option>
                              <option value="Buncis">Buncis</option>
                              <option value="Jagung Manis">Jagung Manis</option>
                              <option value="Sayuran Mix">Sayuran Mix</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Ukuran / Tipe</label>
                            <select
                              value={item.packageType}
                              onChange={(e) => {
                                const val = e.target.value;
                                let w = "1.0";
                                if (val === "1 Kg") w = "1.0";
                                else if (val === "2.5 Kg") w = "2.5";
                                else if (val === "5 Kg") w = "5.0";
                                
                                const updated = [...yieldItems];
                                updated[index] = {
                                  ...updated[index],
                                  packageType: val,
                                  unitWeight: w
                                };
                                setYieldItems(updated);
                              }}
                              className="w-full mt-1 p-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold"
                            >
                              <option value="1 Kg">1 Kg Standard</option>
                              <option value="2.5 Kg">2.5 Kg Standard</option>
                              <option value="5 Kg">5 Kg Bulk</option>
                              <option value="Custom">Custom Pack</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase">Berat (Kg/Pack)</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={item.unitWeight}
                              onChange={(e) => handleUpdateYieldItem(index, "unitWeight", e.target.value)}
                              className="w-full mt-1 p-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-bold font-mono"
                              placeholder="Contoh: 1.0"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold text-slate-500 uppercase font-sans">Jumlah (Pack)</label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={item.completedUnits}
                              onChange={(e) => handleUpdateYieldItem(index, "completedUnits", e.target.value)}
                              className="w-full mt-1 p-1.5 bg-white border border-slate-300 text-slate-800 rounded-lg text-xs font-bold font-mono"
                              placeholder="500"
                            />
                          </div>
                        </div>

                        {/* Row Subtotal weight calculation */}
                        <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg font-mono text-[9px] border border-slate-100">
                          <span className="text-slate-500">Berat Baris:</span>
                          <span className="font-extrabold text-slate-700">
                            {rowTotalKg.toLocaleString("id-ID")} Kg
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total accumulation display */}
                <div className="pt-2 border-t border-slate-200/85 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500 uppercase tracking-wide text-[10px]">Total Berat Akhir IQF:</span>
                  <span className="text-[13px] font-mono font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                    {yieldItems.reduce((acc, curr) => acc + (parseFloat(curr.unitWeight) || 0) * (parseInt(curr.completedUnits) || 0), 0).toLocaleString("id-ID")}{" "}
                    <span className="text-[10px] font-sans font-bold">Kg</span>
                  </span>
                </div>
              </div>

              {/* Location and verifications */}
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Lokasi Lemari Gudang Beku (Cold Storage)</label>
                  <select
                    value={freezerLocation}
                    onChange={(e) => setFreezerLocation(e.target.value)}
                    className="w-full mt-1.5 p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg outline-none text-xs font-medium"
                  >
                    <option value="Freezer Sector A">Freezer Kamar A6 (Wortel)</option>
                    <option value="Freezer Sector B">Freezer Kamar B4 (Buncis)</option>
                    <option value="Freezer Sector C">Freezer Kamar C5 (Jagung Manis)</option>
                    <option value="Freezer Sector Mix">Freezer Utama 8 (Mixes)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="text-[9px] font-bold tracking-wider text-slate-650 uppercase font-mono">Verifikasi Segel & Kebocoran Vakum</span>
                
                <label className="flex items-start space-x-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={isVacuumChecked}
                    onChange={(e) => setIsVacuumChecked(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                  <span>
                    Saya menyatakan uji vacuum seal lulus standard kebocoran, saringan logam steril, dan sayur beku siap didistribusikan ke gudang beku.
                  </span>
                </label>
              </div>

              <div className="text-right flex space-x-3 pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white rounded-lg text-xs shadow-sm cursor-pointer flex items-center justify-center space-x-1"
                >
                  <span>Selesaikan & Pindahkan Ke Cold Storage</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="lg:col-span-6 bg-slate-50 rounded-xl border border-slate-200 p-6 text-center italic text-xs text-slate-500 font-sans flex flex-col justify-center items-center">
              <Lock size={24} className="mb-2 text-amber-500 animate-pulse" />
              <span>
                Fase pembekuan IQF sedang dalam masa pengerjaan lapangan. Tombol penyelesaian segel vakum serta timbangan box kemasan otomatis terbuka tatkala proses langkah di kiri tuntas.
              </span>
            </div>
          )}

        </div>
      )}

      {/* COMPLETED PRODUCTION REPORT LOGS */}
      {session && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Histori Laporan Output Sterilisasi IQF</p>
          <button 
            onClick={fetchData} 
            className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1 cursor-pointer hover:text-emerald-700"
          >
            <RotateCcw size={10} />
            <span>Penyelarasan</span>
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-xs text-slate-500 font-medium">Koneksi...</p>
        ) : productions.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500 font-medium italic">Belum ada output tuntas dilaporkan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider font-display">
                <tr>
                  <th className="p-4">No. Job</th>
                  <th className="p-4">Link QC Terpilih</th>
                  <th className="p-4">Ref Order SBU</th>
                  <th className="p-4">Komoditas Utama</th>
                  <th className="p-4">Alokasi Mentah</th>
                  <th className="p-4">Hasil Jadi (Locker Cold)</th>
                  <th className="p-4">Hasil Rincian Kemasan</th>
                  <th className="p-4">Operator PIC</th>
                  <th className="p-4">Segel Vacuum</th>
                  <th className="p-4">Status Kerja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productions.map((p) => {
                  const isDone = p.status === "Selesai";
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-bold text-emerald-600">{p.id}</td>
                      <td className="p-4 font-mono text-slate-600">
                        {p.qcChecklistId ? (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-250">
                            {p.qcChecklistId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px] font-sans">Raw Stock</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-slate-600 font-medium">{p.orderId || "MOCK-STOK"}</td>
                      <td className="p-4 font-semibold text-slate-800">{p.commodity}</td>
                      <td className="p-4 text-slate-700 font-bold font-mono">{p.allocatedRawMaterial} Kg</td>
                      <td className="p-4 font-bold text-slate-900 font-mono">
                        {isDone ? `${p.yieldWeight} Kg` : "Menunggu Processing"}
                      </td>
                      <td className="p-4 text-slate-650">
                        {isDone ? (
                          p.yieldItems && p.yieldItems.length > 0 ? (
                            <div className="space-y-1">
                              {p.yieldItems.map((item: any, idx: number) => (
                                <div key={idx} className="text-[11px] leading-tight font-medium text-slate-700">
                                  • <span className="font-semibold text-slate-900">{item.commodity}</span>: {item.completedUnits} Pack ({item.packageType})
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="font-semibold leading-tight">{p.packaging?.completedUnits || p.completedUnits || 0} Pack ({p.packaging?.packageType || p.packageType || "1 Kg"})</span>
                          )
                        ) : "-"}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{p.pic}</td>
                      <td className="p-4">
                        {p.packaging?.isVacuumChecked ? (
                          <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                            PASSED QC
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">Pending</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                          isDone ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-605 text-slate-500"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

    </div>
  );
}
