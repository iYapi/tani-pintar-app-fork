import { Komoditas } from "@/types";

export const KOMODITAS_LIST: { id: Komoditas; label: string; icon: string }[] = [
  { id: "cabai_merah", label: "Cabai Merah", icon: "🌶️" },
  { id: "cabai_rawit", label: "Cabai Rawit", icon: "🔥" },
  { id: "tomat", label: "Tomat", icon: "🍅" },
  { id: "bawang_merah", label: "Bawang Merah", icon: "🧅" },
  { id: "kentang", label: "Kentang", icon: "🥔" },
  { id: "kubis", label: "Kubis", icon: "🥬" },
];

export const FASE_TANAM_LIST = [
  { id: "persiapan", label: "Persiapan Lahan", desc: "Pengolahan tanah, pemupukan dasar, dan pemasangan mulsa" },
  { id: "awal_tanam", label: "Awal Tanam", desc: "Pemindahan bibit ke bedengan (umur 1-14 HST)" },
  { id: "vegetatif", label: "Vegetatif", desc: "Pertumbuhan batang, daun, dan pembentukan cabang (15-35 HST)" },
  { id: "generatif", label: "Generatif", desc: "Pembungaan dan pembentukan buah (36-60 HST)" },
  { id: "siap_panen", label: "Siap Panen", desc: "Buah matang optimal dan siap dipetik (> 60 HST)" },
];

export const mockApi = {
  getCurrentUser() {
    if (typeof window !== "undefined") {
      const auth = sessionStorage.getItem("user_authenticated");
      if (auth === "true") {
        return {
          fullName: "Petani Sukses",
          phoneNumber: "81234567890",
          role: "farmer",
        };
      }
    }
    return null;
  },

  getLahanList() {
    return [];
  },

  getWeatherByCoords(lat: number, lng: number) {
    // Generate simple deterministic weather based on coordinates
    const val = Math.abs(lat + lng) % 3;
    if (val < 1) {
      return {
        icon: "☀️",
        status: "Cerah",
        temp: "31°C",
        humidity: "65%",
        suggestion: "Suhu cukup tinggi, pastikan kecukupan air tanah dan lakukan penyiraman ekstra pada sore hari.",
      };
    } else if (val < 2) {
      return {
        icon: "⛅",
        status: "Cerah Berawan",
        temp: "29°C",
        humidity: "72%",
        suggestion: "Kondisi sangat baik untuk pemupukan daun dan penyemprotan rutin jika diperlukan.",
      };
    } else {
      return {
        icon: "🌧️",
        status: "Hujan Ringan",
        temp: "26°C",
        humidity: "88%",
        suggestion: "Hujan terdeteksi. Bersihkan drainase bedengan untuk mencegah genangan air dan risiko busuk akar.",
      };
    }
  },

  getPriceTrendByCommodity(commodity: string) {
    const com = KOMODITAS_LIST.find((c) => c.id === commodity) || KOMODITAS_LIST[0];
    const prices: Record<string, { current: number; status: "naik" | "turun" | "stabil"; diffText: string; percentage: string; marketStatus: string }> = {
      cabai_merah: { current: 34500, status: "naik", diffText: "+Rp1.200", percentage: "+3.5%", marketStatus: "Aman" },
      cabai_rawit: { current: 48000, status: "naik", diffText: "+Rp3.500", percentage: "+7.8%", marketStatus: "Waspada Oversupply" },
      tomat: { current: 12000, status: "turun", diffText: "-Rp800", percentage: "-6.2%", marketStatus: "Oversupply Regional" },
      bawang_merah: { current: 28000, status: "stabil", diffText: "Rp0", percentage: "0.0%", marketStatus: "Aman" },
      kentang: { current: 16500, status: "naik", diffText: "+Rp500", percentage: "+3.1%", marketStatus: "Aman" },
      kubis: { current: 8200, status: "turun", diffText: "-Rp400", percentage: "-4.6%", marketStatus: "Oversupply Regional" },
    };

    const res = prices[commodity] || { current: 20000, status: "stabil", diffText: "Rp0", percentage: "0.0%", marketStatus: "Aman" };
    return {
      label: com.label,
      ...res,
    };
  },
};
