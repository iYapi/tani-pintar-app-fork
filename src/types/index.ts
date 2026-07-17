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
  | "kubis";

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
