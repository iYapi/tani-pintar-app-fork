"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  TrendingUp,
  Truck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Clock,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Scale
} from "lucide-react";
import * as authApi from "@/lib/api/authApi";
import { harvestPlanApi } from "@/lib/api/harvestPlanApi";
import { COMMODITY_LIST } from "@/lib/api/metadataApi";
import { HarvestPlan, Recommendation, UserProfile } from "@/types";

function SellDestinationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const harvestPlanId = searchParams.get("harvestPlanId");

  const [user, setUser] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<HarvestPlan | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    if (currentUser) {
      if (currentUser.role !== "farmer") {
        router.push("/farmer/dashboard");
        return;
      }
      setUser(currentUser);

      // Cari plan berdasarkan ID atau ambil plan terbaru jika kosong
      if (harvestPlanId) {
        const plansRes = harvestPlanApi.getHarvestPlans();
        const activePlan = plansRes.data.find((p) => p.id === harvestPlanId);
        if (activePlan) {
          setPlan(activePlan);
          const recsRes = harvestPlanApi.getRecommendationsByPlanId(activePlan.id, "SELL_DESTINATION");
          if (recsRes.data.length > 0) {
            setRecommendation(recsRes.data[0]);
          }
        }
      } else {
        // Fallback: ambil plan terbaru milik user
        const plansRes = harvestPlanApi.getHarvestPlans();
        if (plansRes.data.length > 0) {
          const latestPlan = plansRes.data[0];
          setPlan(latestPlan);
          const recsRes = harvestPlanApi.getRecommendationsByPlanId(latestPlan.id, "SELL_DESTINATION");
          if (recsRes.data.length > 0) {
            setRecommendation(recsRes.data[0]);
          }
        }
      }
    } else {
      router.push("/register");
    }
    setIsLoading(false);
  }, [router, harvestPlanId]);

  const handleAcceptMatch = async (buyerId: string) => {
    setSelectedBuyerId(buyerId);
    setIsConfirming(true);
  };

  const executeConfirm = async () => {
    setIsConfirming(false);
    setIsSuccess(true);
    // Simulasikan delay transaksi dan update status
    setTimeout(() => {
      setIsSuccess(false);
      router.push("/farmer/dashboard");
    }, 2500);
  };

  if (isLoading) return null;

  const commodityInfo = plan ? COMMODITY_LIST.find((c) => c.id === plan.commodity) : null;
  const destinations = recommendation?.jsonData?.destinations || [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 flex justify-center">
      {/* Container Utama Mobile-First (Maks 480px) */}
      <div className="w-full max-w-[480px] bg-white dark:bg-zinc-900 min-h-screen shadow-lg flex flex-col relative border-x border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-100 dark:border-zinc-800 px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Kecocokan Destinasi Jual</h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Sell Destination Matcher · FR-05</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 space-y-6 overflow-y-auto">
          
          {/* Ringkasan Hasil Panen */}
          {plan && (
            <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/40 dark:to-zinc-800/20 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 flex gap-4 items-center shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl shadow-inner shrink-0">
                {commodityInfo?.icon || "🌾"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Komoditas Anda</span>
                  <span className="text-[9px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Aktif</span>
                </div>
                <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                  {commodityInfo?.label || plan.commodity}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" />
                    {plan.estimatedVolume} {plan.volumeUnit}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(plan.readyToHarvestDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Deskripsi Rekomendasi (Claude Natural Language) */}
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50/50 dark:bg-emerald-950/20 border border-green-200/50 dark:border-emerald-900/30 rounded-3xl p-5 shadow-sm space-y-2"
            >
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">Rekomendasi AI Claude</span>
              </div>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-semibold">
                {recommendation.naturalLanguageText.replace(/\*\*/g, "")}
              </p>
            </motion.div>
          )}

          {/* List Destinasi */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                3 Destinasi Terbaik (Auto-Matched)
              </h3>
              <button
                onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Rumus
              </button>
            </div>

            {/* Info Rumus Pop-down */}
            <AnimatePresence>
              {showFormulaInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-xs space-y-2 leading-relaxed"
                >
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Bagaimana Margin Bersih Dihitung?</p>
                  <code className="block bg-white dark:bg-zinc-900 p-2.5 rounded-lg border text-[10px] text-primary font-mono text-center">
                    Margin Bersih = (Volume × Harga Beli) − Ongkos Logistik
                  </code>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-600 dark:text-zinc-400 text-[11px]">
                    <li>**Harga Beli:** Harga penawaran dari pembeli dikurangi fee operasional.</li>
                    <li>**Ongkos Logistik:** Estimasi biaya kirim per kilometer dikalikan volume panen Anda.</li>
                    <li>**Kelayakan Umur Simpan:** Verifikasi apakah sisa kesegaran komoditas Anda mencukupi waktu perjalanan ke lokasi pembeli.</li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buyer Cards */}
            {destinations.length === 0 ? (
              <div className="bg-card border rounded-3xl p-8 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Truck className="w-12 h-12 text-zinc-300 dark:text-zinc-700" />
                <p className="text-xs">Rekomendasi belum dihitung. Harap buat rencana panen terlebih dahulu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {destinations.map((dest: any, index: number) => {
                  const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
                  const isBest = index === 0;

                  return (
                    <motion.div
                      key={dest.buyerId}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative bg-card border rounded-3xl p-5 shadow-sm transition-all overflow-hidden ${
                        isBest
                          ? "border-primary/50 ring-2 ring-primary/10"
                          : "border-border/80 hover:border-zinc-300 dark:hover:border-zinc-700"
                      }`}
                    >
                      {/* Ribbon Rekomendasi Utama */}
                      {isBest && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
                          Rekomendasi Utama
                        </div>
                      )}

                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{medal}</span>
                          <div>
                            <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                              {dest.buyerName}
                            </h4>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase">
                              {dest.buyerId === "buyer-3" ? "Pabrik / B2B" : dest.buyerId === "buyer-2" ? "Koperasi Mitra" : "Pasar Induk"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Margin Bersih Ringkasan */}
                      <div className="mt-4 bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3 border border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center">
                        <div>
                          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block leading-none">Margin Bersih Riil</span>
                          <span className="text-base font-black text-primary mt-1 block">
                            Rp {dest.netMargin.toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block leading-none">Jarak Tempuh</span>
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1 block">
                            {dest.distanceKm} km
                          </span>
                        </div>
                      </div>

                      {/* Detail Ongkos & Kesegaran */}
                      <div className="mt-3.5 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-zinc-500">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Truck className="w-3.5 h-3.5 text-zinc-400" />
                            Biaya Logistik (Transport)
                          </span>
                          <span className="font-bold text-zinc-700 dark:text-zinc-300">
                            Rp {dest.logisticsCost.toLocaleString("id-ID")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[11px] text-zinc-500">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            Kelayakan Umur Simpan (Shelf Life)
                          </span>
                          {dest.shelfLifeFeasible ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full border border-green-200/30">
                              <CheckCircle2 className="w-3 h-3" />
                              Lolos
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full border border-red-200/30">
                              <AlertTriangle className="w-3 h-3" />
                              Beresiko
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CTA Button */}
                      <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                        <button
                          onClick={() => handleAcceptMatch(dest.buyerName)}
                          className={`w-full py-2.5 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 min-h-[44px] ${
                            dest.shelfLifeFeasible
                              ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
                              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/40 dark:text-zinc-600 cursor-not-allowed"
                          }`}
                          disabled={!dest.shelfLifeFeasible}
                        >
                          {dest.shelfLifeFeasible ? "Kunci & Hubungi Pembeli" : "Tidak Disarankan"}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* Modal Konfirmasi B2B */}
        <AnimatePresence>
          {isConfirming && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full max-w-[448px] bg-white dark:bg-zinc-950 rounded-t-[32px] p-6 shadow-2xl space-y-6 border-t border-zinc-200 dark:border-zinc-800"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
                    🤝
                  </div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Konfirmasi Pencocokan Lahan</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Apakah Anda ingin mengonfirmasi kecocokan ini dengan **{selectedBuyerId}**? Status penawaran Anda akan dikirim ke WhatsApp Pembeli.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirming(false)}
                    className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-2xl transition-colors min-h-[44px]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={executeConfirm}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-2xl shadow-sm transition-all active:scale-98 min-h-[44px]"
                  >
                    Ya, Hubungi Sekarang
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Animasi Sukses Match */}
        <AnimatePresence>
          {isSuccess && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900/90 text-white p-6 backdrop-blur-md">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center space-y-4 flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center text-5xl animate-bounce">
                  ✅
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-black">Pencocokan Dikunci!</h3>
                  <p className="text-xs text-green-200 max-w-xs leading-relaxed">
                    Sistem berhasil menyamakan penawaran (Match ke status ACCEPTED). Kebutuhan Anda telah diteruskan ke WhatsApp Pembeli.
                  </p>
                </div>
                <div className="w-8 h-8 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mt-4" />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

export default function SellDestinationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SellDestinationContent />
    </Suspense>
  );
}
