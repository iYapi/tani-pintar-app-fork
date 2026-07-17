import { LahanProfile, Komoditas, FaseTanam, UserProfile } from "@/types";

// Helper keys untuk sessionStorage
const STORAGE_KEYS = {
  USER: "pending_register", // data user saat pendaftaran
  AUTH: "user_authenticated", // status auth
  LAHAN: "tani_pintar_lahan_profiles", // list profil lahan
};

// Komoditas Default
export const KOMODITAS_LIST = [
  { id: "cabai_merah" as Komoditas, label: "Cabai Merah", icon: "🌶️", desc: "Komoditas perishable tinggi dengan volatilitas harga ekstrem." },
  { id: "cabai_rawit" as Komoditas, label: "Cabai Rawit", icon: "🌶️", desc: "Sensitif terhadap cuaca ekstrem dan curah hujan tinggi." },
  { id: "tomat" as Komoditas, label: "Tomat", icon: "🍅", desc: "Sangat rentan terhadap kerusakan mekanis dan pembusukan cepat." },
  { id: "bawang_merah" as Komoditas, label: "Bawang Merah", icon: "🧅", desc: "Membutuhkan proses pengeringan yang baik setelah panen." },
  { id: "kentang" as Komoditas, label: "Kentang", icon: "🥔", desc: "Lebih tahan lama, namun harga dipengaruhi panen raya sentra lain." },
  { id: "kubis" as Komoditas, label: "Kubis", icon: "🥬", desc: "Volume besar, berisiko tinggi saat oversupply di tingkat lokal." },
];

// Fase Tanam Default
export const FASE_TANAM_LIST = [
  { id: "persiapan" as FaseTanam, label: "Persiapan Lahan", desc: "Tahap awal pembersihan dan pemupukan dasar." },
  { id: "awal_tanam" as FaseTanam, label: "Awal Tanam (Minggu 1-3)", desc: "Pemindahan bibit dan adaptasi tanaman." },
  { id: "vegetatif" as FaseTanam, label: "Pertumbuhan / Vegetatif", desc: "Fase pertumbuhan daun, batang, dan tunas baru." },
  { id: "generatif" as FaseTanam, label: "Pembungaan & Pembuahan", desc: "Pembentukan bunga dan calon buah." },
  { id: "siap_panen" as FaseTanam, label: "Siap Panen", desc: "Buah/hasil telah matang fisiologis dan siap dipetik." },
];

