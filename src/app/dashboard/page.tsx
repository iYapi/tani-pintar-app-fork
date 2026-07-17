"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  Leaf,
  Sprout,
  Briefcase,
  LogOut,
  MapPin,
  Calendar,
  Layers,
  Thermometer,
  Droplets,
  TrendingUp,
  Map,
  Compass,
  AlertCircle,
  CheckCircle,
  Plus,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  ChevronRight,
  Activity,
} from "lucide-react";
import * as authApi from "@/lib/api/authApi";
import * as landApi from "@/lib/api/landApi";
import { getWeatherByCoords } from "@/lib/api/weatherApi";
import { getPriceTrendByCommodity } from "@/lib/api/priceApi";
import { COMMODITY_LIST, GROWTH_PHASE_LIST } from "@/lib/api/metadataApi";
import { harvestPlanApi } from "@/lib/api/harvestPlanApi";
import { LahanProfile, Komoditas, FaseTanam, UserProfile, HarvestPlan, Recommendation } from "@/types";
import PriceChart from "@/components/charts/PriceChart";
import RecommendationCard from "@/components/cards/RecommendationCard";

// Load LahanMap secara dinamis (ssr: false) untuk mencegah error Leaflet pada Server-Side Rendering
const LahanMap = dynamic(() => import("@/components/maps/LahanMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-muted/40 animate-pulse rounded-2xl flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span>Memuat peta interaktif...</span>
    </div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lahanList, setLahanList] = useState<LahanProfile[]>([]);
  const [activeLahanIndex, setActiveLahanIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Harvest Plan State
  const [harvestPlan, setHarvestPlan] = useState<HarvestPlan | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [sellRecommendation, setSellRecommendation] = useState<Recommendation | null>(null);
  const [isGeneratingRec, setIsGeneratingRec] = useState(false);

  // Ref & State untuk Geser Lahan Horizontal
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    if (clientWidth === 0) return;

    // Karena kartu berukuran lebar penuh (w-full), pembagi adalah clientWidth
    const index = Math.round(scrollLeft / clientWidth);

    // Hanya update state jika indeks benar-benar bergeser/berubah
    if (index !== activeDot && index >= 0 && index < lahanList.length) {
      setActiveDot(index);
      setActiveLahanIndex(index);
    }
  };

  // State untuk Onboarding Wizard
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State Lahan Baru
  const [namaLahan, setNamaLahan] = useState("");
  const [luasLahan, setLuasLahan] = useState("");
  const [komoditas, setKomoditas] = useState<Komoditas>("cabai_merah");
  const [faseTanam, setFaseTanam] = useState<FaseTanam>("persiapan");
  const [koordinat, setKoordinat] = useState({ lat: -7.2504, lng: 112.7688 });
  const [alamat, setAlamat] = useState("");
  const [tanggalTanam, setTanggalTanam] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Muat status user dan lahan saat inisialisasi
  const loadData = () => {
    setIsLoading(true);
    const currentUser = authApi.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      const list = landApi.getLandList();
      setLahanList(list);
      
      const targetActiveIndex = Math.min(activeLahanIndex, list.length - 1 >= 0 ? list.length - 1 : 0);
      setActiveLahanIndex(targetActiveIndex);

      // Fetch Harvest Plans
      const activeLahan = list[targetActiveIndex];
      if (activeLahan) {
        const plansRes = harvestPlanApi.getHarvestPlans(activeLahan.id);
        if (plansRes.data.length > 0) {
          const latestPlan = plansRes.data[0];
          setHarvestPlan(latestPlan);
          
          const recsRes = harvestPlanApi.getRecommendationsByPlanId(latestPlan.id, "HARVEST_TIMING");
          const sellRecsRes = harvestPlanApi.getRecommendationsByPlanId(latestPlan.id, "SELL_DESTINATION");

          if (recsRes.data.length > 0) {
            setRecommendation(recsRes.data[0]);
          } else {
            setRecommendation(null);
          }

          if (sellRecsRes.data.length > 0) {
            setSellRecommendation(sellRecsRes.data[0]);
          } else {
            setSellRecommendation(null);
          }

          if (recsRes.data.length > 0 || sellRecsRes.data.length > 0) {
            setIsGeneratingRec(false);
          } else {
            setIsGeneratingRec(true);
          }
        } else {
          setHarvestPlan(null);
          setRecommendation(null);
          setSellRecommendation(null);
          setIsGeneratingRec(false);
        }
      }

      // Jika petani tidak punya lahan, buka mode onboarding wizard
      if (currentUser.role === "farmer" && list.length === 0) {
        setIsOnboarding(true);
      } else {
        setIsOnboarding(false);
      }
    } else {
      router.push("/register");
    }
    setIsLoading(false);
  };

  // Poll for recommendation if it's currently generating
  useEffect(() => {
    if (isGeneratingRec && harvestPlan) {
      const interval = setInterval(() => {
        const recsRes = harvestPlanApi.getRecommendationsByPlanId(harvestPlan.id, "HARVEST_TIMING");
        const sellRecsRes = harvestPlanApi.getRecommendationsByPlanId(harvestPlan.id, "SELL_DESTINATION");
        if (recsRes.data.length > 0 && sellRecsRes.data.length > 0) {
          setRecommendation(recsRes.data[0]);
          setSellRecommendation(sellRecsRes.data[0]);
          setIsGeneratingRec(false);
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isGeneratingRec, harvestPlan]);

  useEffect(() => {
    loadData();
  }, [router, activeLahanIndex]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    router.push("/register");
  };

  // Navigasi Langkah Wizard Onboarding Lahan
  const nextStep = () => {
    setFormError("");
    if (wizardStep === 1) {
      if (!namaLahan.trim()) {
        setFormError("Nama lahan wajib diisi.");
        return;
      }
      if (!luasLahan || parseFloat(luasLahan) <= 0) {
        setFormError("Luas lahan harus berupa angka lebih besar dari 0.");
        return;
      }
      setWizardStep(2);
    } else if (wizardStep === 2) {
      if (!alamat.trim()) {
        setFormError("Pilihlah lokasi lahan Anda di peta.");
        return;
      }
      setWizardStep(3);
    }
  };

  const prevStep = () => {
    setFormError("");
    setWizardStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit Lahan Onboarding
  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wizardStep !== 3) return;

    setIsSubmitting(true);
    setFormError("");

    try {
      // Simulasikan delay network
      await new Promise((resolve) => setTimeout(resolve, 1500));

      landApi.createLand({
        namaLahan,
        luasLahan: parseFloat(luasLahan),
        komoditas,
        faseTanam,
        koordinat,
        alamat,
        tanggalTanam,
      });

      // Reset Form
      setNamaLahan("");
      setLuasLahan("");
      setWizardStep(1);

      // Refresh Data
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data lahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full bg-card/85 backdrop-blur-md sticky top-0 border-b border-border/50 px-4 py-3 z-[100]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-foreground">
              Tani Pintar
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full border border-primary/10 capitalize">
              {user.role === "farmer" ? "Petani" : "Buyer B2B"}
            </span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">
        {/* ================= MODE: FARMER ONBOARDING WIZARD ================= */}
        {user.role === "farmer" && isOnboarding && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Greeting Onboarding */}
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-extrabold text-foreground tracking-tight">
                Halo, {user.fullName}! 👋
              </h2>
              <p className="text-xs text-muted-foreground">
                Mari lengkapi profil lahan Anda untuk mulai mengaktifkan
                kalkulator harga & cuaca.
              </p>
            </div>

            {/* Stepper Progress Indicator */}
            <div className="bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    wizardStep >= 1
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  1
                </span>
                <span className="text-xs font-semibold hidden xs:block">
                  Detail Lahan
                </span>
              </div>
              <div className="h-0.5 w-8 bg-border"></div>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    wizardStep >= 2
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </span>
                <span className="text-xs font-semibold hidden xs:block">
                  Lokasi Map
                </span>
              </div>
              <div className="h-0.5 w-8 bg-border"></div>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    wizardStep >= 3
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                <span className="text-xs font-semibold hidden xs:block">
                  Konfirmasi
                </span>
              </div>
            </div>

            {/* Wizard Form Area */}
            <div className="bg-card rounded-3xl p-5 shadow-lg border border-border/50 relative overflow-hidden">
              {formError && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Langkah 1: Identitas Lahan */}
              {wizardStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-primary" />
                    Langkah 1: Identitas Lahan
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1">
                        Nama Lahan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Sawah Caringin Utama"
                        value={namaLahan}
                        onChange={(e) => setNamaLahan(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-foreground/80 mb-1">
                          Luas Lahan (Hektar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Contoh: 1.5"
                          value={luasLahan}
                          onChange={(e) => setLuasLahan(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-foreground/80 mb-1">
                          Tanggal Mulai Tanam
                        </label>
                        <input
                          type="date"
                          value={tanggalTanam}
                          onChange={(e) => setTanggalTanam(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-2">
                        Pilih Komoditas Utama
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {COMMODITY_LIST.map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => setKomoditas(item.id)}
                            className={`p-3 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 min-h-[44px] ${
                              komoditas === item.id
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border bg-background/35 text-foreground hover:border-muted-foreground/30"
                            }`}
                          >
                            <span className="text-xl">{item.icon}</span>
                            <span className="font-bold text-xs text-foreground mt-0.5">
                              {item.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-2">
                        Fase Tanam Saat Ini
                      </label>
                      <select
                        value={faseTanam}
                        onChange={(e) =>
                          setFaseTanam(e.target.value as FaseTanam)
                        }
                        className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      >
                        {GROWTH_PHASE_LIST.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.label} — {item.desc}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full flex items-center justify-center gap-1 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-2xl shadow-sm hover:bg-primary/95 transition-all min-h-[44px]"
                    >
                      <span>Lanjut Pilih Lokasi</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Langkah 2: Peta Lokasi */}
              {wizardStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <Map className="w-5 h-5 text-primary" />
                    Langkah 2: Tentukan Lokasi Lahan
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    Gunakan pencarian alamat di bawah atau seret penanda pin
                    langsung ke posisi lahan pertanian Anda.
                  </p>

                  <LahanMap
                    initialCoords={koordinat}
                    initialAlamat={alamat}
                    onChange={(data) => {
                      setKoordinat({ lat: data.lat, lng: data.lng });
                      setAlamat(data.alamat);
                      setFormError("");
                    }}
                  />

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex items-center justify-center gap-1 border border-border bg-background hover:bg-muted text-foreground font-semibold py-3.5 px-4 rounded-2xl transition-all min-h-[44px]"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali</span>
                    </button>

                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex items-center justify-center gap-1 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-2xl shadow-sm hover:bg-primary/95 transition-all min-h-[44px]"
                    >
                      <span>Tinjau Lahan</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Langkah 3: Konfirmasi Ringkasan */}
              {wizardStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary" />
                    Langkah 3: Konfirmasi Data Lahan
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Periksa kembali data profil lahan Anda sebelum disimpan ke
                    sistem.
                  </p>

                  {/* Summary Cards */}
                  <div className="space-y-3 bg-muted/40 p-4 rounded-2xl border border-border">
                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground font-semibold">
                        Nama Lahan:
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {namaLahan}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground font-semibold">
                        Luas Lahan:
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {luasLahan} Hektar (Ha)
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground font-semibold">
                        Komoditas:
                      </span>
                      <span className="text-xs font-bold text-foreground capitalize flex items-center gap-1">
                        {COMMODITY_LIST.find((k) => k.id === komoditas)?.icon}
                        {COMMODITY_LIST.find((k) => k.id === komoditas)?.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground font-semibold">
                        Fase Tanam:
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {GROWTH_PHASE_LIST.find((f) => f.id === faseTanam)?.label}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-border/50">
                      <span className="text-xs text-muted-foreground font-semibold">
                        Tanggal Tanam:
                      </span>
                      <span className="text-xs font-bold text-foreground flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        {tanggalTanam}
                      </span>
                    </div>

                    <div className="pt-1">
                      <span className="text-xs text-muted-foreground font-semibold block mb-0.5">
                        Alamat / Pin Koordinat:
                      </span>
                      <p className="text-[11px] font-medium text-foreground leading-relaxed">
                        📍 {alamat}
                      </p>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        ({koordinat.lat.toFixed(5)}, {koordinat.lng.toFixed(5)})
                      </span>
                    </div>
                  </div>

                  <form
                    onSubmit={handleOnboardingSubmit}
                    className="grid grid-cols-2 gap-3 pt-2"
                  >
                    <button
                      type="button"
                      onClick={prevStep}
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-1 border border-border bg-background hover:bg-muted text-foreground font-semibold py-3.5 px-4 rounded-2xl transition-all min-h-[44px] disabled:opacity-50"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-1 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-2xl shadow-sm hover:bg-primary/95 transition-all min-h-[44px] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Simpan Lahan</span>
                          <CheckCircle className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ================= MODE: FARMER MAIN DASHBOARD (LANDS REGISTERED) ================= */}
        {user.role === "farmer" && !isOnboarding && lahanList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header Greeting */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-foreground mt-0.5">
                Halo, {user.fullName}! 👋
              </h2>

              <button
                onClick={() => router.push("/lahan")}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 border border-primary/20 hover:bg-primary/15 text-primary font-bold px-3.5 py-2.5 rounded-2xl transition-all min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Lahan</span>
              </button>
            </div>

            {/* Carousel atau Daftar Ringkasan Lahan (F1 Core) */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Lahan Anda ({lahanList.length})
              </h3>

              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none scroll-smooth"
              >
                {lahanList.map((lahan) => {
                  const km = COMMODITY_LIST.find(
                    (k) => k.id === lahan.komoditas,
                  );
                  const ft = GROWTH_PHASE_LIST.find(
                    (f) => f.id === lahan.faseTanam,
                  );
                  return (
                    <div
                      key={lahan.id}
                      className="w-full flex-shrink-0 snap-center bg-card rounded-3xl p-5 border border-border/85 shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all duration-300 flex flex-col gap-4 relative overflow-hidden"
                    >
                      {/* Badge Komoditas */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl p-2 bg-muted rounded-2xl">
                            {km?.icon}
                          </div>
                          <div>
                            <h4 className="font-black text-base text-foreground leading-tight">
                              {lahan.namaLahan}
                            </h4>
                            <span className="text-xs font-semibold text-muted-foreground uppercase block mt-0.5">
                              Komoditas: {km?.label}
                            </span>
                          </div>
                        </div>

                        <span className="text-xs font-bold bg-secondary text-secondary-foreground border border-primary/15 px-3 py-1 rounded-full capitalize">
                          {ft?.label}
                        </span>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                            Luas Lahan
                          </span>
                          <span className="font-bold text-foreground">
                            {lahan.luasLahan} Hektar (Ha)
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase block">
                            Mulai Tanam
                          </span>
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            {lahan.tanggalTanam}
                          </span>
                        </div>
                      </div>

                      {/* Alamat Lahan */}
                      <div className="flex gap-1.5 items-start text-xs leading-relaxed text-muted-foreground">
                        <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{lahan.alamat}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Indikator Slide/Scroll Lahan (Selalu menampilkan tepat 2 indikator sesuai status scroll) */}
              {lahanList.length > 1 && (
                <div className="flex justify-center gap-2 mt-3 mb-1">
                  {/* Indikator Kiri: Aktif/Tebal jika belum berada di lahan terakhir */}
                  <button
                    onClick={() => {
                      const targetIdx = 0;
                      setActiveDot(targetIdx);
                      setActiveLahanIndex(targetIdx);
                      if (
                        scrollRef.current &&
                        scrollRef.current.children[targetIdx]
                      ) {
                        scrollRef.current.children[targetIdx].scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                          inline: "center",
                        });
                      }
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none min-h-0 bg-primary ${
                      activeDot < lahanList.length - 1 ? "w-4" : "w-1.5"
                    }`}
                    style={{
                      opacity: activeDot < lahanList.length - 1 ? 1 : 0.25,
                    }}
                    aria-label="Ke lahan pertama"
                  />

                  {/* Indikator Kanan: Aktif/Tebal jika sudah berada di lahan terakhir */}
                  <button
                    onClick={() => {
                      const targetIdx = lahanList.length - 1;
                      setActiveDot(targetIdx);
                      setActiveLahanIndex(targetIdx);
                      if (
                        scrollRef.current &&
                        scrollRef.current.children[targetIdx]
                      ) {
                        scrollRef.current.children[targetIdx].scrollIntoView({
                          behavior: "smooth",
                          block: "nearest",
                          inline: "center",
                        });
                      }
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none min-h-0 bg-primary ${
                      activeDot === lahanList.length - 1 ? "w-4" : "w-1.5"
                    }`}
                    style={{
                      opacity: activeDot === lahanList.length - 1 ? 1 : 0.25,
                    }}
                    aria-label="Ke lahan terakhir"
                  />
                </div>
              )}
            </div>

            {/* ================= INTEGRASI EXTRA: CUACA & HARGA LAHAN SECARA DINAMIS ================= */}
            {lahanList.length > 0 && (
              <div className="space-y-4">
                {/* Selector Tab Lahan (Hanya tampil jika ada lebih dari 1 lahan) */}
                {lahanList.length > 1 && (
                  <div className="bg-card rounded-2xl p-3.5 border border-border shadow-sm space-y-2">
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      📍 Tampilkan Data Lahan:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {lahanList.map((lahan, idx) => {
                        const km = COMMODITY_LIST.find(
                          (k) => k.id === lahan.komoditas,
                        );
                        return (
                          <button
                            key={lahan.id}
                            type="button"
                            onClick={() => {
                              setActiveLahanIndex(idx);
                              setActiveDot(idx);
                              if (
                                scrollRef.current &&
                                scrollRef.current.children[idx]
                              ) {
                                scrollRef.current.children[idx].scrollIntoView({
                                  behavior: "smooth",
                                  block: "nearest",
                                  inline: "center",
                                });
                              }
                            }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all min-h-[38px] ${
                              activeLahanIndex === idx
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border bg-background text-foreground/80 hover:border-muted-foreground/30"
                            }`}
                          >
                            <span>{km?.icon}</span>
                            <span>{lahan.namaLahan}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {(() => {
                  const activeLahan =
                    lahanList[activeLahanIndex] || lahanList[0];
                  const weather = getWeatherByCoords(
                    activeLahan.koordinat.lat,
                    activeLahan.koordinat.lng,
                  );
                  const price = getPriceTrendByCommodity(
                    activeLahan.komoditas,
                  );

                  return (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Info Cuaca BMKG Lahan Terpilih */}
                      <div className="bg-gradient-to-br from-[#f0f9ff] to-[#e0f2fe] rounded-3xl p-5 border border-sky-100/70 shadow-sm space-y-4 text-sky-950">
                        <div className="flex items-center justify-between border-b border-sky-200/50 pb-2.5">
                          <h4 className="font-black text-xs text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Compass className="w-4 h-4 text-sky-600" />
                            Cuaca Lahan: {activeLahan.namaLahan}
                          </h4>
                          <span className="text-[10px] text-sky-700 font-bold bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                            BMKG
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="text-4xl">{weather.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-black text-sky-900">
                                {weather.status}
                              </span>
                              <span className="text-sm font-semibold text-sky-700">
                                ({weather.temp})
                              </span>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-sky-700 mt-1">
                              <span className="flex items-center gap-1">
                                <Droplets className="w-3.5 h-3.5 text-sky-600" />{" "}
                                Kelembaban: {weather.humidity}
                              </span>
                              <span className="flex items-center gap-1">
                                <Thermometer className="w-3.5 h-3.5 text-sky-600" />{" "}
                                Rata-rata
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs bg-white/80 text-sky-900 border border-sky-200 p-3 rounded-2xl leading-relaxed">
                          🌱 <strong>Saran Pemeliharaan Lahan:</strong>{" "}
                          {weather.suggestion}
                        </p>
                      </div>

                      {/* Info Proyeksi Pasar & Tren Harga BAPANAS Lahan Terpilih */}
                      <div className="bg-card rounded-3xl p-5 border border-border/80 shadow-sm space-y-4 text-foreground">
                        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                          <h4 className="font-black text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <TrendingUp className="w-4 h-4 text-primary" />
                            Harga Pasar Terkini: {price.label}
                          </h4>
                          <span className="text-[10px] text-primary font-bold bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                            BAPANAS
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-muted-foreground font-medium block">
                              Rata-rata Harga Hari Ini
                            </span>
                            <span className="text-2xl font-black text-foreground mt-0.5 block">
                              Rp{price.current.toLocaleString()}/kg
                            </span>
                          </div>

                          <div
                            className={`text-right px-3 py-1.5 rounded-2xl border text-xs font-bold ${
                              price.status === "naik"
                                ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-600"
                                : price.status === "turun"
                                  ? "bg-rose-500/10 border-rose-500/15 text-rose-600"
                                  : "bg-muted border-border text-muted-foreground"
                            }`}
                          >
                            <div>
                              {price.diffText} ({price.percentage})
                            </div>
                            <span className="text-[10px] uppercase font-semibold tracking-wider block mt-0.5">
                              Minggu Ini
                            </span>
                          </div>
                        </div>

                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed flex items-center justify-between ${
                            price.status === "turun"
                              ? "bg-rose-500/10 text-rose-800 border border-rose-500/15"
                              : "bg-emerald-500/10 text-emerald-800 border border-emerald-500/15"
                          }`}
                        >
                          <span className="font-semibold">
                            Kondisi Pasar Wilayah:
                          </span>
                          <span className="font-black">
                            {price.marketStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ================= REKOMENDASI PANEN AKTIF ================= */}
            {(harvestPlan || isGeneratingRec) && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600 dark:text-green-500" />
                  <h3 className="text-sm font-bold text-foreground">Status Rekomendasi Panen</h3>
                </div>

                {isGeneratingRec ? (
                  <div className="bg-card rounded-3xl p-6 border border-border/80 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-10 h-10 border-4 border-green-100 dark:border-green-900 border-t-green-600 dark:border-t-green-500 rounded-full animate-spin" />
                    <div>
                      <p className="font-bold text-sm text-foreground">Menganalisis Data Pasar & Cuaca...</p>
                      <p className="text-xs text-muted-foreground mt-1">Sistem sedang menyusun rekomendasi terbaik untuk Anda.</p>
                    </div>
                  </div>
                ) : recommendation ? (
                  <div className="space-y-4">
                    <RecommendationCard 
                      status={recommendation.jsonData.oversupplyStatus as any}
                      suggestedDate={recommendation.jsonData.suggestedHarvestDate}
                      message={recommendation.naturalLanguageText}
                    />
                     {recommendation.jsonData.projectedPriceTrend && (
                      <PriceChart
                        data={recommendation.jsonData.projectedPriceTrend}
                      />
                    )}

                    {/* Ringkasan Destinasi Penjualan (FR-05) */}
                    {sellRecommendation && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="bg-card border border-border/80 rounded-3xl p-5 shadow-sm space-y-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Auto-Matching B2B
                            </span>
                            <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mt-2 text-sm">
                              Rekomendasi Pembeli Terbaik
                            </h4>
                          </div>
                          <Briefcase className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                          {sellRecommendation.naturalLanguageText.replace(/\*\*/g, "")}
                        </p>
                        <button
                          onClick={() => router.push(`/sell-destination?harvestPlanId=${harvestPlan?.id}`)}
                          className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/95 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 min-h-[44px]"
                        >
                          Lihat 3 Destinasi Terbaik
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {/* Quick Menu / Navigasi Lahan */}
            <div className="pt-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">Menu Cepat</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => router.push("/harvest-timing")}
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 rounded-3xl transition-all shadow-sm gap-3 group active:scale-95"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground text-center leading-tight">
                    Prediksi<br/>Panen
                  </span>
                </button>

                <button
                  onClick={() => router.push("/lahan")}
                  className="flex flex-col items-center justify-center p-4 bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 rounded-3xl transition-all shadow-sm gap-3 group active:scale-95"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
                    <Layers className="w-7 h-7" />
                  </div>
                  <span className="text-[11px] font-bold text-foreground text-center leading-tight">
                    Kelola<br/>Lahan
                  </span>
                </button>
              </div>
            </div>

            {/* Logout/Reset Demo Button */}
            <div className="pt-4 border-t border-border/50 flex gap-2">
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("tani_pintar_lahan_profiles");
                    setLahanList([]);
                    setIsOnboarding(true);
                    setWizardStep(1);
                  }
                }}
                className="flex-1 py-3 px-4 rounded-2xl bg-secondary text-secondary-foreground hover:bg-primary/10 border border-primary/20 font-bold text-xs transition-all min-h-[44px]"
              >
                Reset Data Lahan (Demo)
              </button>
            </div>
          </motion.div>
        )}

        {/* ================= MODE: BUYER DASHBOARD ================= */}
        {user.role === "buyer" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-8 text-center"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-primary/10 text-primary mb-4">
              <Briefcase className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-foreground">
                Halo, {user.fullName}!
              </h2>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Anda masuk sebagai peran **Pembeli (Buyer B2B / Koperasi)**.
              </p>
            </div>

            <div className="bg-card py-6 px-5 border border-border/50 rounded-3xl text-left space-y-4 max-w-sm mx-auto shadow-sm">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm text-foreground">
                  Akun Pembeli Aktif
                </h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Di fase berikutnya, Anda akan dapat:
              </p>
              <ul className="text-xs text-muted-foreground space-y-2 pl-2">
                <li className="flex items-center gap-2">
                  🔹 <strong>FR-09:</strong> Lengkapi Profil Usaha Pembeli.
                </li>
                <li className="flex items-center gap-2">
                  🔹 <strong>FR-10:</strong> Posting Demand Listing (kebutuhan).
                </li>
                <li className="flex items-center gap-2">
                  🔹 <strong>FR-12:</strong> Melakukan pencocokan pasokan dengan
                  petani secara otomatis.
                </li>
              </ul>
            </div>

            <div className="pt-4 flex flex-col gap-2 max-w-sm mx-auto">
              <button
                onClick={() => {
                  // Switch role to farmer to test onboarding wizard
                  const updated: UserProfile = { ...user, role: "farmer" };
                  authApi.saveCurrentUser(updated);
                  loadData();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs transition-all min-h-[44px]"
              >
                Coba Demo Alur Petani (F1 Onboarding)
              </button>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto text-center text-[10px] text-muted-foreground py-6 border-t border-border/50 px-4">
        &copy; {new Date().getFullYear()} Tani Pintar. Semua Hak Dilindungi.
        <br />
        Desain Mobile-First &bull; Literasi Pertanian Terintegrasi
      </footer>
    </div>
  );
}
