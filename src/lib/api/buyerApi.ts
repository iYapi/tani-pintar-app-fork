import { BuyerProfile, DemandListing, SaleListing, Komoditas, VolumeUnit, NegotiationBid } from "@/types";
import { STORAGE_KEYS } from "@/data/constants";
import * as authApi from "./authApi";
import { COMMODITY_LIST } from "./metadataApi";

export const buyerApi = {
  // 1. Get current Buyer Profile
  getBuyerProfile: (): BuyerProfile | null => {
    if (typeof window === "undefined") return null;
    const user = authApi.getCurrentUser();
    if (!user || user.role !== "buyer") return null;

    const profilesStr = localStorage.getItem(STORAGE_KEYS.BUYER_PROFILES);
    const allProfiles: BuyerProfile[] = profilesStr ? JSON.parse(profilesStr) : [];
    
    let profile = allProfiles.find(p => p.userId === user.phoneNumber);
    
    return profile || null;
  },

  // 2. Create Buyer Profile
  createBuyerProfile: (data: Omit<BuyerProfile, "id" | "userId" | "createdAt" | "updatedAt">): BuyerProfile => {
    const user = authApi.getCurrentUser();
    if (!user || user.role !== "buyer") throw new Error("Unauthorized");

    const profilesStr = localStorage.getItem(STORAGE_KEYS.BUYER_PROFILES);
    const allProfiles: BuyerProfile[] = profilesStr ? JSON.parse(profilesStr) : [];
    
    // Check if already exists
    if (allProfiles.some(p => p.userId === user.phoneNumber)) {
      throw new Error("Profile already exists");
    }

    const newProfile: BuyerProfile = {
      ...data,
      id: "buyer-" + Math.random().toString(36).substring(2, 9),
      userId: user.phoneNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    allProfiles.push(newProfile);
    localStorage.setItem(STORAGE_KEYS.BUYER_PROFILES, JSON.stringify(allProfiles));

    return newProfile;
  },

  // 3. Create Demand Listing
  createDemandListing: (data: Omit<DemandListing, "id" | "buyerProfileId" | "status" | "createdAt" | "updatedAt">): DemandListing => {
    const profile = buyerApi.getBuyerProfile();
    if (!profile) throw new Error("Buyer profile not found");

    const newDemand: DemandListing = {
      ...data,
      id: "demand-" + Math.random().toString(36).substring(2, 9),
      buyerProfileId: profile.id,
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const listingsStr = localStorage.getItem(STORAGE_KEYS.DEMAND_LISTINGS);
    const allListings: DemandListing[] = listingsStr ? JSON.parse(listingsStr) : [];
    
    allListings.push(newDemand);
    localStorage.setItem(STORAGE_KEYS.DEMAND_LISTINGS, JSON.stringify(allListings));

    return newDemand;
  },

  // 3. Get Demand Listings for current buyer
  getDemandListings: (): { data: DemandListing[] } => {
    if (typeof window === "undefined") return { data: [] };
    const profile = buyerApi.getBuyerProfile();
    if (!profile) return { data: [] };

    const listingsStr = localStorage.getItem(STORAGE_KEYS.DEMAND_LISTINGS);
    const allListings: DemandListing[] = listingsStr ? JSON.parse(listingsStr) : [];
    
    const filtered = allListings.filter(l => l.buyerProfileId === profile.id);
    return { data: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  },

  // 4. Get Matched Sale Listings (Auto-Matching Engine Simulation FR-12)
  getMatchedSaleListings: (demandId: string): { data: SaleListing[] } => {
    if (typeof window === "undefined") return { data: [] };
    
    // Get the demand
    const listingsStr = localStorage.getItem(STORAGE_KEYS.DEMAND_LISTINGS);
    const allListings: DemandListing[] = listingsStr ? JSON.parse(listingsStr) : [];
    const demand = allListings.find(d => d.id === demandId);
    
    if (!demand) return { data: [] };

    // Simulate finding matches from "Oversupplied Farmers" (FR-11)
    // We generate deterministic mock matches based on the demand's commodity
    const mockMatches: SaleListing[] = [
      {
        id: "sale-" + demandId + "-1",
        farmerProfileId: "petani-001",
        commodity: demand.commodity,
        volume: demand.volume * 0.8, // 80% of what's requested
        unit: demand.unit,
        locationName: "Kab. Brebes (80km)",
        availableDate: new Date().toISOString().split("T")[0],
        minPricePerUnit: (demand.maxPricePerUnit || 15000) * 0.9, // Slightly cheaper than max
        isOversupply: true,
        status: "OPEN",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: "sale-" + demandId + "-2",
        farmerProfileId: "petani-002",
        commodity: demand.commodity,
        volume: demand.volume * 0.4, // 40% of what's requested
        unit: demand.unit,
        locationName: "Kab. Cirebon (120km)",
        availableDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        minPricePerUnit: (demand.maxPricePerUnit || 15000) * 0.85,
        isOversupply: true,
        status: "OPEN",
        createdAt: new Date(Date.now() - 46400000).toISOString(),
        updatedAt: new Date(Date.now() - 46400000).toISOString()
      }
    ];

    return { data: mockMatches };
  },

  // 5. Create Negotiation Bid
  createNegotiationBid: (data: Omit<NegotiationBid, "id" | "status" | "createdAt">): NegotiationBid => {
    const profile = buyerApi.getBuyerProfile();
    if (!profile) throw new Error("Buyer profile not found");

    const newBid: NegotiationBid = {
      ...data,
      id: "bid-" + Math.random().toString(36).substring(2, 9),
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };

    const bidsStr = localStorage.getItem(STORAGE_KEYS.NEGOTIATION_BIDS);
    const allBids: NegotiationBid[] = bidsStr ? JSON.parse(bidsStr) : [];
    
    // Check if a bid already exists for this demand and sale
    const existingBid = allBids.find(b => b.demandId === data.demandId && b.saleId === data.saleId);
    if (existingBid) {
      throw new Error("A negotiation bid already exists for this match.");
    }
    
    allBids.push(newBid);
    localStorage.setItem(STORAGE_KEYS.NEGOTIATION_BIDS, JSON.stringify(allBids));

    return newBid;
  },

  // 6. Get Negotiation Bids by Demand
  getNegotiationBidsByDemand: (demandId: string): { data: NegotiationBid[] } => {
    if (typeof window === "undefined") return { data: [] };
    
    const bidsStr = localStorage.getItem(STORAGE_KEYS.NEGOTIATION_BIDS);
    const allBids: NegotiationBid[] = bidsStr ? JSON.parse(bidsStr) : [];
    
    const filtered = allBids.filter(b => b.demandId === demandId);
    return { data: filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) };
  }
};