export const mockApi = {
  // Ambil Data Profil User yang sedang Login
  getCurrentUser: (): UserProfile | null => {
    if (typeof window === "undefined") return null;
    const auth = sessionStorage.getItem(STORAGE_KEYS.AUTH);
    const userStr = sessionStorage.getItem(STORAGE_KEYS.USER);
    if (auth === "true" && userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Simpan data user
  saveCurrentUser: (user: UserProfile) => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    sessionStorage.setItem(STORAGE_KEYS.AUTH, "true");
  },

  // Ambil semua Lahan terdaftar untuk User aktif
  getLahanList: (): LahanProfile[] => {
    if (typeof window === "undefined") return [];
    const user = mockApi.getCurrentUser();
    if (!user) return [];

    const lahanStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
    const allLahan: LahanProfile[] = lahanStr ? JSON.parse(lahanStr) : [];

    // Filter berdasarkan nomor HP / User ID saat ini
    return allLahan.filter((item) => item.userId === user.phoneNumber);
  },

  // Ambil detail satu Lahan berdasarkan ID
  getLahanById: (id: string): LahanProfile | null => {
    const list = mockApi.getLahanList();
    return list.find((item) => item.id === id) || null;
  },

  // Tambah Lahan Baru
  createLahan: (lahanData: Omit<LahanProfile, "id" | "userId" | "createdAt">): LahanProfile => {
    const user = mockApi.getCurrentUser();
    if (!user) throw new Error("Anda harus masuk untuk menambahkan lahan.");

    const newLahan: LahanProfile = {
      ...lahanData,
      id: "lahan-" + Math.random().toString(36).substr(2, 9),
      userId: user.phoneNumber,
      createdAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const lahanStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
      const allLahan: LahanProfile[] = lahanStr ? JSON.parse(lahanStr) : [];
      allLahan.push(newLahan);
      localStorage.setItem(STORAGE_KEYS.LAHAN, JSON.stringify(allLahan));
    }

    return newLahan;
  },

  // Edit Lahan yang sudah ada
  updateLahan: (id: string, updateData: Partial<Omit<LahanProfile, "id" | "userId" | "createdAt">>): LahanProfile => {
    const user = mockApi.getCurrentUser();
    if (!user) throw new Error("Anda harus masuk untuk memperbarui lahan.");

    if (typeof window !== "undefined") {
      const lahanStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
      const allLahan: LahanProfile[] = lahanStr ? JSON.parse(lahanStr) : [];

      const index = allLahan.findIndex((item) => item.id === id && item.userId === user.phoneNumber);
      if (index === -1) throw new Error("Lahan tidak ditemukan atau Anda tidak berwenang.");

      allLahan[index] = {
        ...allLahan[index],
        ...updateData,
      };

      localStorage.setItem(STORAGE_KEYS.LAHAN, JSON.stringify(allLahan));
      return allLahan[index];
    }

    throw new Error("Gagal memperbarui: Browser storage tidak tersedia.");
  },

  // Hapus Lahan
  deleteLahan: (id: string): boolean => {
    const user = mockApi.getCurrentUser();
    if (!user) return false;

    if (typeof window !== "undefined") {
      const lahanStr = localStorage.getItem(STORAGE_KEYS.LAHAN);
      const allLahan: LahanProfile[] = lahanStr ? JSON.parse(lahanStr) : [];

      const filtered = allLahan.filter((item) => !(item.id === id && item.userId === user.phoneNumber));
      const deleted = filtered.length !== allLahan.length;

      localStorage.setItem(STORAGE_KEYS.LAHAN, JSON.stringify(filtered));
      return deleted;
    }
    return false;
  },

  // Mock Info Cuaca BMKG berdasarkan Koordinat Lahan
  getWeatherByCoords: (lat: number, lng: number) => {
    // Generate data cuaca semi-random tapi stabil berdasarkan koordinat
    const seed = Math.abs(Math.sin(lat + lng));
    const isRainy = seed > 0.4;
    const temp = Math.round(23 + seed * 8); // 23 - 31 C
    const humidity = Math.round(65 + (1 - seed) * 30); // 65 - 95%

    return {
      status: isRainy ? "Hujan Ringan" : "Cerah Berawan",
      icon: isRainy ? "🌧️" : "⛅",
      temp: `${temp}°C`,
      humidity: `${humidity}%`,
      windSpeed: "12 km/jam",
      suggestion: isRainy
        ? "Waspada kelembaban tinggi memicu jamur. Tunda pemupukan tabur."
        : "Kondisi ideal untuk penyemprotan nutrisi dan penyiangan gulma.",
    };
  },

  // Mock Harga Pasar BAPANAS berdasarkan Komoditas
  getPriceTrendByCommodity: (commodity: Komoditas) => {
    const prices: Record<Komoditas, { current: number; previous: number; status: "naik" | "turun" | "stabil"; label: string }> = {
      cabai_merah: { current: 32000, previous: 28000, status: "naik", label: "Cabai Merah Keriting" },
      cabai_rawit: { current: 48000, previous: 55000, status: "turun", label: "Cabai Rawit Merah" },
      tomat: { current: 12000, previous: 12000, status: "stabil", label: "Tomat Sayur" },
      bawang_merah: { current: 35000, previous: 32500, status: "naik", label: "Bawang Merah Brebes" },
      kentang: { current: 16000, previous: 17500, status: "turun", label: "Kentang Granola" },
      kubis: { current: 6000, previous: 8000, status: "turun", label: "Kubis / Kol" },
    };

    const data = prices[commodity];
    const diff = data.current - data.previous;
    const pct = ((diff / data.previous) * 100).toFixed(1);

    return {
      ...data,
      diffText: diff > 0 ? `+Rp${diff.toLocaleString()}` : diff < 0 ? `-Rp${Math.abs(diff).toLocaleString()}` : "Rp0",
      percentage: `${pct}%`,
      marketStatus: diff < 0 ? "Oversupply Wilayah" : "Aman / Permintaan Tinggi",
    };
  }
};
