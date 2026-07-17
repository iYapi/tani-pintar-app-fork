import { z } from "zod";

export const HARVEST_PLAN_STATUSES = [
  "DRAFT",
  "PLANNED",
  "READY",
  "HARVESTED",
  "CANCELLED",
] as const;

export const VOLUME_UNITS = ["kg", "ton", "kwintal"] as const;

// ISO date (YYYY-MM-DD). Kontrak §6.1 minta `harus ≥ hari ini`.
const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const readyToHarvestDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD (ISO date).")
  .refine((val) => val >= todayISO(), "Tanggal siap panen harus hari ini atau setelahnya.");

export const createHarvestPlanSchema = z.object({
  landId: z.string().max(40).optional(),
  commodity: z
    .string()
    .min(2, { message: "Jenis komoditas minimal 2 karakter" })
    .max(100),
  estimatedVolume: z
    .number()
    .positive({ message: "Estimasi volume harus lebih besar dari 0" }),
  volumeUnit: z.enum(VOLUME_UNITS).default("kg"),
  readyToHarvestDate,
  notes: z.string().max(1000).optional(),
});

export type CreateHarvestPlanInput = z.infer<typeof createHarvestPlanSchema>;

// Partial update; readyToHarvestDate tetap divalidasi format bila diisi,
// tapi TIDAK mengulang validasi "≥ hari ini" agar PATCH bisa membenarkan
// rencana hari ini / perbaiki typo tanggal lampau — kecuali bila lebih.
const updateReadyDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD (ISO date).")
  .refine((val) => val >= todayISO(), "Tanggal siap panen harus hari ini atau setelahnya.");

export const updateHarvestPlanSchema = z
  .object({
    landId: z.string().max(40).optional(),
    commodity: z.string().min(2).max(100).optional(),
    estimatedVolume: z.number().positive().optional(),
    volumeUnit: z.enum(VOLUME_UNITS).optional(),
    readyToHarvestDate: updateReadyDate.optional(),
    actualVolume: z.number().positive().optional(),
    status: z.enum(HARVEST_PLAN_STATUSES).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine(
    (data) =>
      !(data.status === "HARVESTED" && data.actualVolume === undefined),
    {
      message:
        "Transisi ke status HARVESTED wajib mengisi actualVolume.",
      path: ["actualVolume"],
    }
  );

export type UpdateHarvestPlanInput = z.infer<typeof updateHarvestPlanSchema>;

export const listHarvestPlansQuerySchema = z.object({
  status: z.enum(HARVEST_PLAN_STATUSES).optional(),
  commodity: z.string().max(100).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListHarvestPlansQuery = z.infer<typeof listHarvestPlansQuerySchema>;