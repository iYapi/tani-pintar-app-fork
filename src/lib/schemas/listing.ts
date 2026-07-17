import { z } from "zod";

const latitude = z.number().min(-90).max(90).optional();
const longitude = z.number().min(-180).max(180).optional();

const volumeUnits = ["kg", "ton", "kwintal"] as const;

// ---- Demand Listing (FR-10, §8) ----
export const createDemandListingSchema = z.object({
  commodity: z.string().min(2).max(100),
  volume: z.number().positive(),
  unit: z.enum(volumeUnits).default("kg"),
  locationName: z.string().max(200).optional(),
  latitude,
  longitude,
  maxPricePerUnit: z.number().positive().optional(),
  deadline: z.string().refine((d) => !isNaN(Date.parse(d)), "Format deadline harus ISO date / YYYY-MM-DD"),
  description: z.string().max(2000).optional(),
});
export type CreateDemandInput = z.infer<typeof createDemandListingSchema>;
export const updateDemandListingSchema = createDemandListingSchema.partial().extend({
  status: z.enum(["OPEN", "FULFILLED", "CLOSED", "CANCELLED"]).optional(),
});
export type UpdateDemandInput = z.infer<typeof updateDemandListingSchema>;

export const listDemandQuerySchema = z.object({
  commodity: z.string().max(100).optional(),
  status: z.enum(["OPEN", "FULFILLED", "CLOSED", "CANCELLED"]).optional(),
  buyerProfileId: z.string().optional(),
  minVolume: z.coerce.number().optional(),
  maxVolume: z.coerce.number().optional(),
  nearLat: z.coerce.number().min(-90).max(90).optional(),
  nearLng: z.coerce.number().min(-180).max(180).optional(),
  nearRadiusKm: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListDemandQuery = z.infer<typeof listDemandQuerySchema>;

// ---- Sale Listing (FR-11, §9) ----
export const createSaleListingSchema = z.object({
  harvestPlanId: z.string().optional(),
  commodity: z.string().min(2).max(100),
  volume: z.number().positive(),
  unit: z.enum(volumeUnits).default("kg"),
  pricePerUnit: z.number().positive().optional(),
  locationName: z.string().max(200).optional(),
  latitude,
  longitude,
  isOversupply: z.boolean().default(false),
});
export type CreateSaleInput = z.infer<typeof createSaleListingSchema>;
export const updateSaleListingSchema = createSaleListingSchema.partial().extend({
  status: z.enum(["OPEN", "MATCHED", "CLOSED", "CANCELLED"]).optional(),
});
export type UpdateSaleInput = z.infer<typeof updateSaleListingSchema>;

export const listSaleQuerySchema = z.object({
  commodity: z.string().max(100).optional(),
  status: z.enum(["OPEN", "MATCHED", "CLOSED", "CANCELLED"]).optional(),
  farmerProfileId: z.string().optional(),
  buyerProfileId: z.string().optional(),
  isOversupply: z.coerce.boolean().optional(),
  minPricePerUnit: z.coerce.number().optional(),
  maxPricePerUnit: z.coerce.number().optional(),
  minVolume: z.coerce.number().optional(),
  maxVolume: z.coerce.number().optional(),
  nearLat: z.coerce.number().min(-90).max(90).optional(),
  nearLng: z.coerce.number().min(-180).max(180).optional(),
  nearRadiusKm: z.coerce.number().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListSaleQuery = z.infer<typeof listSaleQuerySchema>;