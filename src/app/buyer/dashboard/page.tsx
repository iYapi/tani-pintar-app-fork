"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  PackageSearch,
  LogOut,
  ArrowRight,
  Building,
  MapPin,
  CheckCircle,
  Leaf,
} from "lucide-react";
import * as authApi from "@/lib/api/authApi";
import { buyerApi } from "@/lib/api/buyerApi";
import {
  BuyerProfile,
  DemandListing,
  SaleListing,
  UserProfile,
  BuyerBusinessType,
  NegotiationBid,
} from "@/types";
import DemandCard from "@/components/cards/DemandCard";
import MatchCard from "@/components/cards/MatchCard";

export default function BuyerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [demandListings, setDemandListings] = useState<DemandListing[]>([]);
  const [matches, setMatches] = useState<Record<string, SaleListing[]>>({});
  const [bids, setBids] = useState<Record<string, NegotiationBid[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Onboarding state
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] =
    useState<BuyerBusinessType>("PASAR_INDUK");
  const [locationName, setLocationName] = useState("");
  const [isSubmittingOnboarding, setIsSubmittingOnboarding] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");

  const loadData = () => {
    setIsLoading(true);
    const currentUser = authApi.getCurrentUser();
    if (currentUser && currentUser.role === "buyer") {
      setUser(currentUser);
      const profile = buyerApi.getBuyerProfile();

      if (!profile) {
        setIsOnboarding(true);
        setIsLoading(false);
        return;
      }

      setBuyerProfile(profile);
      setIsOnboarding(false);

      const demands = buyerApi.getDemandListings().data;
      setDemandListings(demands);

      // Load matches and bids for open demands
      const loadedMatches: Record<string, SaleListing[]> = {};
      const loadedBids: Record<string, NegotiationBid[]> = {};
      
      demands.forEach((d) => {
        if (d.status === "OPEN") {
          loadedMatches[d.id] = buyerApi.getMatchedSaleListings(d.id).data;
          loadedBids[d.id] = buyerApi.getNegotiationBidsByDemand(d.id).data;
        }
      });
      setMatches(loadedMatches);
      setBids(loadedBids);
    } else {
      router.push("/register");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.clear();
    }
    router.push("/register");
  };

  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError("");
    if (!businessName || !locationName) {
      setOnboardingError("Nama Bisnis dan Lokasi wajib diisi");
      return;
    }
    setIsSubmittingOnboarding(true);
    try {
      buyerApi.createBuyerProfile({ businessName, businessType, locationName });
      loadData(); // Will fetch profile and set isOnboarding(false)
    } catch (err: any) {
      setOnboardingError(err.message || "Gagal menyimpan profil");
    } finally {
      setIsSubmittingOnboarding(false);
    }
  };

  if (isLoading) return null;
  if (!user) return null;

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
            <Building className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-foreground mb-1">
            Lengkapi Profil Buyer
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            Ceritakan sedikit tentang bisnis Anda agar sistem dapat mencarikan
            pasokan komoditas yang tepat.
          </p>

          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            {onboardingError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-semibold">
                {onboardingError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Nama Bisnis/Perusahaan
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Contoh: Koperasi Harapan Bersama"
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">Tipe Bisnis</label>
              <select
                value={businessType}
                onChange={(e) =>
                  setBusinessType(e.target.value as BuyerBusinessType)
                }
                className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                <option value="PASAR_INDUK">Pasar Induk</option>
                <option value="KOPERASI">Koperasi</option>
                <option value="RESTORAN">Restoran / Horeca</option>
                <option value="PABRIK_OLAHAN">Pabrik Olahan</option>
                <option value="LAINNYA">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold">
                Lokasi Pengiriman Default
              </label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Contoh: Pasar Induk Cipinang"
                  className="w-full bg-muted/50 border border-border rounded-xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingOnboarding}
              className="w-full bg-primary text-primary-foreground font-bold rounded-xl py-3.5 mt-4 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              {isSubmittingOnboarding ? (
                "Menyimpan..."
              ) : (
                <>
                  Simpan Profil <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!buyerProfile) return null;

  const openDemandsCount = demandListings.filter(
    (d) => d.status === "OPEN",
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center">
      {/* Container Utama Mobile-First (Maks 480px) */}
      <div className="w-full max-w-[480px] bg-white min-h-screen shadow-lg flex flex-col relative border-x border-zinc-200">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-lg tracking-tight text-zinc-900">
              Tani Pintar
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 -mr-2 text-zinc-500 hover:text-red-500 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 pb-24 overflow-y-auto space-y-6">
          {/* Header Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-foreground mt-0.5">
                Halo, {user.fullName}! 👋
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {buyerProfile.businessName} • {buyerProfile.businessType}
              </p>
            </div>
          </div>

          {/* QUICK MENU */}
          <section className="pt-8">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3 px-1">
              Aksi Cepat
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => router.push("/buyer/demand/create")}
                className="flex flex-col items-center justify-center p-4 bg-card border border-border/80 hover:border-primary/50 hover:bg-primary/5 rounded-3xl transition-all shadow-sm gap-3 group active:scale-95"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all">
                  <Plus className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold text-foreground text-center leading-tight">
                  Buat
                  <br />
                  Permintaan
                </span>
              </button>
            </div>
          </section>

          {/* DEMAND LISTINGS */}
          <section>
            <div className="flex justify-between items-end mb-4 px-1">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  Permintaan Saya
                </h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5">
                  {openDemandsCount} permintaan aktif
                </p>
              </div>
            </div>

            {demandListings.length === 0 ? (
              <div className="bg-card border border-border/80 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                <PackageSearch className="w-12 h-12 text-muted-foreground/50 mb-3" />
                <p className="font-bold text-sm text-foreground mb-1">
                  Belum ada permintaan
                </p>
                <p className="text-xs text-muted-foreground max-w-[200px] mb-4">
                  Buat permintaan komoditas untuk menemukan petani yang cocok.
                </p>
                <button
                  onClick={() => router.push("/buyer/demand/create")}
                  className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition-transform"
                >
                  Buat Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {demandListings.map((demand) => (
                  <div key={demand.id} className="space-y-3">
                    {/* Demand Card */}
                    <DemandCard demand={demand} />

                    {/* Matches Section for this demand */}
                    {demand.status === "OPEN" &&
                      matches[demand.id]?.length > 0 && (
                        <div className="pl-4 pr-1 space-y-3 relative before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-border/60">
                          <h4 className="text-xs font-bold text-green-600 dark:text-green-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            {matches[demand.id].length} Potensi Pasokan
                            Ditemukan
                          </h4>
                          {matches[demand.id].map((sale) => (
                            <MatchCard
                              key={sale.id}
                              sale={sale}
                              onAccept={() =>
                                router.push(
                                  `/buyer/negotiate?demandId=${demand.id}&saleId=${sale.id}`,
                                )
                              }
                            />
                          ))}
                        </div>
                      )}

                    {/* Negotiation Bids Section */}
                    {bids[demand.id] && bids[demand.id].length > 0 && (
                      <div className="pl-4 pr-1 mt-4 space-y-2 relative before:absolute before:left-2 before:top-0 before:bottom-0 before:w-0.5 before:bg-border/60">
                        <h4 className="text-xs font-bold text-blue-600 dark:text-blue-500 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Riwayat Penawaran ({bids[demand.id].length})
                        </h4>
                        <div className="space-y-2">
                          {bids[demand.id].map(bid => (
                            <div key={bid.id} className="bg-card border border-border/80 rounded-2xl p-3 flex justify-between items-center shadow-sm">
                              <div>
                                <p className="text-xs font-bold text-foreground">{bid.farmerProfileId}</p>
                                <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 uppercase tracking-wider">{bid.status}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-black text-primary">Rp{bid.bidPrice.toLocaleString()}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{new Date(bid.createdAt).toLocaleDateString("id-ID")}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
