"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Save,
  Activity,
  AlertCircle,
  Sprout,
  Scale
} from "lucide-react";
import * as authApi from "@/lib/api/authApi";
import * as landApi from "@/lib/api/landApi";
import { COMMODITY_LIST } from "@/lib/api/metadataApi";
import { harvestPlanApi } from "@/lib/api/harvestPlanApi";
import { LahanProfile, UserProfile, VolumeUnit } from "@/types";

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

  useEffect(() => {
    const currentUser = authApi.getCurrentUser();
    if (currentUser) {
      if (currentUser.role !== "farmer") {
        router.push("/dashboard");
        return;
      }
      setUser(currentUser);

      const userLahan = landApi.getLandList();
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
      harvestPlanApi.triggerRecommendations(newPlan.id);

      // 3. Navigate back to dashboard immediately
      router.push("/dashboard");
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan sistem.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) return null;

  const selectedLahan = lahanList.find(l => l.id === selectedLahanId);
  const commodityInfo = selectedLahan ? COMMODITY_LIST.find(k => k.id === selectedLahan.komoditas) : null;

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
            <h1 className="font-bold text-zinc-900 dark:text-zinc-100">Buat Rencana Panen</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Input jadwal panen untuk prediksi</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-sm">
            <Activity className="w-8 h-8 mb-4 opacity-90" />
            <h2 className="text-xl font-bold mb-2">Hindari Jual Murah</h2>
            <p className="text-green-50 text-sm leading-relaxed max-w-md">
              Masukkan rencana panen Anda. Sistem akan memprediksi tren harga pasar dan risiko oversupply untuk memberi tahu kapan waktu paling menguntungkan untuk memanen, dan menampilkannya di Dashboard Anda.
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
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
                >
                  Daftar Lahan Sekarang
                </button>
              </div>
            ) : (
              <>
                {/* Lahan Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Pilih Lahan / Komoditas</label>
                  <select
                    value={selectedLahanId}
                    onChange={(e) => setSelectedLahanId(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                  >
                    {lahanList.map((lahan) => {
                      const km = COMMODITY_LIST.find(k => k.id === lahan.komoditas);
                      return (
                        <option key={lahan.id} value={lahan.id}>
                          {km?.icon} {lahan.namaLahan} ({km?.label})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tanggal Rencana Panen</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                    <input
                      type="date"
                      value={readyToHarvestDate}
                      onChange={(e) => setReadyToHarvestDate(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Estimated Volume */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Estimasi Volume Panen</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Scale className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                      <input
                        type="number"
                        placeholder="Contoh: 500"
                        value={estimatedVolume}
                        onChange={(e) => setEstimatedVolume(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                        required
                        min="1"
                      />
                    </div>
                    <select
                      value={volumeUnit}
                      onChange={(e) => setVolumeUnit(e.target.value as VolumeUnit)}
                      className="w-32 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-3 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                    >
                      <option value="kg">Kilogram (kg)</option>
                      <option value="ton">Ton</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-green-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan Rencana...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Simpan & Buat Prediksi</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </main>
    </div>
  );
}
