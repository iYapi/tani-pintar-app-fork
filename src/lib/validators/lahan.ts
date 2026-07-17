import * as z from "zod";

export const lahanSchema = z.object({
  namaLahan: z
    .string()
    .min(3, { message: "Nama lahan minimal 3 karakter" })
    .max(50, { message: "Nama lahan maksimal 50 karakter" }),
  luasLahan: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const parsed = parseFloat(val);
        return isNaN(parsed) ? undefined : parsed;
      }
      return val;
    },
    z
      .number({ required_error: "Luas lahan wajib diisi" })
      .positive({ message: "Luas lahan harus lebih besar dari 0" })
  ),
  komoditas: z.enum(
    ["cabai_merah", "cabai_rawit", "tomat", "bawang_merah", "kentang", "kubis"],
    { required_error: "Silakan pilih jenis komoditas" }
  ),
  faseTanam: z.enum(
    ["persiapan", "awal_tanam", "vegetatif", "generatif", "siap_panen"],
    { required_error: "Silakan pilih fase tanam" }
  ),
  koordinat: z.object({
    lat: z.number({ required_error: "Koordinat lintang (latitude) wajib diisi" }),
    lng: z.number({ required_error: "Koordinat bujur (longitude) wajib diisi" }),
  }, { required_error: "Lokasi lahan wajib ditentukan di peta" }),
  alamat: z
    .string()
    .min(5, { message: "Alamat lokasi minimal 5 karakter" })
    .max(200, { message: "Alamat lokasi maksimal 200 karakter" }),
  tanggalTanam: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Tanggal tanam tidak valid",
    }),
});

export type LahanFormValues = z.infer<typeof lahanSchema>;
