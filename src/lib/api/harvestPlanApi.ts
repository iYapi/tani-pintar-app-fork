import { HarvestPlan, Recommendation, Komoditas, VolumeUnit } from "@/types";
import { STORAGE_KEYS } from "@/data/constants";
import { getCurrentUser } from "./authApi";

export const harvestPlanApi = {
  // 1. Create Harvest Plan
  createHarvestPlan: (planData: { landId?: string | null; commodity: Komoditas | string; estimatedVolume: number; volumeUnit: VolumeUnit; readyToHarvestDate: string; notes?: string }): HarvestPlan => {
    const user = getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const newPlan: HarvestPlan = {
      id: "hp-" + Math.random().toString(36).substring(2, 9),
      farmerProfileId: user.phoneNumber,
      landId: planData.landId || null,
      commodity: planData.commodity,
      estimatedVolume: planData.estimatedVolume,
      volumeUnit: planData.volumeUnit,
      readyToHarvestDate: planData.readyToHarvestDate,
      status: "PLANNED",
      notes: planData.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const plansStr = localStorage.getItem(STORAGE_KEYS.HARVEST_PLANS);
      const allPlans: HarvestPlan[] = plansStr ? JSON.parse(plansStr) : [];
      allPlans.push(newPlan);
      localStorage.setItem(STORAGE_KEYS.HARVEST_PLANS, JSON.stringify(allPlans));
    }

    return newPlan;
  },

  // 2. Trigger Recommendations (Mock Async Job)
  triggerRecommendations: (harvestPlanId: string): { jobId: string; status: string; estimatedCompletionAt: string } => {
    const jobId = "job-" + Math.random().toString(36).substring(2, 9);

    if (typeof window !== "undefined") {
      setTimeout(() => {
        const plansStr = localStorage.getItem(STORAGE_KEYS.HARVEST_PLANS);
        const allPlans: HarvestPlan[] = plansStr ? JSON.parse(plansStr) : [];
        const plan = allPlans.find(p => p.id === harvestPlanId);

        if (plan) {
          const basePrice = plan.commodity === "cabai_merah" ? 32000 : plan.commodity === "kentang" ? 16000 : 20000;
          let currentPrice = basePrice;
          const trend = Array.from({ length: 14 }).map((_, i) => {
            const date = new Date(plan.readyToHarvestDate);
            date.setDate(date.getDate() + i);
            const fluctuation = (Math.random() - 0.5) * 1500;
            currentPrice = Math.round(currentPrice + fluctuation);
            return {
              date: date.toISOString().split("T")[0],
              price: currentPrice
            };
          });

          const isOversupply = Math.random() > 0.5; // 50% chance for demo
          const optimalDate = new Date(plan.readyToHarvestDate);
          if (isOversupply) optimalDate.setDate(optimalDate.getDate() + 5);

          const newRec: Recommendation = {
            id: "rec-" + Math.random().toString(36).substring(2, 9),
            harvestPlanId: plan.id,
            type: "HARVEST_TIMING",
            jsonData: {
              projectedPrice: trend[isOversupply ? 5 : 0]?.price || basePrice,
              projectedPriceDate: optimalDate.toISOString().split("T")[0],
              oversupplyStatus: isOversupply ? "OVERSUPPLY" : "AMAN",
              suggestedHarvestDate: optimalDate.toISOString().split("T")[0],
              confidence: 0.85,
              projectedPriceTrend: trend
            },
            naturalLanguageText: isOversupply
              ? `Terdeteksi potensi oversupply di minggu ini. Disarankan untuk menunda panen hingga ${optimalDate.toLocaleDateString("id-ID")} untuk menghindari harga anjlok.`
              : `Kondisi pasar aman. Anda dapat memanen sesuai jadwal pada ${optimalDate.toLocaleDateString("id-ID")} dengan estimasi harga yang baik.`,
            modelVersion: "rule-based-v1",
            isRead: false,
            createdAt: new Date().toISOString()
          };

          const recsStr = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);
          const allRecs: Recommendation[] = recsStr ? JSON.parse(recsStr) : [];
          allRecs.push(newRec);
          localStorage.setItem(STORAGE_KEYS.RECOMMENDATIONS, JSON.stringify(allRecs));
        }
      }, 2000); // 2 second delay
    }

    return {
      jobId,
      status: "QUEUED",
      estimatedCompletionAt: new Date(Date.now() + 2000).toISOString()
    };
  },

  // 3. Get Recommendations by Plan ID
  getRecommendationsByPlanId: (harvestPlanId: string, type?: string): { data: Recommendation[] } => {
    if (typeof window === "undefined") return { data: [] };

    const recsStr = localStorage.getItem(STORAGE_KEYS.RECOMMENDATIONS);
    const allRecs: Recommendation[] = recsStr ? JSON.parse(recsStr) : [];

    let filtered = allRecs.filter(r => r.harvestPlanId === harvestPlanId);
    if (type) {
      filtered = filtered.filter(r => r.type === type);
    }

    return { data: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  },

  // 4. Get Harvest Plans for the current user
  getHarvestPlans: (landId?: string): { data: HarvestPlan[] } => {
    if (typeof window === "undefined") return { data: [] };

    const user = getCurrentUser();
    if (!user) return { data: [] };

    const plansStr = localStorage.getItem(STORAGE_KEYS.HARVEST_PLANS);
    const allPlans: HarvestPlan[] = plansStr ? JSON.parse(plansStr) : [];

    let filtered = allPlans.filter(p => p.farmerProfileId === user.phoneNumber);
    if (landId) {
      filtered = filtered.filter(p => p.landId === landId);
    }

    return { data: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  }
};
