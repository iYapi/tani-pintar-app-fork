"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, ArrowLeft, MessageSquare, CheckCircle, RefreshCw } from "lucide-react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(59);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    // Ambil data pendaftaran dari sessionStorage
    if (typeof window !== "undefined") {
      const pendingData = sessionStorage.getItem("pending_register");
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        setPhoneNumber(parsed.phoneNumber);
        setRole(parsed.role);
        setFullName(parsed.fullName);
      } else {
        // Jika tidak ada data pending, balikkan ke register
        router.push("/register");
      }
    }
  }, [router]);

  // Timer hitung mundur untuk resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Mengatur input digit OTP
  const handleChange = (value: string, index: number) => {
    setError("");
    if (isNaN(Number(value))) return; // Hanya boleh angka

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus ke input berikutnya
    if (value !== "" && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && otp[index] === "" && index > 0) {
      // Fokus ke input sebelumnya jika menekan Backspace pada input kosong
      inputRefs[index - 1].current?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  // Simulasikan pengiriman ulang OTP
  const handleResend = async () => {
    setIsResending(true);
    setError("");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTimer(59);
    setIsResending(false);
    setOtp(["", "", "", ""]);
    inputRefs[0].current?.focus();
  };

  // Verifikasi Kode OTP
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    
    if (code.length < 4) {
      setError("Silakan masukkan 4 digit kode verifikasi");
      return;
    }

    setIsVerifying(true);
    setError("");

    // Simulasi verifikasi (hanya menerima kode '1234')
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (code !== "1234") {
      setError("Kode OTP salah. Gunakan kode simulasi '1234'.");
      setIsVerifying(false);
      return;
    }

    setIsVerifying(false);
    setIsSuccess(true);

    // Simpan status login
    if (typeof window !== "undefined") {
      sessionStorage.setItem("user_authenticated", "true");
    }

    // Redirect setelah sukses menampilkan animasi
    setTimeout(() => {
      router.push("/dashboard");
    }, 2000);
  };

  // Format nomor HP ke format yang lebih cantik (+62 812-XXXX-XXXX)
  const formatPhoneNumber = (num: string) => {
    if (!num) return "";
    const parts = [];
    if (num.length > 3) parts.push(num.slice(0, 3));
    if (num.length > 7) {
      parts.push(num.slice(3, 7));
      parts.push(num.slice(7));
    } else if (num.length > 3) {
      parts.push(num.slice(3));
    }
    return `+62 ${parts.join("-")}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center"
      >
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 mb-4">
          <Leaf className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
          Verifikasi OTP
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Kami telah mengirimkan kode OTP ke WhatsApp Anda
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-card py-8 px-4 shadow-xl rounded-3xl border border-border/50 sm:px-10">
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="verify-form"
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-4">
                  <span className="inline-block text-sm font-semibold bg-primary/5 text-primary px-3 py-1.5 rounded-full border border-primary/10">
                    {formatPhoneNumber(phoneNumber)}
                  </span>
                  <button 
                    onClick={() => router.push("/register")}
                    className="block mx-auto mt-2 text-xs text-primary hover:underline font-semibold"
                  >
                    Ubah Nomor HP
                  </button>
                </div>

                {/* Banner Simulasi WhatsApp OTP */}
                <div className="bg-[#dcf8c6]/30 text-[#075e54] border border-[#dcf8c6] text-[11px] p-3.5 rounded-2xl text-center leading-relaxed font-semibold mb-6 flex flex-col gap-1 items-center">
                  <span className="text-[9px] text-[#128c7e] font-black uppercase tracking-wider">Simulasi Notifikasi WA Bot</span>
                  <span>Kode OTP Tani Pintar Anda: <span className="font-extrabold text-xs underline text-foreground bg-white/70 px-2 py-0.5 rounded">1234</span></span>
                  <span className="text-[9px] text-[#128c7e]/80">Silakan masukkan kode tersebut di bawah.</span>
                </div>

                <form onSubmit={handleVerify} className="space-y-6">
                  <div>
                    <label className="block text-center text-sm font-medium text-foreground/85 mb-4">
                      Masukkan 4 Digit Kode OTP
                    </label>
                    <div className="flex justify-center gap-4">
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={inputRefs[index]}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={digit}
                          onChange={(e) => handleChange(e.target.value, index)}
                          onKeyDown={(e) => handleKeyDown(e, index)}
                          className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-2xl bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all shadow-sm"
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <p className="text-center text-sm text-destructive font-medium">
                      {error}
                    </p>
                  )}

                  {/* Tombol Verifikasi */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isVerifying}
                    className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-all min-h-[44px]"
                  >
                    {isVerifying ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    ) : (
                      "Verifikasi Kode OTP"
                    )}
                  </motion.button>

                  {/* Kirim Ulang OTP */}
                  <div className="text-center">
                    {timer > 0 ? (
                      <p className="text-xs text-muted-foreground">
                        Kirim ulang kode OTP dalam <span className="font-semibold text-foreground">{timer} detik</span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={isResending}
                        className="inline-flex items-center text-xs font-semibold text-primary hover:underline focus:outline-none disabled:opacity-50"
                      >
                        {isResending ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
                            Mengirim ulang...
                          </>
                        ) : (
                          <>
                            <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            Kirim ulang via WhatsApp
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
                  <CheckCircle className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">
                  Registrasi Berhasil!
                </h3>
                <p className="mt-2 text-sm text-muted-foreground px-4">
                  Selamat datang, <span className="font-semibold text-foreground">{fullName}</span>. 
                  Anda terdaftar sebagai <span className="font-semibold text-foreground capitalize">{role === "farmer" ? "Petani" : "Pembeli (Buyer)"}</span>.
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Mengarahkan Anda ke dashboard...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-6 text-center">
        <button
          onClick={() => router.push("/register")}
          className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Kembali ke halaman pendaftaran
        </button>
      </div>
    </div>
  );
}
