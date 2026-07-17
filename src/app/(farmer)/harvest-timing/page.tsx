"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Save,
  Activity,
  AlertCircle,
  Sprout,
  Scale
} from "lucide-react";
import { mockApi, KOMODITAS_LIST } from "@/lib/api/mockApi";
import { harvestPlanApi } from "@/lib/api/harvestPlanApi";
import { LahanProfile, UserProfile, HarvestPlan, Recommendation, HarvestTimingData, VolumeUnit } from "@/types";
import PriceChart from "@/components/charts/PriceChart";
import RecommendationCard from "@/components/cards/RecommendationCard";

export default function HarvestTimingPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lahanList, setLahanList] = useState<LahanProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [selectedLahanId, setSelectedLahanId] = useState<string>("");
  const [estimatedVolume, setEstimatedVolume] = useState<string>("");
  const [volumeUnit, setVolumeUnit] = useState<VolumeUnit>("kg");
  const [readyToHarvestDate, setReadyToHarvestDate] = useState(new Date().toISOString().split("T")[0]);
  
  // App State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [recommendationResult, setRecommendationResult] = useState<Recommendation | null>(null);

  useEffect(() => {
    const currentUser = mockApi.getCurrentUser();
    if (currentUser) {
      if (currentUser.role !== "farmer") {
        router.push("/dashboard");
        return;
      }
      setUser(currentUser);
      
      const userLahan = mockApi.getLahanList();
      setLahanList(userLahan);
      if (userLahan.length > 0) {
        setSelectedLahanId(userLahan[0].id);
      }
    } else {
      router.push("/register");
    }
    setIsLoading(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!selectedLahanId || !estimatedVolume || !readyToHarvestDate) {
      setFormError("Harap lengkapi semua data wajib.");
      return;
    }

    const selectedLahan = lahanList.find((l) => l.id === selectedLahanId);
    if (!selectedLahan) return;

    setIsSubmitting(true);
    setRecommendationResult(null);

    try {
      // 1. Create Plan
      const newPlan = harvestPlanApi.createHarvestPlan({
        landId: selectedLahan.id,
        commodity: selectedLahan.komoditas,
        estimatedVolume: Number(estimatedVolume),
        volumeUnit: volumeUnit,
        readyToHarvestDate: readyToHarvestDate,
      });

      // 2. Trigger async recommendation
      const job = harvestPlanApi.triggerRecommendations(newPlan.id);

      // 3. Poll for result (Mocked with timeout)
      setTimeout(() => {
        const result = harvestPlanApi.getRecommendationsByPlanId(newPlan.id, "HARVEST_TIMING");
        if (result.data.length > 0) {
          setRecommendationResult(result.data[0]);
        }
        setIsSubmitting(false);
      }, 2500);

    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan sistem.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  const selectedLahan = lahanList.find(l => l.id === selectedLahanId);
  const commodityInfo = selectedLahan ? KOMODITAS_LIST.find(k => k.id === selectedLahan.komoditas) : null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-zinc-900 dark:text-zinc-100">Harvest Timing Optimizer</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Rekomendasi waktu panen cerdas</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {!recommendationResult ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-sm">
              <Activity className="w-8 h-8 mb-4 opacity-90" />
              <h2 className="text-xl font-bold mb-2">Hindari Jual Murah</h2>
              <p className="text-green-50 text-sm leading-relaxed max-w-md">
                Masukkan rencana panen Anda. Sistem akan memprediksi tren harga pasar dan risiko oversupply untuk memberi tahu kapan waktu paling menguntungkan untuk memanen.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
              {formError && (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}

              {lahanList.length === 0 ? (
                <div className="text-center py-6">
                  <Sprout className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">Anda belum mendaftarkan lahan.</p>
                  <button
                    type="button"
                    onClick={() => router.push("/lahan")}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600"
                  >
                    Daftar Lahan Sekarang
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Pilih Lahan</label>
                      <select
                        value={selectedLahanId}
                        onChange={(e) => setSelectedLahanId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
                      >
                        {lahanList.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.namaLahan} - {KOMODITAS_LIST.find(k => k.id === l.komoditas)?.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Estimasi Hasil</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Scale className="w-5 h-5 text-zinc-400" />
                          </div>
                          <input
                            type="number"
                            value={estimatedVolume}
                            onChange={(e) => setEstimatedVolume(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
                            placeholder="Misal: 1200"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Satuan</label>
                        <select
                          value={volumeUnit}
                          onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
                          className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
                        >
                          <option value="kg">Kilogram (Kg)</option>
                          <option value="kwintal">Kwintal</option>
                          <option value="ton">Ton</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Rencana Tanggal Panen</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="w-5 h-5 text-zinc-400" />
                        </div>
                        <input
                          type="date"
                          value={readyToHarvestDate}
                          onChange={(e) => setReadyToHarvestDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-zinc-100"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">Tanggal ini akan dianalisis untuk risiko oversupply.</p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium shadow-sm shadow-green-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Menganalisis Pasar & Cuaca...
                      </>
                    ) : (
                      <>
                        <Activity className="w-5 h-5" />
                        Dapatkan Rekomendasi
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </motion.div>
        ) : (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Hasil Analisis AI</h2>
                  <p className="text-sm text-zinc-500">Berdasarkan data BAPANAS & BMKG</p>
                </div>
                <button 
                  onClick={() => setRecommendationResult(null)}
                  className="text-sm text-green-600 font-medium hover:underline"
                >
                  Buat Rencana Baru
                </button>
              </div>

              {/* Recommendation Card */}
              <RecommendationCard 
                status={(recommendationResult.jsonData as HarvestTimingData).oversupplyStatus}
                suggestedDate={(recommendationResult.jsonData as HarvestTimingData).suggestedHarvestDate}
                message={recommendationResult.naturalLanguageText}
              />

              {/* Price Chart */}
              <PriceChart 
                data={(recommendationResult.jsonData as HarvestTimingData).projectedPriceTrend} 
                title={`Proyeksi Harga ${commodityInfo?.label} (14 Hari Kedepan)`}
              />

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-2xl p-4 flex gap-3 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-blue-500 mt-0.5" />
                <div className="text-blue-800 dark:text-blue-200 leading-relaxed">
                  <strong>Penting:</strong> Keputusan akhir tetap di tangan Anda. Jika Anda harus panen sekarang karena kebutuhan mendesak, Anda bisa melihat <span className="font-medium underline cursor-pointer text-blue-600 dark:text-blue-400">Rekomendasi Tujuan Jual (F3)</span> untuk mencari pasar terbaik.
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
