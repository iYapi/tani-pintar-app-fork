export type UserRole = "farmer" | "buyer" | "admin";

export interface UserProfile {
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isWaVerified?: boolean;
}

export type FaseTanam = 
  | "persiapan"      // Persiapan Lahan
  | "awal_tanam"     // Awal Tanam
  | "vegetatif"      // Pertumbuhan / Vegetatif
  | "generatif"      // Pembungaan & Pembuahan / Generatif
  | "siap_panen";    // Siap Panen

export type Komoditas =
  | "cabai_merah"
  | "cabai_rawit"
  | "tomat"
  | "bawang_merah"
  | "kentang"
  | "kubis"
  | string;

export interface LahanProfile {
  id: string;
  userId: string; // Hubungan ke user/nomor HP
  namaLahan: string;
  luasLahan: number; // Dalam Hektar (Ha)
  komoditas: Komoditas;
  faseTanam: FaseTanam;
  koordinat: {
    lat: number;
    lng: number;
  };
  alamat: string;
  tanggalTanam: string; // ISO date string
  createdAt: string; // ISO date string
}

export type HarvestPlanStatus = "DRAFT" | "PLANNED" | "READY" | "HARVESTED";
export type VolumeUnit = "kg" | "ton" | "kwintal";

export interface HarvestPlan {
  id: string;
  farmerProfileId: string;
  landId?: string | null;
  commodity: Komoditas;
  estimatedVolume: number;
  volumeUnit: VolumeUnit;
  readyToHarvestDate: string; // ISO date
  actualVolume?: number | null;
  status: HarvestPlanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type OversupplyStatus = "AMAN" | "WASPADA" | "OVERSUPPLY";

export interface HarvestTimingData {
  projectedPrice: number;
  projectedPriceDate: string; // ISO date
  oversupplyStatus: OversupplyStatus;
  suggestedHarvestDate: string; // ISO date
  confidence: number;
  projectedPriceTrend: { date: string; price: number }[]; // For the chart
}

export type RecommendationType = "HARVEST_TIMING" | "SELL_DESTINATION" | "PRESERVATION" | "WASTE_RECOVERY";

export interface Recommendation {
  id: string;
  harvestPlanId: string;
  type: RecommendationType;
  jsonData: HarvestTimingData | any;
  naturalLanguageText: string;
  modelVersion: string;
  isRead: boolean;
  createdAt: string;
}

// B2B Buyer Module Types
export type BuyerBusinessType = "PASAR_INDUK" | "KOPERASI" | "RESTORAN" | "PABRIK_OLAHAN" | "LAINNYA";
export type DemandListingStatus = "OPEN" | "FULFILLED" | "CLOSED" | "CANCELLED";
export type SaleListingStatus = "OPEN" | "MATCHED" | "CLOSED" | "CANCELLED";

export interface BuyerProfile {
  id: string;
  userId: string;
  businessName: string;
  businessType: BuyerBusinessType;
  locationName: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DemandListing {
  id: string;
  buyerProfileId: string;
  commodity: Komoditas;
  volume: number;
  unit: VolumeUnit;
  locationName: string;
  latitude?: number;
  longitude?: number;
  maxPricePerUnit?: number;
  deadline: string; // ISO date
  description?: string;
  status: DemandListingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SaleListing {
  id: string;
  farmerProfileId: string;
  harvestPlanId?: string;
  commodity: Komoditas;
  volume: number;
  unit: VolumeUnit;
  locationName: string;
  latitude?: number;
  longitude?: number;
  minPricePerUnit?: number;
  availableDate: string; // ISO date
  isOversupply: boolean;
  status: SaleListingStatus;
  createdAt: string;
  updatedAt: string;
}

export type NegotiationStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "COUNTERED";

export interface NegotiationBid {
  id: string;
  demandId: string;
  saleId: string;
  buyerProfileId: string;
  farmerProfileId: string;
  bidPrice: number;
  status: NegotiationStatus;
  createdAt: string;
}
