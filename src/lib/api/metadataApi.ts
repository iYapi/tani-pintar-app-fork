import { Komoditas, FaseTanam } from "@/types";

export const COMMODITY_LIST = [
  { id: "cabai_merah" as Komoditas, label: "Cabai Merah", icon: "🌶️", desc: "Komoditas perishable tinggi dengan volatilitas harga ekstrem." },
  { id: "cabai_rawit" as Komoditas, label: "Cabai Rawit", icon: "🌶️", desc: "Sensitif terhadap cuaca ekstrem and curah hujan tinggi." },
  { id: "tomat" as Komoditas, label: "Tomat", icon: "🍅", desc: "Sangat rentan terhadap kerusakan mekanis dan pembusukan cepat." },
  { id: "bawang_merah" as Komoditas, label: "Bawang Merah", icon: "🧅", desc: "Membutuhkan proses pengeringan yang baik setelah panen." },
  { id: "kentang" as Komoditas, label: "Kentang", icon: "🥔", desc: "Lebih tahan lama, namun harga dipengaruhi panen raya sentra lain." },
  { id: "kubis" as Komoditas, label: "Kubis", icon: "🥬", desc: "Volume besar, berisiko tinggi saat oversupply di tingkat lokal." },
];

export const GROWTH_PHASE_LIST = [
  { id: "persiapan" as FaseTanam, label: "Persiapan Lahan", desc: "Tahap awal pembersihan dan pemupukan dasar." },
  { id: "awal_tanam" as FaseTanam, label: "Awal Tanam (Minggu 1-3)", desc: "Pemindahan bibit dan adaptasi tanaman." },
  { id: "vegetatif" as FaseTanam, label: "Pertumbuhan / Vegetatif", desc: "Fase pertumbuhan daun, batang, dan tunas baru." },
  { id: "generatif" as FaseTanam, label: "Pembungaan & Pembuahan", desc: "Pembentukan bunga dan calon buah." },
  { id: "siap_panen" as FaseTanam, label: "Siap Panen", desc: "Buah/hasil telah matang fisiologis dan siap dipetik." },
];
