"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Calendar, MapPin, DollarSign, Package } from "lucide-react";
import { buyerApi } from "@/lib/api/buyerApi";
import { COMMODITY_LIST } from "@/lib/api/metadataApi";
import { Komoditas, VolumeUnit } from "@/types";

export default function CreateDemandPage() {
  const router = useRouter();
  
  // Form State
  const [commodity, setCommodity] = useState<Komoditas>("cabai_merah");
  const [volume, setVolume] = useState<string>("");
  const [unit, setUnit] = useState<VolumeUnit>("kg");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [deadline, setDeadline] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // default 1 minggu
  );
  const [description, setDescription] = useState<string>("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!volume || !deadline) {
      setError("Volume dan tenggat waktu wajib diisi.");
      return;
    }

    setIsSubmitting(true);

    try {
      buyerApi.createDemandListing({
        commodity,
        volume: Number(volume),
        unit,
        maxPricePerUnit: maxPrice ? Number(maxPrice) : undefined,
        deadline,
        description,
        locationName: buyerApi.getBuyerProfile()?.locationName || "Lokasi Saya",
      });

      router.push("/buyer/dashboard");
    } catch (err: any) {
      setError(err.message || "Gagal membuat permintaan pasokan.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-700 dark:text-zinc-300" />
          </button>
          <div className="flex flex-col">
            <h1 className="font-bold text-zinc-900 dark:text-zinc-100">Buat Permintaan Pasokan</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Demand Listing Baru</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Commodity Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Komoditas yang Dibutuhkan</label>
            <div className="grid grid-cols-2 gap-2.5">
              {COMMODITY_LIST.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setCommodity(item.id as Komoditas)}
                  className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left ${
                    commodity === item.id
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-card border-border hover:border-primary/40 text-foreground"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-xs font-bold leading-tight flex-1">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Volume Input */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Kebutuhan Volume</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="number"
                  placeholder="Contoh: 1500"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  required
                  min="1"
                />
              </div>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as VolumeUnit)}
                className="w-32 bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              >
                <option value="kg">kg</option>
                <option value="ton">ton</option>
                <option value="kwintal">kwintal</option>
              </select>
            </div>
          </div>

          {/* Max Price */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Batas Harga (Maksimal)</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Opsional</span>
            </label>
            <div className="relative flex-1">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="number"
                placeholder="Contoh: 25000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                min="1"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Harga batas atas per unit ({unit}). Kosongkan jika negosiasi terbuka.</p>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Tenggat Waktu Pemenuhan</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>Deskripsi / Catatan Khusus</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md">Opsional</span>
            </label>
            <textarea
              placeholder="Contoh: Kualitas grade A, ukuran sedang..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-muted/50 border border-border rounded-xl p-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors min-h-[100px] resize-y"
            />
          </div>

          <div className="pt-4 border-t border-border/50">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/20"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Terbitkan Permintaan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
