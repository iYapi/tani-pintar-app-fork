"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Leaf, ArrowRight, Phone } from "lucide-react";
import { authApi } from "@/lib/api/authApi";
import Link from "next/link";

const loginSchema = z.object({
  phoneNumber: z
    .string()
    .min(9, { message: "Nomor HP tidak valid" })
    .max(16, { message: "Nomor HP terlalu panjang" })
    .regex(/^(\+62|62|0)?8[0-9]{8,11}$/, {
      message: "Format nomor HP tidak valid (misal: 08123456789 atau 8123456789)",
    }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phoneNumber: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    let cleanPhone = data.phoneNumber.trim().replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    try {
      const res = await authApi.login({ phoneNumber: cleanPhone });
      if (res.success) {
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            "pending_register",
            JSON.stringify({
              phoneNumber: cleanPhone,
              purpose: "LOGIN",
            })
          );
        }
        router.push("/verify-otp");
      } else {
        setError("phoneNumber", {
          type: "manual",
          message: res.message || "Gagal masuk",
        });
      }
    } catch (err) {
      setError("phoneNumber", {
        type: "manual",
        message: "Terjadi kesalahan server saat mencoba masuk",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center"
      >
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-4">
          <Leaf className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
          Masuk ke Tani Pintar
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w">
          Masukkan nomor HP Anda yang terdaftar untuk menerima OTP
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-card py-8 px-4 shadow-xl rounded-3xl border border-border/50 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Input Nomor HP */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-foreground/80 mb-1">
                Nomor WhatsApp (HP)
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Contoh: 081234567890"
                  {...register("phoneNumber")}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-2xl bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-all min-h-[44px] ${
                    errors.phoneNumber ? "border-destructive focus:ring-destructive" : "border-border"
                  }`}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Bisa diawali dengan 0, 62, atau langsung angka 8 (misal: 081234567890).
              </p>
              {errors.phoneNumber && (
                <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* Tombol Submit */}
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all min-h-[44px]"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : (
                <>
                  Masuk & Kirim OTP
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <span className="text-xs text-muted-foreground">
              Belum punya akun?{" "}
              <Link href="/register" className="text-primary font-bold hover:underline">
                Daftar Sekarang
              </Link>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
