import { Komoditas } from "@/types";

export const getPriceTrendByCommodity = (commodity: Komoditas) => {
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
};
