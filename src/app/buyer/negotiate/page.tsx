"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Package,
  DollarSign,
  Briefcase
} from "lucide-react";
import { buyerApi } from "@/lib/api/buyerApi";
import { COMMODITY_LIST } from "@/lib/api/metadataApi";
import { DemandListing, SaleListing } from "@/types";

function NegotiateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const demandId = searchParams.get("demandId");
  const saleId = searchParams.get("saleId");

  const [demand, setDemand] = useState<DemandListing | null>(null);
  const [sale, setSale] = useState<SaleListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (demandId && saleId) {
      const demands = buyerApi.getDemandListings().data;
      const foundDemand = demands.find(d => d.id === demandId);
      
      if (foundDemand) {
        setDemand(foundDemand);
        const sales = buyerApi.getMatchedSaleListings(demandId).data;
        const foundSale = sales.find(s => s.id === saleId);
        if (foundSale) {
          setSale(foundSale);
        }
      }
    }
    setIsLoading(false);
  }, [demandId, saleId]);

  const executeConfirm = () => {
    if (!demand || !sale) return;
    
    try {
      buyerApi.createNegotiationBid({
        demandId: demand.id,
        saleId: sale.id,
        buyerProfileId: demand.buyerProfileId,
        farmerProfileId: sale.farmerProfileId,
        bidPrice: sale.minPricePerUnit || 0,
      });
    } catch (e) {
      console.log(e); // Ignore if already bid
    }

    setIsConfirming(false);
    setIsSuccess(true);
    
    // Fake a success delay then redirect
    setTimeout(() => {
      setIsSuccess(false);
      router.push("/buyer/dashboard");
    }, 2500);
  };

  if (isLoading) return null;
  if (!demand || !sale) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="font-bold text-lg">Data tidak ditemukan</h2>
        <button onClick={() => router.back()} className="mt-4 text-primary font-bold">Kembali</button>
      </div>
    );
  }

  const commodityInfo = COMMODITY_LIST.find(c => c.id === demand.commodity);
  const availableDate = new Date(sale.availableDate);
  const deadlineDate = new Date(demand.deadline);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24 text-zinc-900 dark:text-zinc-100 flex justify-center">
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
            <h1 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Konfirmasi Pembelian</h1>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Match Negosiasi · FR-12</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 space-y-6 overflow-y-auto">
          
          {/* Ringkasan Demand */}
          <div className="bg-gradient-to-br from-zinc-50 to-zinc-100/50 dark:from-zinc-800/40 dark:to-zinc-800/20 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 flex gap-4 items-center shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl shadow-inner shrink-0">
              {commodityInfo?.icon || "🌾"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Kebutuhan Anda</span>
                <span className="text-[9px] font-extrabold bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Aktif</span>
              </div>
              <h2 className="font-bold text-sm text-zinc-800 dark:text-zinc-200 mt-0.5 truncate">
                {commodityInfo?.label || demand.commodity}
              </h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" />
                  {demand.volume} {demand.unit}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Tenggat: {deadlineDate.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              </div>
            </div>
          </div>

          {/* Matches Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
              Detail Pasokan Petani
            </h3>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-card border border-primary/50 ring-2 ring-primary/10 rounded-3xl p-5 shadow-sm overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-green-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-sm">
                98% COCOK
              </div>

              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      Petani Oversupply ({sale.farmerProfileId})
                    </h4>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase block mt-0.5">
                      Tersedia: {availableDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 text-sm bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl p-3 border border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Volume Tersedia</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-primary" />
                    {sale.volume.toLocaleString()} {sale.unit}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mb-1">Harga Penawaran</span>
                  <span className="font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-end gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    {sale.minPricePerUnit ? `Rp${sale.minPricePerUnit.toLocaleString()}` : "Nego"}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-zinc-500">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium">
                    <MapPin className="w-4 h-4 text-zinc-400" />
                    Asal Lokasi
                  </span>
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">
                    {sale.locationName}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                    <Truck className="w-4 h-4 text-zinc-400" />
                    Status Logistik
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full border border-green-200/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Siap Kirim
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setIsConfirming(true)}
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm shadow-primary/20"
                >
                  Kunci Pembelian & Hubungi Petani
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </main>

        {/* Modal Konfirmasi B2B */}
        <AnimatePresence>
          {isConfirming && (
            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="w-full bg-white dark:bg-zinc-950 rounded-t-[32px] p-6 shadow-2xl space-y-6 border-t border-zinc-200 dark:border-zinc-800"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto text-xl">
                    🤝
                  </div>
                  <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Konfirmasi Pembelian</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 px-2">
                    Apakah Anda yakin ingin mengunci pasokan ini dari petani <strong>{sale.farmerProfileId}</strong>? Sistem akan memfasilitasi negosiasi via WhatsApp.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsConfirming(false)}
                    className="flex-1 py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-2xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={executeConfirm}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-2xl shadow-sm transition-all active:scale-95"
                  >
                    Ya, Hubungi Petani
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Animasi Sukses Match */}
        <AnimatePresence>
          {isSuccess && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-900/90 text-white p-6 backdrop-blur-md">
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
                  <h3 className="text-lg font-black">Pembelian Dikunci!</h3>
                  <p className="text-xs text-green-200 max-w-xs leading-relaxed">
                    Sistem berhasil menyamakan permintaan Anda dengan pasokan Petani. Mengalihkan ke WhatsApp...
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

export default function NegotiatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <NegotiateContent />
    </Suspense>
  );
}
