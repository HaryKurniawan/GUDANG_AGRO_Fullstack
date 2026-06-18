import React, { useState, useEffect } from "react";
import { Warehouse, Calculator, Plus, Send, RotateCcw, Pencil, Trash, X, Check, Eye, Download, Printer } from "lucide-react";
import { RawMaterialProcurement, SBUOrder, UserSession, CommodityType, RawMaterialStatus } from "../types";

interface RawMaterialsProcurementViewProps {
  session: UserSession;
  setErrorNotification: (msg: string | null) => void;
  setSuccessNotification: (msg: string | null) => void;
  triggerRefreshStats: () => void;
}

export default function RawMaterialsProcurementView({
  session, setErrorNotification, setSuccessNotification, triggerRefreshStats
}: RawMaterialsProcurementViewProps) {
  const [procurements, setProcurements] = useState<RawMaterialProcurement[]>([]);
  const [orders, setOrders] = useState<SBUOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Shrinkage configuration (Fitur 2)
  const SHRINKAGE_RATES: Record<CommodityType, number> = {
    "Wortel": 0.35, // 35%
    "Buncis": 0.07, // 7%
    "Jagung Manis": 0.10, // 10%
    "Sayuran Mix": 0.18 // 18%
  };

  // Farmer market prices per Kg (Fitur 4)
  const MARKET_PRICES: Record<CommodityType, number> = {
    "Wortel": 8500,
    "Buncis": 11000,
    "Jagung Manis": 7000,
    "Sayuran Mix": 9500
  };

  // SBU Order integration states
  const [selectedSbuSource, setSelectedSbuSource] = useState<string>("");

  // Calculator state
  const [calcCommodity, setCalcCommodity] = useState<CommodityType>("Wortel");
  const [calcTargetWeight, setCalcTargetWeight] = useState("100");

  // Proportions for Sayuran Mix (Wortel 40%, Buncis 30%, Jagung Manis 30% by default)
  const [mixWortelPct, setMixWortelPct] = useState<string>("40");
  const [mixBuncisPct, setMixBuncisPct] = useState<string>("30");
  const [mixJagungPct, setMixJagungPct] = useState<string>("30");

  const calculateNeededWeight = (commodity: CommodityType, targetWeight: number): number => {
    if (commodity === "Sayuran Mix") {
      const wPct = parseFloat(mixWortelPct) || 0;
      const bPct = parseFloat(mixBuncisPct) || 0;
      const jPct = parseFloat(mixJagungPct) || 0;
      const wNet = targetWeight * (wPct / 100);
      const bNet = targetWeight * (bPct / 100);
      const jNet = targetWeight * (jPct / 100);
      const wRaw = wPct > 0 ? (wNet / 0.65) : 0;
      const bRaw = bPct > 0 ? (bNet / 0.93) : 0;
      const jRaw = jPct > 0 ? (jNet / 0.90) : 0;
      return parseFloat((wRaw + bRaw + jRaw).toFixed(1));
    } else {
      const shrinkRate = SHRINKAGE_RATES[commodity] || 0.10;
      return parseFloat((targetWeight / (1 - shrinkRate)).toFixed(1));
    }
  };

  // Multi-item PO basket state
  const [poBasket, setPoBasket] = useState<any[]>([]);

  // Item input states for current item in procurement form
  const [procCommodity, setProcCommodity] = useState<CommodityType>("Wortel");
  const [procTotalWeight, setProcTotalWeight] = useState<string>("100");
  const [procPricePerKg, setProcPricePerKg] = useState(8500);
  const [procPriceWortel, setProcPriceWortel] = useState(8500);
  const [procPriceBuncis, setProcPriceBuncis] = useState(11000);
  const [procPriceJagung, setProcPriceJagung] = useState(7000);

  const getSayuranMixBreakdown = (totalRawWeight: number) => {
    const wPct = parseFloat(mixWortelPct) || 40;
    const bPct = parseFloat(mixBuncisPct) || 30;
    const jPct = parseFloat(mixJagungPct) || 30;

    const wNetUnit = wPct / 100;
    const bNetUnit = bPct / 100;
    const jNetUnit = jPct / 100;

    const wRawUnit = wNetUnit / 0.65;
    const bRawUnit = bNetUnit / 0.93;
    const jRawUnit = jNetUnit / 0.90;

    const totalRawUnit = wRawUnit + bRawUnit + jRawUnit;

    if (totalRawUnit <= 0) return { wortel: 0, buncis: 0, jagung: 0 };

    const wortel = parseFloat(((wRawUnit / totalRawUnit) * totalRawWeight).toFixed(1));
    const buncis = parseFloat(((bRawUnit / totalRawUnit) * totalRawWeight).toFixed(1));
    const jagung = parseFloat((totalRawWeight - wortel - buncis).toFixed(1));

    return { wortel, buncis, jagung };
  };

  const getProcTotalPrice = () => {
    const totalW = parseFloat(procTotalWeight) || 0;
    if (procCommodity === "Sayuran Mix") {
      const breakdown = getSayuranMixBreakdown(totalW);
      const wortelCost = breakdown.wortel * procPriceWortel;
      const buncisCost = breakdown.buncis * procPriceBuncis;
      const jagungCost = breakdown.jagung * procPriceJagung;
      return parseFloat((wortelCost + buncisCost + jagungCost).toFixed(0));
    } else {
      return parseFloat((totalW * procPricePerKg).toFixed(0));
    }
  };

  const calculateShrinkageForItem = (commodity: CommodityType, totalRawWeight: number): number => {
    if (commodity === "Sayuran Mix") {
      const breakdown = getSayuranMixBreakdown(totalRawWeight);
      const wShrink = breakdown.wortel * 0.35;
      const bShrink = breakdown.buncis * 0.07;
      const jShrink = breakdown.jagung * 0.10;
      return parseFloat((wShrink + bShrink + jShrink).toFixed(1));
    } else {
      const rate = SHRINKAGE_RATES[commodity] || 0.10;
      return parseFloat((totalRawWeight * rate).toFixed(1));
    }
  };

  const getBasketAggregatedTotals = () => {
    let totalWortel = 0;
    let totalBuncis = 0;
    let totalJagung = 0;
    let grandTotal = 0;

    poBasket.forEach((item) => {
      const w = parseFloat(item.totalWeight) || 0;
      grandTotal += w;

      if (item.commodity === "Wortel") {
        totalWortel += w;
      } else if (item.commodity === "Buncis") {
        totalBuncis += w;
      } else if (item.commodity === "Jagung Manis") {
        totalJagung += w;
      } else if (item.commodity === "Sayuran Mix") {
        const breakdown = getSayuranMixBreakdown(w);
        totalWortel += breakdown.wortel;
        totalBuncis += breakdown.buncis;
        totalJagung += breakdown.jagung;
      }
    });

    return {
      wortel: parseFloat(totalWortel.toFixed(1)),
      buncis: parseFloat(totalBuncis.toFixed(1)),
      jagung: parseFloat(totalJagung.toFixed(1)),
      grandTotal: parseFloat(grandTotal.toFixed(1))
    };
  };

  const aggregatedTotals = getBasketAggregatedTotals();

  // General PO Info
  const [procExpectedDate, setProcExpectedDate] = useState("");
  const [procNotes, setProcNotes] = useState("");

  // Invoice / PO PDF Document preview modal state
  const [isPoDocModalOpen, setIsPoDocModalOpen] = useState(false);
  const [selectedPoDoc, setSelectedPoDoc] = useState<any | null>(null);

  // Editing state
  const [editModePO, setEditModePO] = useState<string | null>(null); // holds PO.id if editing

  const fetchData = async () => {
    setLoading(true);
    try {
      const resp1 = await fetch("/api/procurements");
      const data1 = await resp1.json();
      setProcurements(data1);

      const resp2 = await fetch("/api/orders");
      const data2 = await resp2.json();
      setOrders(data2 || []);
    } catch (e) {
      setErrorNotification("Gagal mengambil data sinkronisasi pengadaan ");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 10000); // Polling every 10 seconds for reactive state synchronization
    return () => clearInterval(intervalId);
  }, []);

  // Status mapping helper
  const mapStatusToProfessional = (status: string) => {
    if (!status) return "";
    const s = status.trim();
    if (s === "Draft" || s === "Menunggu Konfirmasi" || s === "Menunggu" || s === "Pesanan Diterima") return "Pesanan Diterima";
    if (s === "Disetujui" || s === "Diproses" || s === "Pesanan Sedang Diproses") return "Pesanan Sedang Diproses";
    if (s === "Siap Produksi" || s === "Selesai Produksi" || s === "Menunggu Produksi" || s === "Siap" || s === "Pesanan Telah Siap") return "Pesanan Telah Siap";
    if (s === "Dikirim" || s === "Dalam Pengiriman" || s === "Dikirim Truk Chiller" || s === "Pesanan Dalam Pengiriman") return "Pesanan Dalam Pengiriman";
    if (s === "Selesai" || s === "Pesanan Selesai") return "Pesanan Selesai";
    return status;
  };

  // Generate individual SBU order item options that have "Pesanan Diterima" status (Fitur 3)
  const sbuOptions: any[] = [];
  orders.forEach((o) => {
    if (o.status === "Pesanan Diterima" || mapStatusToProfessional(o.status) === "Pesanan Diterima") {
      if (o.items && o.items.length > 0) {
        o.items.forEach((it: any, index: number) => {
          sbuOptions.push({
            id: `${o.id}-item-${index}`,
            orderId: o.id,
            commodity: it.commodity || it.nama_komoditas,
            quantity: it.quantity || it.qty_pack,
            packageWeight: it.packageWeight || it.berat_kemasan,
            packaging: it.packaging || `${it.packageWeight || it.berat_kemasan} Kg`,
            totalWeight: it.totalWeight || it.total_berat
          });
        });
      } else if (o.commodity) {
        sbuOptions.push({
          id: `${o.id}-main`,
          orderId: o.id,
          commodity: o.commodity,
          quantity: o.quantity || 0,
          packageWeight: o.packageWeight || 1,
          packaging: o.packaging || "1 Kg",
          totalWeight: o.totalWeight || 0
        });
      }
    }
  });

  // Calculate total weights for each commodity from those "Pesanan Diterima" orders to keep backwards capabilities
  const pendingSbuOrdersPerCommVal = orders.reduce((acc: Record<string, number>, curr) => {
    if (curr.status === "Pesanan Diterima" || mapStatusToProfessional(curr.status) === "Pesanan Diterima") {
      if (curr.items && curr.items.length > 0) {
        curr.items.forEach((it: any) => {
          const comm = it.commodity || it.nama_komoditas;
          const totalW = it.totalWeight || it.total_berat || 0;
          acc[comm] = (acc[comm] || 0) + totalW;
        });
      } else {
        const comm = curr.commodity as string;
        if (comm && comm.includes(",")) {
          comm.split(",").map(c => c.trim()).forEach((c) => {
            acc[c] = (acc[c] || 0) + (curr.totalWeight / comm.split(",").length);
          });
        } else if (curr.commodity) {
          acc[curr.commodity] = (acc[curr.commodity] || 0) + curr.totalWeight;
        }
      }
    }
    return acc;
  }, { "Wortel": 0, "Buncis": 0, "Jagung Manis": 0, "Sayuran Mix": 0 });

  // Automatically select first SBU order option and sync to calculator & PO form when list updates
  useEffect(() => {
    if (orders && orders.length > 0) {
      const options: any[] = [];
      orders.forEach((o) => {
        if (o.status === "Pesanan Diterima" || mapStatusToProfessional(o.status) === "Pesanan Diterima") {
          if (o.items && o.items.length > 0) {
            o.items.forEach((it: any, index: number) => {
              options.push({
                id: `${o.id}-item-${index}`,
                orderId: o.id,
                commodity: it.commodity || it.nama_komoditas,
                quantity: it.quantity || it.qty_pack,
                packageWeight: it.packageWeight || it.berat_kemasan,
                packaging: it.packaging || `${it.packageWeight || it.berat_kemasan} Kg`,
                totalWeight: it.totalWeight || it.total_berat
              });
            });
          } else if (o.commodity) {
            options.push({
              id: `${o.id}-main`,
              orderId: o.id,
              commodity: o.commodity,
              quantity: o.quantity || 0,
              packageWeight: o.packageWeight || 1,
              packaging: o.packaging || "1 Kg",
              totalWeight: o.totalWeight || 0
            });
          }
        }
      });

      // Avoid manual selection, auto-select first of the integrated SBU orders
      const isValid = selectedSbuSource && options.some(opt => opt.id === selectedSbuSource);
      if (options.length > 0 && !isValid) {
        const first = options[0];
        setSelectedSbuSource(first.id);
        setCalcCommodity(first.commodity);
        setCalcTargetWeight(first.totalWeight.toString());

        // Instant form population
        const rawNeeded = calculateNeededWeight(first.commodity as CommodityType, first.totalWeight);
        
        setProcCommodity(first.commodity as CommodityType);
        setProcPricePerKg(MARKET_PRICES[first.commodity as CommodityType] || 8500);
        setProcTotalWeight(rawNeeded.toString());
        if (first.commodity === "Sayuran Mix") {
          setProcPriceWortel(8500);
          setProcPriceBuncis(11000);
          setProcPriceJagung(7000);
        }

        let mixNotes = "";
        if (first.commodity === "Sayuran Mix") {
          const wPct = parseFloat(mixWortelPct) || 40;
          const bPct = parseFloat(mixBuncisPct) || 30;
          const jPct = parseFloat(mixJagungPct) || 30;
          const wNet = first.totalWeight * (wPct / 100);
          const bNet = first.totalWeight * (bPct / 100);
          const jNet = first.totalWeight * (jPct / 100);
          const wRaw = wPct > 0 ? parseFloat((wNet / 0.65).toFixed(1)) : 0;
          const bRaw = bPct > 0 ? parseFloat((bNet / 0.93).toFixed(1)) : 0;
          const jRaw = jPct > 0 ? parseFloat((jNet / 0.90).toFixed(1)) : 0;
          mixNotes = ` [Komposisi: Wortel ${wPct}% (${wRaw} Kg), Buncis ${bPct}% (${bRaw} Kg), Jagung ${jPct}% (${jRaw} Kg)]`;
        }
        setProcNotes(`Pemesanan bahan baku ${first.commodity} segar (Order SBU ${first.orderId}) sesuai hasil hitung saringan susut untuk target SBU ${first.totalWeight} Kg.${mixNotes}`);
      } else if (options.length === 0) {
        setSelectedSbuSource("");
        setCalcTargetWeight("");
      }
    }
  }, [orders]);

  // When source of SBU order is toggled in Kalkulator Penyusutan
  const handleSbuSourceChange = (val: string) => {
    setSelectedSbuSource(val);
    if (val === "manual") {
      setCalcCommodity("Sayuran Mix");
      setCalcTargetWeight("100");
      setProcCommodity("Sayuran Mix");
      setProcPricePerKg(MARKET_PRICES["Sayuran Mix"] || 9500);
      setProcPriceWortel(8500);
      setProcPriceBuncis(11000);
      setProcPriceJagung(7000);
      setSuccessNotification("Mode Input Manual diaktifkan! Anda bebas mengisi Target Produk dan Komoditas kustom.");
      return;
    }
    if (val) {
      const selectedOpt = sbuOptions.find(opt => opt.id === val);
      if (selectedOpt) {
        const comm = selectedOpt.commodity as CommodityType;
        const targetW = selectedOpt.totalWeight;
        
        // 1. Update calculator state
        setCalcCommodity(comm);
        setCalcTargetWeight(targetW.toString());

        // 2. Perform shrinkage calculation
        const rawNeeded = calculateNeededWeight(comm, targetW);

        // 3. Populate form Pembuatan PO Kelompok Tani
        setProcCommodity(comm);
        setProcPricePerKg(MARKET_PRICES[comm] || 8500);
        setProcTotalWeight(rawNeeded.toString());
        if (comm === "Sayuran Mix") {
          setProcPriceWortel(8500);
          setProcPriceBuncis(11000);
          setProcPriceJagung(7000);
        }
        
        const sourceLabel = `Order SBU ${selectedOpt.orderId}`;
        let mixNotes = "";
        if (comm === "Sayuran Mix") {
          const wPct = parseFloat(mixWortelPct) || 40;
          const bPct = parseFloat(mixBuncisPct) || 30;
          const jPct = parseFloat(mixJagungPct) || 30;
          const wNet = targetW * (wPct / 100);
          const bNet = targetW * (bPct / 100);
          const jNet = targetW * (jPct / 100);
          const wRaw = wPct > 0 ? parseFloat((wNet / 0.65).toFixed(1)) : 0;
          const bRaw = bPct > 0 ? parseFloat((bNet / 0.93).toFixed(1)) : 0;
          const jRaw = jPct > 0 ? parseFloat((jNet / 0.90).toFixed(1)) : 0;
          mixNotes = ` [Komposisi: Wortel ${wPct}% (${wRaw} Kg), Buncis ${bPct}% (${bRaw} Kg), Jagung ${jPct}% (${jRaw} Kg)]`;
        }
        setProcNotes(`Pemesanan bahan baku ${comm} segar (${sourceLabel}) sesuai hasil hitung saringan susut untuk target SBU ${targetW} Kg.${mixNotes}`);

        setSuccessNotification(`Order SBU ${selectedOpt.orderId} terhubung! Kebutuhan bahan baku ${rawNeeded} Kg otomatis masuk ke form Pembuatan PO Kelompok Tani.`);
      }
    } else {
      setCalcTargetWeight("");
    }
  };

  // Shrinkage Calculator Logic
  const targetVal = parseFloat(calcTargetWeight) || 0;

  const wPct = parseFloat(mixWortelPct) || 0;
  const bPct = parseFloat(mixBuncisPct) || 0;
  const jPct = parseFloat(mixJagungPct) || 0;

  const wortelNet = targetVal * (wPct / 100);
  const buncisNet = targetVal * (bPct / 100);
  const jagungNet = targetVal * (jPct / 100);

  const wortelRaw = wPct > 0 ? parseFloat((wortelNet / 0.65).toFixed(1)) : 0;
  const buncisRaw = bPct > 0 ? parseFloat((buncisNet / 0.93).toFixed(1)) : 0;
  const jagungRaw = jPct > 0 ? parseFloat((jagungNet / 0.90).toFixed(1)) : 0;

  const mixTotalRaw = parseFloat((wortelRaw + buncisRaw + jagungRaw).toFixed(1));
  const mixTotalShrinkage = parseFloat((mixTotalRaw - targetVal).toFixed(1));

  const calcIsMix = calcCommodity === "Sayuran Mix";
  const shrinkagePercent = SHRINKAGE_RATES[calcCommodity];

  const rawMaterialNeeded = calcIsMix 
    ? mixTotalRaw 
    : (targetVal > 0 ? parseFloat((targetVal / (1 - shrinkagePercent)).toFixed(1)) : 0);

  const estimatedShrinkageInKg = calcIsMix 
    ? mixTotalShrinkage 
    : (targetVal > 0 ? parseFloat((rawMaterialNeeded - targetVal).toFixed(1)) : 0);

  // Sync calculation results straight to procurement order form
  const handleApplyCalculation = () => {
    setProcCommodity(calcCommodity);
    setProcPricePerKg(MARKET_PRICES[calcCommodity]);
    setProcTotalWeight(rawMaterialNeeded.toString());
    if (calcCommodity === "Sayuran Mix") {
      setProcPriceWortel(8500);
      setProcPriceBuncis(11000);
      setProcPriceJagung(7000);
    }

    const isManual = !selectedSbuSource || selectedSbuSource === "manual";
    const sourceLabel = isManual ? "Kustom Manual" : (() => {
      const opt = sbuOptions.find(o => o.id === selectedSbuSource);
      return opt ? `Order SBU ${opt.orderId}` : "Order SBU";
    })();

    let mixNotes = "";
    if (calcIsMix) {
      mixNotes = ` [Komposisi: Wortel ${wPct}% (${wortelRaw} Kg), Buncis ${bPct}% (${buncisRaw} Kg), Jagung ${jPct}% (${jagungRaw} Kg)]`;
    }

    setProcNotes(`Pemesanan bahan baku ${calcCommodity} segar (${sourceLabel}) sesuai hasil hitung saringan susut untuk target ${targetVal} Kg.${mixNotes}`);
    setSuccessNotification("Hasil hitung penyusutan otomatis disatukan ke form pengujian!");
  };

  const handleProcCommodityChange = (comm: CommodityType) => {
    setProcCommodity(comm);
    setProcPricePerKg(MARKET_PRICES[comm]);
    if (comm === "Sayuran Mix") {
      setProcPriceWortel(8500);
      setProcPriceBuncis(11000);
      setProcPriceJagung(7000);
    }
  };

  // Add item to local PO basket
  const handleAddItemToBasket = () => {
    const totalW = parseFloat(procTotalWeight) || 0;
    if (totalW <= 0) {
      setErrorNotification("Total kilogram tani harus valid (lebih dari 0).");
      return;
    }
    const totalPrice = getProcTotalPrice();

    // Check if item of same commodity exists in basket
    const duplicateIdx = poBasket.findIndex(
      (it) => it.commodity === procCommodity
    );

    if (duplicateIdx > -1) {
      const updated = [...poBasket];
      const prevTotalWeight = updated[duplicateIdx].totalWeight;
      const newTotalWeight = parseFloat((prevTotalWeight + totalW).toFixed(1));
      updated[duplicateIdx].totalWeight = newTotalWeight;
      updated[duplicateIdx].neededWeight = newTotalWeight;

      if (procCommodity === "Sayuran Mix") {
        const breakdown = getSayuranMixBreakdown(newTotalWeight);
        const wPrice = procPriceWortel;
        const bPrice = procPriceBuncis;
        const jPrice = procPriceJagung;
        const computedTotalPrice = breakdown.wortel * wPrice + breakdown.buncis * bPrice + breakdown.jagung * jPrice;
        updated[duplicateIdx].totalPrice = parseFloat(computedTotalPrice.toFixed(0));
        updated[duplicateIdx].marketPricePerKg = parseFloat((computedTotalPrice / newTotalWeight).toFixed(1));
        updated[duplicateIdx].prices = {
          wortel: wPrice,
          buncis: bPrice,
          jagung: jPrice
        };
      } else {
        updated[duplicateIdx].totalPrice = parseFloat((newTotalWeight * updated[duplicateIdx].marketPricePerKg).toFixed(1));
      }
      setPoBasket(updated);
    } else {
      const newItem = {
        commodity: procCommodity,
        quantity: 1,
        packageWeight: 1,
        totalWeight: totalW,
        neededWeight: totalW,
        marketPricePerKg: procCommodity === "Sayuran Mix" ? parseFloat((totalPrice / totalW).toFixed(1)) : procPricePerKg,
        totalPrice,
        packaging: "Kiloan / Curah",
        prices: procCommodity === "Sayuran Mix" ? {
          wortel: procPriceWortel,
          buncis: procPriceBuncis,
          jagung: procPriceJagung
        } : undefined
      };
      setPoBasket([...poBasket, newItem]);
    }
    setSuccessNotification(`Item ${procCommodity} (${totalW} Kg) berhasil ditambah ke rancangan PO.`);
  };

  // Handle Create or Update
  const handleCreateOrUpdateProcurement = async (e: React.FormEvent) => {
    e.preventDefault();

    let currentBasket = [...poBasket];
    // If basket is empty but there are valid inputs, automatically add them to make it seamless
    if (currentBasket.length === 0) {
      const totalW = parseFloat(procTotalWeight) || 0;
      if (totalW > 0) {
        const itemPrice = getProcTotalPrice();
        currentBasket = [
          {
            commodity: procCommodity,
            quantity: 1,
            packageWeight: 1,
            totalWeight: totalW,
            neededWeight: totalW,
            marketPricePerKg: procCommodity === "Sayuran Mix" ? parseFloat((itemPrice / totalW).toFixed(1)) : procPricePerKg,
            totalPrice: itemPrice,
            packaging: "Kiloan / Curah",
            prices: procCommodity === "Sayuran Mix" ? {
              wortel: procPriceWortel,
              buncis: procPriceBuncis,
              jagung: procPriceJagung
            } : undefined
          }
        ];
      } else {
        setErrorNotification("Daftar item PO pengajuan masih kosong. Silakan tambahkan minimal 1 item.");
        return;
      }
    }

    if (!procExpectedDate) {
      setErrorNotification("Tanggal pengisian / ekspektasi tiba wajib diisi.");
      return;
    }

    try {
      const summaryCommodity = Array.from(new Set(currentBasket.map((it) => it.commodity))).join(", ");
      const summaryTotalWeight = currentBasket.reduce((sum, it) => sum + it.totalWeight, 0);
      const summaryTotalPrice = currentBasket.reduce((sum, it) => sum + it.totalPrice, 0);
      const summaryNeeded = currentBasket.reduce((sum, it) => sum + it.neededWeight, 0);
      const summaryShrinkage = currentBasket.reduce((sum, it) => {
        if (it.commodity === "Sayuran Mix") {
          return sum + parseFloat((it.neededWeight - it.totalWeight).toFixed(1));
        } else {
          return sum + (it.totalWeight * (SHRINKAGE_RATES[it.commodity as CommodityType] || 0.10));
        }
      }, 0);

      let savedDoc;
      const sbuOpt = sbuOptions.find((opt) => opt.id === selectedSbuSource);
      const linkedOrderId = sbuOpt ? sbuOpt.orderId : undefined;

      if (linkedOrderId && currentBasket.length > 0) {
        currentBasket = currentBasket.map(item => ({ ...item, orderId: linkedOrderId }));
      }

      if (editModePO) {
        // Edit mode
        const response = await fetch(`/api/procurements/${editModePO}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedDeliveryDate: procExpectedDate,
            notes: procNotes,
            items: currentBasket,
            operator: { username: session.username, role: session.role },
            orderId: linkedOrderId
          })
        });

        if (!response.ok) throw new Error("Gagal mengupdate PO.");
        savedDoc = await response.json();
        setSuccessNotification("Pengajuan bahan baku berhasil dikirim.");
        setEditModePO(null);
      } else {
        // Create mode
        const response = await fetch("/api/procurements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commodity: summaryCommodity,
            neededWeight: summaryNeeded,
            estimatedShrinkage: summaryShrinkage,
            rawMaterialToOrder: summaryTotalWeight,
            marketPricePerKg: currentBasket[0]?.marketPricePerKg || 8500,
            expectedDeliveryDate: procExpectedDate,
            notes: procNotes,
            items: currentBasket,
            operator: { username: session.username, role: session.role },
            orderId: linkedOrderId
          })
        });

        if (!response.ok) throw new Error("Gagal menyimpan pengajuan ke kepala tani");
        savedDoc = await response.json();
        setSuccessNotification("Pengajuan bahan baku berhasil dikirim.");
      }

      // Automatically show generated PDF Document in preview modal!
      setSelectedPoDoc(savedDoc);
      setIsPoDocModalOpen(true);

      fetchData();
      triggerRefreshStats();
      // Reset
      setPoBasket([]);
      setProcExpectedDate("");
      setProcNotes("");
      setSelectedSbuSource("");
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  // Turn on edit mode for PO
  const handleInitiateEdit = (proc: RawMaterialProcurement | any) => {
    setEditModePO(proc.id);
    setProcExpectedDate(proc.expectedDeliveryDate);
    setProcNotes(proc.notes);

    if (proc.items && proc.items.length > 0) {
      setPoBasket(proc.items);
      // Pre-fill the single input fields with the first item's parameters
      const first = proc.items[0];
      setProcCommodity(first.commodity);
      setProcTotalWeight(first.totalWeight.toString());
      if (first.commodity === "Sayuran Mix") {
        setProcPriceWortel(first.prices?.wortel || 8500);
        setProcPriceBuncis(first.prices?.buncis || 11000);
        setProcPriceJagung(first.prices?.jagung || 7000);
      } else {
        setProcPricePerKg(first.marketPricePerKg || first.pricePerKg || 8500);
      }
    } else {
      // old fallback from database single item
      const initialItem = {
        commodity: proc.commodity,
        quantity: 1,
        packageWeight: 1,
        totalWeight: proc.rawMaterialToOrder,
        neededWeight: proc.neededWeight || proc.rawMaterialToOrder,
        marketPricePerKg: proc.marketPricePerKg,
        totalPrice: proc.totalPrice || (proc.rawMaterialToOrder * proc.marketPricePerKg),
        packaging: "Kiloan / Curah",
        prices: proc.commodity === "Sayuran Mix" ? {
          wortel: 8500,
          buncis: 11000,
          jagung: 7000
        } : undefined
      };
      setPoBasket([initialItem]);
      setProcCommodity(proc.commodity);
      setProcTotalWeight(proc.rawMaterialToOrder.toString());
      if (proc.commodity === "Sayuran Mix") {
        setProcPriceWortel(8500);
        setProcPriceBuncis(11000);
        setProcPriceJagung(7000);
      } else {
        setProcPricePerKg(proc.marketPricePerKg);
      }
    }
    setSuccessNotification(`Memasuki mode edit untuk nomor PO ${proc.id}`);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditModePO(null);
    setProcExpectedDate("");
    setProcNotes("");
    setProcTotalWeight("100");
    setPoBasket([]);
  };

  // Handle Delete PO
  const handleDeletePO = async (id: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus Kontrak PO ${id} ini secara permanen dari sistem?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/procurements/${id}`, {
        method: "DELETE",
        headers: {
          "x-operator-username": session.username,
          "x-operator-role": session.role
        }
      });

      if (!response.ok) throw new Error("Gagal menghapus PO dari instansi.");
      
      setSuccessNotification(`PO Kontrak ${id} berhasil dihapus dari sistem.`);
      fetchData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  const handleUpdateStatus = async (procId: string, status: RawMaterialStatus) => {
    try {
      const response = await fetch(`/api/procurements/${procId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          operator: { username: session.username, role: session.role }
        })
      });

      if (!response.ok) throw new Error("Gagal merubah status kontrak tani");

      setSuccessNotification(`Pengajuan ${procId} diverifikasi: ${status}`);
      fetchData();
      triggerRefreshStats();
    } catch (err: any) {
      setErrorNotification(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Warehouse className="text-emerald-600" size={20} />
            <span>Kebutuhan & Order Tani (Agro Produksi)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kalkulasi susut konversi dingin dan integrasi langsung dengan andalan pesanan SBU Bandung Anda secara riil.
          </p>
        </div>
        <button 
          onClick={fetchData} 
          className="flex items-center space-x-1 p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg transition-all"
        >
          <RotateCcw size={12} />
          <span>Sync Realtime</span>
        </button>
      </div>

      {session.role === "Admin Gudang" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CALCULATOR PANEL (Fitur 2 & 3 terhubung) */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                  <Calculator size={15} />
                  <span>Kalkulator Penyusutan Terintegrasi</span>
                </div>
                <span className="text-[9px] font-bold font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded">FITUR TERHUBUNG SBU</span>
              </div>

              {/* DROPDOWN TARGET ORDER SBU (Fitur 3) */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3">
                <label className="block text-[10px] font-bold text-slate-600 uppercase">
                  Hubungkan Dengan Order SBU Bandung (Pesanan Diterima)
                </label>
                <select
                  value={selectedSbuSource}
                  onChange={(e) => handleSbuSourceChange(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 text-slate-850 rounded-lg focus:outline-none focus:border-emerald-500 font-semibold"
                >
                  <option value="">-- Pilih Antrean Order SBU Bandung --</option>
                  <option value="manual">➕ Input Manual / Kustom (Tanpa SBU Order)</option>
                  {sbuOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      Nomor Order: {opt.orderId} | Sayuran: {opt.commodity} | Kuantitas: {opt.quantity} Pack | Kemasan: {opt.packaging} | Berat Bersih: {opt.totalWeight} Kg
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 leading-normal">
                  * Pilih antrean order di atas untuk menghubungkan no order secara otomatis, atau pilih <strong>Input Manual / Kustom</strong> untuk bereksperimen dengan komposisi kustom.
                </p>
              </div>
 
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">Target Produk Jadi (Frozen)</label>
                  <div className="relative">
                    <input
                      type="number"
                      disabled={selectedSbuSource !== "manual" && selectedSbuSource !== ""}
                      value={calcTargetWeight}
                      onChange={(e) => setCalcTargetWeight(e.target.value)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-bold disabled:opacity-80 disabled:text-slate-550"
                      placeholder="Masukkan target berat..."
                    />
                    <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-bold">Kg</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1.5">Komoditas Terpilih</label>
                  <select
                    disabled={selectedSbuSource !== "manual" && selectedSbuSource !== ""}
                    value={calcCommodity}
                    onChange={(e) => setCalcCommodity(e.target.value as CommodityType)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-bold disabled:opacity-80"
                  >
                    <option value="Wortel">Wortel (Laju Susut 35%)</option>
                    <option value="Buncis">Buncis (Laju Susut 7%)</option>
                    <option value="Jagung Manis">Jagung Manis (Laju Susut 10%)</option>
                    <option value="Sayuran Mix">Sayuran Mix (Laju Susut Kustom)</option>
                  </select>
                </div>
              </div>

              {/* RENDER DETAILED COMPONENT MIXTURE RATIOS FOR SAYURAN MIX */}
              {calcCommodity === "Sayuran Mix" && (
                <div className="bg-emerald-50/30 p-3.5 rounded-xl border border-emerald-100/80 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-emerald-100 pb-2">
                    <span className="text-[10px] font-bold text-emerald-850 uppercase flex items-center gap-1.5">
                      🥗 Komposisi Formula Sayur Mix (Total: {targetVal} Kg)
                    </span>
                    <span className="text-[9px] font-semibold text-slate-500">Persentase &amp; Penyusutan Komponen</span>
                  </div>

                  <div className="space-y-3">
                    {/* WORTEL COMPONENT IN MIX */}
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        <span className="text-xs font-bold text-slate-700">Wortel</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Rasio:</label>
                          <div className="relative w-16">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mixWortelPct}
                              onChange={(e) => setMixWortelPct(e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded text-right pr-4 text-xs font-mono font-bold"
                            />
                            <span className="absolute right-1 top-1 text-[9px] font-bold text-slate-400">%</span>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-mono leading-none">
                          <p className="text-slate-500">Net: <span className="font-bold text-slate-800">{wortelNet.toFixed(1)} Kg</span></p>
                          <p className="text-emerald-700 text-xs font-bold mt-0.5">Tani: <span className="font-extrabold">{wortelRaw.toFixed(1)} Kg</span></p>
                        </div>
                      </div>
                    </div>

                    {/* BUNCIS COMPONENT IN MIX */}
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-xs font-bold text-slate-700">Buncis</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Rasio:</label>
                          <div className="relative w-16">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mixBuncisPct}
                              onChange={(e) => setMixBuncisPct(e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded text-right pr-4 text-xs font-mono font-bold"
                            />
                            <span className="absolute right-1 top-1 text-[9px] font-bold text-slate-400">%</span>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-mono leading-none">
                          <p className="text-slate-500">Net: <span className="font-bold text-slate-800">{buncisNet.toFixed(1)} Kg</span></p>
                          <p className="text-emerald-700 text-xs font-bold mt-0.5">Tani: <span className="font-extrabold">{buncisRaw.toFixed(1)} Kg</span></p>
                        </div>
                      </div>
                    </div>

                    {/* JAGUNG COMPONENT IN MIX */}
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-xs font-bold text-slate-700">Jagung Manis</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <label className="text-[10px] text-slate-500 uppercase font-bold">Rasio:</label>
                          <div className="relative w-16">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={mixJagungPct}
                              onChange={(e) => setMixJagungPct(e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded text-right pr-4 text-xs font-mono font-bold"
                            />
                            <span className="absolute right-1 top-1 text-[9px] font-bold text-slate-400">%</span>
                          </div>
                        </div>
                        <div className="text-right text-[11px] font-mono leading-none">
                          <p className="text-slate-500">Net: <span className="font-bold text-slate-800">{jagungNet.toFixed(1)} Kg</span></p>
                          <p className="text-emerald-700 text-xs font-bold mt-0.5">Tani: <span className="font-extrabold">{jagungRaw.toFixed(1)} Kg</span></p>
                        </div>
                      </div>
                    </div>

                    {/* RATIO INTEGRITY ALERTER */}
                    <div className="pt-2 border-t border-emerald-100 flex justify-between items-center text-[10px] font-mono">
                      <span className="text-slate-500 font-sans">Total Persentase:</span>
                      <span className={`font-bold font-mono text-xs ${Math.abs((wPct + bPct + jPct) - 100) < 0.01 ? "text-emerald-600" : "text-amber-600 font-extrabold animate-pulse"}`}>
                        {wPct + bPct + jPct}% {Math.abs((wPct + bPct + jPct) - 100) > 0.01 && "(Komposisi harus 100%)"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
 
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mt-4 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans font-medium">Batas Susut Konversi Dingin:</span>
                  <span className="text-slate-800 font-bold">
                    {calcIsMix 
                      ? "Variatif per sayuran" 
                      : `${(SHRINKAGE_RATES[calcCommodity] * 100).toFixed(0)} %`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-sans font-medium">Laju Penyusutan Berat (IQF/Sortir):</span>
                  <span className="text-amber-600 font-bold">{estimatedShrinkageInKg} Kg</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 text-xs">
                  <span className="text-emerald-700 font-bold font-sans">Kebutuhan Bahan Baku Petani (Est):</span>
                  <span className="text-emerald-700 font-bold font-sans text-sm">{rawMaterialNeeded} Kg</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyCalculation}
              className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-emerald-400 font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <span>Terapkan Sebagai Isian Formulir PO</span>
            </button>
          </div>

          {/* CREATION PO FORM (Dapat berubah menjadi UPDATE) */}
          <form onSubmit={handleCreateOrUpdateProcurement} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
                  <Send size={15} />
                  <span>{editModePO ? `Rombak Lembar PO (${editModePO})` : "Form Pembuatan PO Kelompok Tani"}</span>
                </div>
                {editModePO && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[10px] text-rose-500 font-bold bg-rose-50 px-2.5 py-1 rounded-md hover:bg-rose-100 inline-flex items-center space-x-0.5"
                  >
                    <X size={10} />
                    <span>Batal Mode Edit</span>
                  </button>
                )}
              </div>

              {/* Basket list display */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Item Yang Akan Diajukan ({poBasket.length})</label>
                  {poBasket.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPoBasket([])}
                      className="text-[9px] font-semibold text-rose-500 hover:underline"
                    >
                      Clear Semua Item
                    </button>
                  )}
                </div>
                {poBasket.length === 0 ? (
                  <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center text-[11px] text-slate-500">
                    Keranjang PO draf masih kosong. Tambahkan item di bawah terlebih dahulu.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl bg-slate-50/50 max-h-[145px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300">
                    <table className="w-full text-left text-[11px] min-w-[500px]">
                      <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                        <tr>
                          <th className="p-2 text-[10px]">Barang</th>
                          <th className="p-2 text-right text-[10px]/[12px]">Kebutuhan Tani (Kg)</th>
                          <th className="p-2 text-right text-[10px]/[12px]">Harga/Kg</th>
                          <th className="p-2 text-right text-[10px]/[12px]">Subtotal Biaya</th>
                          <th className="p-2 text-center text-[10px]">Hapus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {poBasket.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 font-semibold text-slate-800">{item.commodity}</td>
                            <td className="p-2 text-right text-slate-800 font-bold font-mono">{item.totalWeight?.toLocaleString("id-ID")} Kg</td>
                            <td className="p-2 text-right text-slate-600 font-mono">Rp {item.marketPricePerKg?.toLocaleString("id-ID")}</td>
                            <td className="p-2 text-right text-emerald-700 font-bold font-mono">Rp {item.totalPrice?.toLocaleString("id-ID")}</td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => setPoBasket(poBasket.filter((_, i) => i !== idx))}
                                className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                              >
                                <Trash size={11} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Aggregate crop quantities and grand total overall */}
                {poBasket.length > 0 && (
                  <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100 flex flex-col space-y-2 text-[11px]">
                    <div className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
                      Akumulasi Total per Jenis Sayuran:
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/70 p-1.5 rounded-lg border border-emerald-100/50 flex flex-col items-center">
                        <span className="text-[9px] text-slate-500 font-bold leading-none">Total Wortel</span>
                        <span className="text-xs font-extrabold text-slate-700 mt-1 font-mono">
                          {aggregatedTotals.wortel.toLocaleString("id-ID")} Kg
                        </span>
                      </div>
                      <div className="bg-white/70 p-1.5 rounded-lg border border-emerald-100/50 flex flex-col items-center">
                        <span className="text-[9px] text-slate-500 font-bold leading-none">Total Buncis</span>
                        <span className="text-xs font-extrabold text-slate-700 mt-1 font-mono">
                          {aggregatedTotals.buncis.toLocaleString("id-ID")} Kg
                        </span>
                      </div>
                      <div className="bg-white/70 p-1.5 rounded-lg border border-emerald-100/50 flex flex-col items-center">
                        <span className="text-[9px] text-slate-500 font-bold leading-none">Total Jagung</span>
                        <span className="text-xs font-extrabold text-slate-700 mt-1 font-mono">
                          {aggregatedTotals.jagung.toLocaleString("id-ID")} Kg
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-emerald-200/50 font-bold text-slate-800">
                      <span>Total Keseluruhan Komoditas Tani:</span>
                      <span className="font-mono text-emerald-800 text-xs">
                        {aggregatedTotals.grandTotal.toLocaleString("id-ID")} Kg
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form segment to add items to the basket */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">Rincian Form Penyusunan Item</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5">Vegetable Komoditas</label>
                    <select
                      value={procCommodity}
                      onChange={(e) => handleProcCommodityChange(e.target.value as CommodityType)}
                      className="w-full p-2 bg-white border border-slate-300 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 font-semibold text-[11px]"
                    >
                      <option value="Wortel">Wortel Segar</option>
                      <option value="Buncis">Buncis Segar</option>
                      <option value="Jagung Manis">Jagung Segar</option>
                      <option value="Sayuran Mix">Bahan Sayuran Mix</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1.5 leading-none">Total Kilogram Tani (Kg)</label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={procTotalWeight}
                      onChange={(e) => setProcTotalWeight(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-300 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 text-[11px] font-bold"
                      placeholder="Contoh: 277.8"
                    />
                  </div>

                  {/* FIXED PREVENT RP OVERLAPPING INPUT - REVISI FITUR B */}
                  {procCommodity === "Sayuran Mix" ? (
                    <div className="col-span-2 border border-teal-100 bg-teal-50/20 rounded-xl p-2.5 space-y-2">
                      <label className="block text-[9px] font-bold text-teal-800 uppercase tracking-wide">
                        Harga Sepakat per Komponen Mix (Rp / Kg)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1 leading-none font-bold">Wortel</label>
                          <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-emerald-500 bg-white">
                            <span className="bg-slate-100 px-1 px-1.5 flex items-center border-r border-slate-200 text-slate-400 font-sans font-bold text-[9px] select-none">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={procPriceWortel}
                              onChange={(e) => setProcPriceWortel(parseInt(e.target.value) || 0)}
                              className="w-full p-1.5 bg-white text-slate-800 focus:outline-none font-mono text-[10px] font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1 leading-none font-bold">Buncis</label>
                          <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-emerald-500 bg-white">
                            <span className="bg-slate-100 px-1 px-1.5 flex items-center border-r border-slate-200 text-slate-400 font-sans font-bold text-[9px] select-none">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={procPriceBuncis}
                              onChange={(e) => setProcPriceBuncis(parseInt(e.target.value) || 0)}
                              className="w-full p-1.5 bg-white text-slate-800 focus:outline-none font-mono text-[10px] font-bold"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 mb-1 leading-none font-bold">Jagung</label>
                          <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-emerald-500 bg-white">
                            <span className="bg-slate-100 px-1 px-1.5 flex items-center border-r border-slate-200 text-slate-400 font-sans font-bold text-[9px] select-none">
                              Rp
                            </span>
                            <input
                              type="number"
                              value={procPriceJagung}
                              onChange={(e) => setProcPriceJagung(parseInt(e.target.value) || 0)}
                              className="w-full p-1.5 bg-white text-slate-800 focus:outline-none font-mono text-[10px] font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="col-span-2">
                      <label className="block text-[9px] font-bold text-slate-500 mb-1.5 leading-none font-bold">Harga Sepakat / Kg</label>
                      <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-emerald-500 bg-white">
                        <span className="bg-slate-100 px-2 flex items-center border-r border-slate-200 text-slate-400 font-sans font-bold text-[10px] select-none">
                          Rp
                        </span>
                        <input
                          type="number"
                          value={procPricePerKg}
                          onChange={(e) => setProcPricePerKg(parseInt(e.target.value) || 0)}
                          className="w-full p-2 bg-white text-slate-800 focus:outline-none font-mono text-[11px]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Interactively show Sayuran Mix breakdown ingredients with raw kilogram quantities */}
                  {procCommodity === "Sayuran Mix" && (
                    <div className="col-span-2 p-3 bg-teal-50/50 rounded-xl border border-teal-200/50 space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-800 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse"></span>
                        Komposisi Bagian Sayuran Mix Mentah Tani:
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/80 p-2 rounded-lg border border-teal-100/60 flex flex-col items-center justify-center">
                          <span className="text-[9px] text-[#e07a5f] font-bold">Wortel (40%)</span>
                          <span className="text-xs font-extrabold text-slate-700 mt-1 font-mono">
                            {getSayuranMixBreakdown(parseFloat(procTotalWeight) || 0).wortel.toLocaleString("id-ID")} Kg
                          </span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-teal-100/60 flex flex-col items-center justify-center">
                          <span className="text-[9px] text-[#4f772d] font-bold">Buncis (30%)</span>
                          <span className="text-xs font-extrabold text-slate-700 mt-1 font-mono">
                            {getSayuranMixBreakdown(parseFloat(procTotalWeight) || 0).buncis.toLocaleString("id-ID")} Kg
                          </span>
                        </div>
                        <div className="bg-white/80 p-2 rounded-lg border border-teal-100/60 flex flex-col items-center justify-center">
                          <span className="text-[9px] text-[#f4a261] font-bold">Jagung (30%)</span>
                          <span className="text-xs font-extrabold text-slate-700 mt-1 font-mono">
                            {getSayuranMixBreakdown(parseFloat(procTotalWeight) || 0).jagung.toLocaleString("id-ID")} Kg
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-teal-900 border-t border-teal-100/50 pt-1.5 font-bold px-1 select-none">
                        <span>Total Kilogram Tani Mix:</span>
                        <span className="font-bold font-mono text-xs">{(parseFloat(procTotalWeight) || 0).toLocaleString("id-ID")} Kg</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-mono border-t border-slate-200 pt-2">
                  <div>
                    <span className="text-slate-500">Subtotal Item:</span>{" "}
                    <span className="text-slate-800 font-bold">{(parseFloat(procTotalWeight) || 0).toLocaleString("id-ID")} Kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemToBasket}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-300 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tambah Item ke PO</span>
                  </button>
                </div>
              </div>

              {/* General Parameters */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Estimasi Tanggal Tiba</label>
                  <input
                    type="date"
                    value={procExpectedDate}
                    onChange={(e) => setProcExpectedDate(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 rounded-lg focus:outline-none focus:border-emerald-500 shadow-3xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1.5">Keterangan / Kelompok Tani</label>
                  <input
                    type="text"
                    value={procNotes}
                    onChange={(e) => setProcNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 text-slate-800 text-xs rounded-lg focus:outline-none focus:border-emerald-500"
                    placeholder="Contoh: Poktan Sinar Tani Maribaya..."
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-150 flex items-center justify-between text-xs font-mono">
                <span className="text-emerald-800 font-bold">ESTIMASI TOTAL ANGGARAN PO:</span>
                <span className="text-emerald-700 font-extrabold text-sm">
                  Rp {(poBasket.length > 0 
                      ? poBasket.reduce((sum, it) => sum + it.totalPrice, 0) 
                      : getProcTotalPrice()
                    ).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 focus:outline-none text-emerald-400 font-bold rounded-lg text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm border border-emerald-800"
            >
              {editModePO ? <Check size={14} /> : <Send size={14} />}
              <span>{editModePO ? "Simpan Perubahan Kontrak PO" : "Kirim Pengajuan Bahan Baku"}</span>
            </button>
          </form>

        </div>
      )}

      {/* METRIC KONTRAK & RIWAYAT PO KEPALA TANI */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider font-display">Metrik Kontrak / Riwayat PO Kepala Tani</p>
          <span className="text-[10px] font-mono text-slate-500">Total PO aktif: {procurements.length}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Menghubungkan ke API...</div>
        ) : procurements.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500 font-medium">Belum ada antrean PO bahan baku petani.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-white">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">No. PO</th>
                  <th className="p-4">Komoditas</th>
                  <th className="p-4">Kebutuhan (Kg)</th>
                  <th className="p-4">Harga per Kg</th>
                  <th className="p-4">Total Biaya Sepakat</th>
                  <th className="p-4">Ekspektasi Tiba</th>
                  <th className="p-4">Status Transaksi</th>
                  {session.role === "Admin Gudang" && <th className="p-3 text-right">Opsi Manajemen</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procurements.map((proc) => (
                  <tr key={proc.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-bold text-emerald-600">{proc.id}</td>
                    <td className="p-4 font-semibold text-slate-800">{proc.commodity}</td>
                    <td className="p-4 font-bold text-slate-700">{proc.rawMaterialToOrder.toLocaleString("id-ID")} Kg</td>
                    <td className="p-4 font-mono text-slate-600">Rp {proc.marketPricePerKg.toLocaleString("id-ID")}</td>
                    <td className="p-4 font-bold text-slate-800">Rp {(proc.totalPrice || (proc.rawMaterialToOrder * proc.marketPricePerKg)).toLocaleString("id-ID")}</td>
                    <td className="p-4 text-slate-600 font-mono">{proc.expectedDeliveryDate}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        proc.status === "Menunggu"
                          ? "bg-slate-100 text-slate-600 border border-slate-200"
                          : proc.status === "Disetujui"
                          ? "bg-blue-50 text-blue-800 border border-blue-200"
                          : proc.status === "Dikirim"
                          ? "bg-yellow-50 text-yellow-850 text-yellow-800 border border-yellow-200"
                          : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      }`}>
                        {proc.status}
                      </span>
                    </td>
                    {session.role === "Admin Gudang" && (
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {/* Status updating actions */}
                        {proc.status === "Menunggu" && (
                          <button
                            onClick={() => handleUpdateStatus(proc.id, "Disetujui")}
                            className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer inline-block"
                          >
                            Setujui
                          </button>
                        )}
                        {proc.status === "Disetujui" && (
                          <button
                            onClick={() => handleUpdateStatus(proc.id, "Dikirim")}
                            className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-300 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer inline-block"
                          >
                            Tandai Kirim
                          </button>
                        )}
                        {proc.status === "Dikirim" && (
                          <button
                            onClick={() => handleUpdateStatus(proc.id, "Selesai")}
                            className="bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 border border-purple-300 px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer inline-block"
                          >
                            Tandai Selesai
                          </button>
                        )}

                        {/* EDIT AND DELETE BUTTONS - REVISI 4 */}
                        <button
                          onClick={() => {
                            setSelectedPoDoc(proc);
                            setIsPoDocModalOpen(true);
                          }}
                          className="p-1.5 text-emerald-600 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 cursor-pointer inline-flex items-center"
                          title="Lihat PDF Dokumen PO"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => handleInitiateEdit(proc)}
                          className="p-1.5 text-slate-550 border border-slate-200 rounded-lg hover:border-slate-350 hover:bg-slate-100/50 text-slate-600 cursor-pointer inline-flex items-center"
                          title="Edit Kontrak PO"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeletePO(proc.id)}
                          className="p-1.5 text-rose-500 border border-slate-200 rounded-lg hover:border-rose-300 hover:bg-rose-50 cursor-pointer inline-flex items-center"
                          title="Hapus Kontrak PO"
                        >
                          <Trash size={12} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL PDF PREVIEW PO KEBUTUHAN TANI (Fitur D) */}
      {isPoDocModalOpen && selectedPoDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden animate-fade-in border border-slate-100">
            {/* Header controls bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center select-none">
              <div className="flex items-center space-x-2">
                <Warehouse className="text-emerald-400" size={18} />
                <span className="text-sm font-bold tracking-wide">Dokumen Nota Purchase Order Petani ({selectedPoDoc.id})</span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-1 px-3 bg-slate-850 hover:bg-emerald-600 hover:text-white border border-slate-650 hover:border-emerald-500 rounded-lg text-[11px] font-bold text-slate-355 cursor-pointer transition-all inline-flex items-center space-x-1"
                >
                  <Printer size={12} />
                  <span>Cetak Dokumen</span>
                </button>
                <button
                  onClick={() => setIsPoDocModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Print Area Sheet container */}
            <div className="p-8 max-h-[75vh] overflow-y-auto bg-slate-50">
              <div className="erp-document-print-area bg-white p-8 border border-slate-200 rounded-2xl shadow-sm font-sans mx-auto max-w-[690px] text-slate-800 text-[12px] leading-relaxed relative overflow-hidden">
                {/* Decorative watermarks or side accents */}
                <div className="absolute right-[-45px] top-[-10px] bg-emerald-50 border border-emerald-100 text-emerald-800 text-[9px] font-black uppercase font-mono py-1 px-12 rotate-45 tracking-widest opacity-80">
                  DRAFT PO
                </div>

                {/* Primary Invoice Header */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-slate-200">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider text-left">PT Agro Jabar (Perseroda)</h3>
                    <p className="text-[10px] text-slate-500 font-medium leading-normal text-left">
                      Divisi Produksi Makanan Beku & Logistik Bahan Baku<br />
                      Bandung Raya Unit Gudang Utama, Jawa Barat<br />
                      Email: procurement.gudang@agrojabar.co.id
                    </p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-emerald-600 font-extrabold text-[13px] uppercase tracking-wide">SURAT ORDER BAHAN BAKU TANI</h4>
                    <span className="inline-block mt-1.5 px-3 py-1 bg-slate-900 text-emerald-400 text-[10px] font-mono font-bold rounded">
                      REQID: {selectedPoDoc.id}
                    </span>
                  </div>
                </div>

                {/* Meta details block */}
                <div className="grid grid-cols-2 gap-6 py-6 text-[11px] border-b border-dashed border-slate-200">
                  <div className="space-y-1 text-left">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Penerima Kontrak / Kelompok Tani:</p>
                    <p className="font-bold text-slate-800 text-xs text-left">
                      {selectedPoDoc.notes?.includes("Poktan") || selectedPoDoc.notes?.includes("Tani")
                        ? selectedPoDoc.notes
                        : "Mitra Kelompok Tani Agro Jabar (Lembang/Ciwidey)"
                      }
                    </p>
                    <p className="text-slate-500 text-left">
                      Operator Logistik: {selectedPoDoc.operator?.username || session.username} ({selectedPoDoc.operator?.role || session.role})
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex justify-end space-x-1">
                      <span className="text-slate-400">Tanggal Pengajuan:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {selectedPoDoc.createdAt ? new Date(selectedPoDoc.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                      </span>
                    </div>
                    <div className="flex justify-end space-x-1">
                      <span className="text-slate-400">Estimasi Pengantaran:</span>
                      <span className="font-mono text-emerald-800 font-bold">
                        {selectedPoDoc.expectedDeliveryDate ? new Date(selectedPoDoc.expectedDeliveryDate).toLocaleDateString("id-ID", { dateStyle: "long" }) : "-"}
                      </span>
                    </div>
                    <div className="flex justify-end space-x-1">
                      <span className="text-slate-400">Status Dokumen:</span>
                      <span className="font-bold text-emerald-700 uppercase">{selectedPoDoc.status || "Aktif"}</span>
                    </div>
                  </div>
                </div>

                {/* Items details table */}
                <div className="py-6 space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Detail Pesanan Komoditas:</p>
                  <table className="w-full text-left font-sans text-[11px] border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5 w-12 text-center text-[10px]">No</th>
                        <th className="p-2.5 text-[10px]">Nama Komoditas / Spesifikasi</th>
                        <th className="p-2.5 text-right text-[10px]">Volume Kebutuhan (Kg)</th>
                        <th className="p-2.5 text-right text-[10px]">Harga/Kg</th>
                        <th className="p-2.5 text-right pr-4 text-[10px]">Total Harga</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedPoDoc.items && selectedPoDoc.items.length > 0
                        ? selectedPoDoc.items
                        : [
                            {
                              commodity: selectedPoDoc.commodity,
                              quantity: 1,
                              packageWeight: 1,
                              totalWeight: selectedPoDoc.rawMaterialToOrder,
                              marketPricePerKg: selectedPoDoc.marketPricePerKg || 8500,
                              totalPrice: selectedPoDoc.totalPrice || (selectedPoDoc.rawMaterialToOrder * (selectedPoDoc.marketPricePerKg || 8500))
                            }
                          ]
                      ).map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-800 text-left">
                            <div>{item.commodity} Segar</div>
                            {item.commodity === "Sayuran Mix" && (
                              <div className="mt-1 text-[10px]/[13px] font-normal text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-150">
                                <span className="font-bold text-teal-850">Proporsi Kemitraan Tani:</span>
                                <div className="flex flex-col gap-1 mt-0.5 text-[9px]">
                                  <div className="flex gap-4">
                                    <span>Wortel (40%): <strong className="font-mono text-slate-700">{getSayuranMixBreakdown(item.totalWeight).wortel} Kg</strong> {item.prices ? ` @ Rp ${item.prices.wortel?.toLocaleString("id-ID")}` : " @ Rp 8.500"}</span>
                                    <span>Buncis (30%): <strong className="font-mono text-slate-700">{getSayuranMixBreakdown(item.totalWeight).buncis} Kg</strong> {item.prices ? ` @ Rp ${item.prices.buncis?.toLocaleString("id-ID")}` : " @ Rp 11.000"}</span>
                                    <span>Jagung (30%): <strong className="font-mono text-slate-700">{getSayuranMixBreakdown(item.totalWeight).jagung} Kg</strong> {item.prices ? ` @ Rp ${item.prices.jagung?.toLocaleString("id-ID")}` : " @ Rp 7.000"}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-800 font-mono">{item.totalWeight?.toLocaleString("id-ID")} Kg</td>
                          <td className="p-2.5 text-right font-mono text-slate-650">Rp {item.marketPricePerKg?.toLocaleString("id-ID") || item.pricePerKg?.toLocaleString("id-ID")}</td>
                          <td className="p-2.5 text-right pr-4 font-bold font-mono text-emerald-800">Rp {item.totalPrice?.toLocaleString("id-ID")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Accumulators Subtotal Grand Total (Fitur D) */}
                <div className="py-4 border-t border-slate-200 flex flex-col items-end space-y-1.5 font-mono">
                  <div className="flex w-64 justify-between text-[11px] text-slate-500">
                    <span>Total Volume Pesanan:</span>
                    <span className="font-bold text-slate-700">
                      {(selectedPoDoc.items && selectedPoDoc.items.length > 0
                        ? selectedPoDoc.items.reduce((sum: number, it: any) => sum + (it.totalWeight || 0), 0)
                        : selectedPoDoc.rawMaterialToOrder
                      ).toLocaleString("id-ID")} Kg
                    </span>
                  </div>
                  <div className="flex w-64 justify-between text-xs font-bold pt-1 border-t border-slate-200 text-slate-900">
                    <span>Subtotal PO:</span>
                    <span>Rp {(selectedPoDoc.totalPrice || 0).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex w-64 justify-between text-[13px] font-extrabold text-emerald-850 pt-0.5">
                    <span>Grand Total:</span>
                    <span>Rp {(selectedPoDoc.totalPrice || 0).toLocaleString("id-ID")}</span>
                  </div>
                </div>

                {/* Sign-offs stamps area */}
                <div className="grid grid-cols-2 gap-4 pt-12 text-center text-[10px] leading-relaxed select-none">
                  <div className="space-y-12">
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Petugas Pemohon Logistik</p>
                    <div className="space-y-1">
                      <div className="mx-auto w-32 border-b border-slate-400"></div>
                      <p className="font-bold text-slate-700">{selectedPoDoc.operator?.username || session.username}</p>
                      <p className="text-slate-400 uppercase text-[9px]">DISETUJUI AGRO GUDANG</p>
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="text-[11px] text-slate-400 font-bold uppercase">Mitra / Kepala Kelompok Tani</p>
                    <div className="space-y-1">
                      <div className="mx-auto w-32 border-b border-slate-400 border-dashed"></div>
                      <p className="font-bold text-slate-750 font-bold text-slate-800">Verified Partner Stamp</p>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase">AKSEPTASI VERIFIKASI KONTRAK TANI</p>
                    </div>
                  </div>
                </div>

                {/* Tiny footnote */}
                <div className="text-center text-[9px] text-slate-400 pt-8 border-t border-slate-100 mt-10">
                  Dokumen FPPBB diterbitkan secara elektronik oleh PT Agro Jabar Perseroda Agro-system. Salinan sah tanpa tanda tangan basah.
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-2 border-t border-slate-150 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsPoDocModalOpen(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-emerald-400 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
