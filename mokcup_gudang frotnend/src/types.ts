/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CommodityType = 'Wortel' | 'Buncis' | 'Jagung Manis' | 'Sayuran Mix';

export type PackagingType = '1 Kg' | '2.5 Kg' | 'Custom';

export type OrderStatus = 'Menunggu Konfirmasi' | 'Pesanan Diterima' | 'Diproses' | 'Siap Produksi' | 'Menunggu Produksi' | 'Selesai' | 'Dikirim';

export type RawMaterialStatus = 'Menunggu' | 'Disetujui' | 'Dikirim' | 'Selesai';

export interface SBUOrderItem {
  commodity: CommodityType;
  packaging: string; // e.g., "Pouch Plastik 1 Kg", "Standing Pouch 2.5 Kg", "Karton Box 10 Kg", "Custom Box"
  packageWeight: number; // weight in Kg
  quantity: number; // packaging quantity
  totalWeight: number; // quantity * packageWeight (in Kg)
}

export interface SBUOrder {
  id: string; // "ORD-XXXX"
  orderDate: string;
  commodity: CommodityType | string;
  packaging: string;
  packageWeight: number; // in kg (e.g., 1, 2.5, or custom)
  quantity: number; // number of packages
  totalWeight: number; // quantity * packageWeight (in kg)
  status: OrderStatus;
  createdAt: string;
  items?: SBUOrderItem[];
  customer?: string;
  source?: string; // e.g. "E-Commerce (Shopee)", "E-Commerce (Tokopedia)"
  driverName?: string;
  vehicleNumber?: string;
  dispatchedAt?: string;
}

export interface RawMaterialProcurement {
  id: string; // "REQ-XXXX"
  commodity: CommodityType;
  neededWeight: number; // jumlah produk jadi / (1 - shrinkage)
  estimatedShrinkage: number; // weight in kg
  rawMaterialToOrder: number; // total raw material needed to order
  marketPricePerKg: number;
  totalPrice: number;
  expectedDeliveryDate: string;
  notes: string;
  status: RawMaterialStatus;
  createdAt: string;
}

export interface FarmerDelivery {
  id: string; // "RCV-XXXX"
  procurementId: string;
  farmerName: string;
  commodity: CommodityType;
  sentWeight: number; // weight shipped by farmer (kg)
  shippingDate: string;
  photoUrl: string; // dataURI or mock path
  photoMetadata: {
    timestamp: string;
    deviceInfo: string;
    geolocation?: string;
  };
  scaledWeightWarehouse?: number; // weight after warehouse re-scale
  scaleStatus?: 'Pending' | 'Sesuai' | 'Kelebihan' | 'Kekurangan';
  scaleDifference?: number;
  scaleNotes?: string;
  status: 'Menunggu Validasi' | 'Diterima' | 'Diproses QC' | 'Ditolak';
  createdAt: string;
}

export interface QCChecklist {
  id: string; // "QC-XXXX"
  deliveryId: string;
  commodity: CommodityType;
  checkedWeight: number;
  // Criteria
  warnaCerah: boolean; // Must be true for pass
  teksturPadat: boolean; // Must be true for pass
  tidakBerlendir: boolean; // Must be true (if false, direct reject)
  tidakAdaBercakBusuk: boolean; // Must be true (if false, direct reject)
  tidakAdaBagianRusak: boolean; // Must be true (if false, direct reject)
  isReject: boolean;
  rejectWeight: number; // reject amount (kg)
  rejectItems?: {
    commodity: CommodityType;
    rejectWeight: number;
    reason: string;
  }[];
  passedWeight: number; // quantity passed to production
  passedPercentage: number;
  qcNotes: string;
  photoUrl: string; // live camera checklist photo
  checkedBy: string;
  checkedAt: string;
}

export interface ProductionJob {
  id: string; // "PROD-XXXX"
  orderId?: string; // correlated SBU Order if any
  commodity: CommodityType;
  targetWeight: number; // target finished frozen vegetable weight (kg)
  allocatedRawMaterial: number; // calculated raw material allocated (kg)
  date: string;
  startTime: string;
  endTime: string;
  pic: string;
  operatorNames: string[];
  // Alur Produksi progress
  currentStepIndex: number; // index of steps completed
  steps: string[]; // dynamic steps based on vegetable type
  packaging: {
    packageType: PackagingType;
    unitWeight: number;
    completedUnits: number;
    isVacuumChecked: boolean;
    vacuumCheckedBy: string;
    isStoredInFreezer: boolean;
    storedAt?: string;
  };
  yieldWeight: number; // final packed output weight (kg)
  yieldItems?: {
    commodity: string;
    packageType: string;
    unitWeight: number;
    completedUnits: number;
    totalWeight: number;
  }[];
  status: 'Jadwal' | 'Pencucian/Pemotongan' | 'Blanching/Perendaman' | 'Penirisan/Packaging' | 'Selesai';
  createdAt: string;
}

export interface HppRecord {
  id: string; // "HPP-XXXX"
  productionJobId: string;
  commodity: CommodityType;
  productionYield: number; // kg of finished vegetable
  // Cost components
  rawMaterialCost: number; // total farmer purchase cost
  laborCost: number; // direct production labor
  operationalCost: number; // electricity, water, steam
  packagingCost: number; // vacuum pouch rolls, boxes
  depreciationCost: number; // IQF freezer, sorting machine wear
  distributionCost: number; // chiller truck fuel, drivers
  totalCost: number;
  hppPerKg: number; // totalCost / productionYield
  calculatedAt: string;
}

export interface AuditLog {
  id: string;
  username: string;
  role: string;
  action: string;
  details: string;
  timestamp: string;
  ipAddress: string;
}

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  role: 'Admin Gudang' | 'Kepala Produksi' | 'Pimpinan';
  token: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error';
  timestamp: string;
  read: boolean;
}
