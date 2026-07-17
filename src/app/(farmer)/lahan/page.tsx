"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Sprout,
  Plus,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Save,
  X,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { mockApi, KOMODITAS_LIST, FASE_TANAM_LIST } from "@/lib/api/mockApi";
import { LahanProfile, Komoditas, FaseTanam, UserProfile } from "@/types";

// Load LahanMap secara dinamis (ssr: false)
const LahanMap = dynamic(() => import("@/components/maps/LahanMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-muted/40 animate-pulse rounded-2xl flex flex-col items-center justify-center text-xs text-muted-foreground gap-2">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span>Memuat peta interaktif...</span>
    </div>
  ),
});

export default function LahanPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [lahanList, setLahanList] = useState<LahanProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State (Untuk Add/Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLahanId, setEditingLahanId] = useState<string | null>(null); // null = Add, string = Edit
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [namaLahan, setNamaLahan] = useState("");
  const [luasLahan, setLuasLahan] = useState("");
  const [komoditas, setKomoditas] = useState<Komoditas>("cabai_merah");
  const [faseTanam, setFaseTanam] = useState<FaseTanam>("persiapan");
  const [koordinat, setKoordinat] = useState({ lat: -7.2504, lng: 112.7688 });
  const [alamat, setAlamat] = useState("");
  const [tanggalTanam, setTanggalTanam] = useState(new Date().toISOString().split("T")[0]);

  // Delete Dialog State
  const [deletingLahanId, setDeletingLahanId] = useState<string | null>(null);

  const loadData = () => {
    setIsLoading(true);
    const currentUser = mockApi.getCurrentUser();
    if (currentUser) {
      if (currentUser.role !== "farmer") {
        // Hanya petani yang boleh mengakses halaman lahan ini
        router.push("/dashboard");
        return;
      }
      setUser(currentUser);
      setLahanList(mockApi.getLahanList());
    } else {
      router.push("/register");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [router]);

  // Buka form untuk tambah lahan baru
  const handleOpenAddForm = () => {
    setFormError("");
    setEditingLahanId(null);
    setNamaLahan("");
    setLuasLahan("");
    setKomoditas("cabai_merah");
    setFaseTanam("persiapan");
    setKoordinat({ lat: -7.2504, lng: 112.7688 });
    setAlamat("");
    setTanggalTanam(new Date().toISOString().split("T")[0]);
    setIsFormOpen(true);
  };

  // Buka form untuk mengedit lahan yang ada
  const handleOpenEditForm = (lahan: LahanProfile) => {
    setFormError("");
    setEditingLahanId(lahan.id);
    setNamaLahan(lahan.namaLahan);
    setLuasLahan(lahan.luasLahan.toString());
    setKomoditas(lahan.komoditas);
    setFaseTanam(lahan.faseTanam);
    setKoordinat(lahan.koordinat);
    setAlamat(lahan.alamat);
    setTanggalTanam(lahan.tanggalTanam);
    setIsFormOpen(true);
  };

  // Tutup form kelola
  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingLahanId(null);
    setFormError("");
  };

  // Submit Simpan (Add/Edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!namaLahan.trim()) {
      setFormError("Nama lahan wajib diisi.");
      return;
    }
    if (!luasLahan || parseFloat(luasLahan) <= 0) {
      setFormError("Luas lahan harus berupa angka positif.");
      return;
    }
    if (!alamat.trim()) {
      setFormError("Pilihlah lokasi koordinat lahan di peta.");
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulasi delay

      const rawLahan = {
        namaLahan,
        luasLahan: parseFloat(luasLahan),
        komoditas,
        faseTanam,
        koordinat,
        alamat,
        tanggalTanam,
      };

      if (editingLahanId) {
        // Edit mode
        mockApi.updateLahan(editingLahanId, rawLahan);
      } else {
        // Add mode
        mockApi.createLahan(rawLahan);
      }

      handleCloseForm();
      loadData();
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan data lahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Konfirmasi & Hapus Lahan
  const handleDeleteLahan = () => {
    if (!deletingLahanId) return;
    const success = mockApi.deleteLahan(deletingLahanId);
    if (success) {
      setDeletingLahanId(null);
      loadData();
    } else {
      alert("Gagal menghapus lahan.");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between">
      {/* Top Header */}
      <header className="w-full bg-card/85 backdrop-blur-md sticky top-0 border-b border-border/50 px-4 py-3 z-[100]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold py-1.5 transition-all min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <h2 className="font-bold text-sm tracking-tight text-foreground">Kelola Lahan</h2>

          <div className="w-8"></div> {/* Spacer balance */}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6">

        <AnimatePresence mode="wait">

          {/* ================= VIEW: DAFTAR LAHAN ================= */}
          {!isFormOpen ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Header section */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-foreground">Profil Lahan Anda</h1>
                  <p className="text-xs text-muted-foreground">Kelola pemetaan lahan untuk menopang ketepatan rekomendasi.</p>
                </div>

                <button
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center gap-1 text-xs bg-primary text-primary-foreground font-bold px-3.5 py-2.5 rounded-2xl shadow-md hover:bg-primary/95 transition-all min-h-[40px]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Lahan Baru</span>
                </button>
              </div>

              {/* Lahan List */}
              {lahanList.length === 0 ? (
                <div className="bg-card rounded-3xl p-8 border border-border border-dashed text-center space-y-4 shadow-sm">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Belum Ada Lahan Terdaftar</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Anda harus mendaftarkan setidaknya satu lahan untuk mengaktifkan modul rekomendasi harga dan cuaca.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenAddForm}
                    className="py-2.5 px-4 bg-primary text-primary-foreground font-semibold text-xs rounded-2xl hover:bg-primary/95 transition-all min-h-[40px]"
                  >
                    Tambah Lahan Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {lahanList.map((lahan) => {
                    const km = KOMODITAS_LIST.find((k) => k.id === lahan.komoditas);
                    const ft = FASE_TANAM_LIST.find((f) => f.id === lahan.faseTanam);
                    return (
                      <div
                        key={lahan.id}
                        className="bg-card rounded-3xl p-5 border border-border/85 shadow-sm hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all duration-300 relative overflow-hidden flex flex-col gap-4"
                      >
                        {/* Header Lahan */}
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="text-3xl p-2 bg-muted rounded-2xl">{km?.icon}</div>
                            <div>
                              <h4 className="font-black text-base text-foreground leading-tight">{lahan.namaLahan}</h4>
                              <span className="text-xs font-bold text-primary block mt-0.5 capitalize">
                                {km?.label}
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-bold bg-secondary text-secondary-foreground border border-primary/10 px-2.5 py-1 rounded-full">
                            {ft?.label}
                          </span>
                        </div>

                        {/* Grid Spek */}
                        <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40 text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Luas Lahan</span>
                            <span className="font-bold text-foreground">{lahan.luasLahan} Ha</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground font-semibold uppercase block">Mulai Tanam</span>
                            <span className="font-bold text-foreground flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-primary" />
                              {lahan.tanggalTanam}
                            </span>
                          </div>
                        </div>

                        {/* Alamat */}
                        <div className="flex gap-1.5 items-start text-xs leading-relaxed text-muted-foreground border-b border-border/50 pb-3">
                          <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{lahan.alamat}</span>
                        </div>

                        {/* Aksi Edit/Delete */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenEditForm(lahan)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 border border-border hover:bg-muted text-foreground rounded-2xl transition-all min-h-[40px]"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Sunting Lahan</span>
                          </button>

                          <button
                            onClick={() => setDeletingLahanId(lahan.id)}
                            className="p-2.5 border border-destructive/20 hover:bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center transition-all min-h-[40px]"
                            title="Hapus Lahan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (

            // ================= VIEW: FORM TAMBAH/EDIT LAHAN =================
            <motion.div
              key="form-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Form Title & Close Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-xl font-black text-foreground">
                    {editingLahanId ? "Sunting Profil Lahan" : "Tambah Lahan Baru"}
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {editingLahanId ? "Ubah detail informasi pemetaan lahan Anda." : "Masukkan detail lahan pertanian baru Anda."}
                  </p>
                </div>

                <button
                  onClick={handleCloseForm}
                  className="p-2 border border-border rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all min-h-[38px] flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Wrapper Card */}
              <div className="bg-card rounded-3xl p-5 border border-border shadow-sm">

                {formError && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nama Lahan */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">Nama Lahan</label>
                    <input
                      type="text"
                      placeholder="Masukkan nama lahan (misal: Sawah Caringin)"
                      value={namaLahan}
                      onChange={(e) => setNamaLahan(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                    />
                  </div>

                  {/* Luas Lahan & Tanggal Tanam */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1">Luas Lahan (Hektar)</label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Contoh: 0.8"
                        value={luasLahan}
                        onChange={(e) => setLuasLahan(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground/80 mb-1">Tanggal Mulai Tanam</label>
                      <input
                        type="date"
                        value={tanggalTanam}
                        onChange={(e) => setTanggalTanam(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                      />
                    </div>
                  </div>

                  {/* Dropdown Komoditas */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-2">Pilih Komoditas Utama</label>
                    <div className="grid grid-cols-2 gap-2">
                      {KOMODITAS_LIST.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setKomoditas(item.id)}
                          className={`p-2.5 rounded-2xl border-2 text-left transition-all flex flex-col gap-0.5 min-h-[44px] ${komoditas === item.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background/30 text-foreground/80 hover:border-muted-foreground/30"
                            }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <span className="font-bold text-[11px] text-foreground">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dropdown Fase Tanam */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">Fase Tanam Saat Ini</label>
                    <select
                      value={faseTanam}
                      onChange={(e) => setFaseTanam(e.target.value as FaseTanam)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-border bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px]"
                    >
                      {FASE_TANAM_LIST.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label} — {item.desc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Leaflet Map Pinning */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground/80 mb-1">Peta Penentuan Lokasi Lahan</label>
                    <LahanMap
                      initialCoords={koordinat}
                      initialAlamat={alamat}
                      onChange={(data) => {
                        setKoordinat({ lat: data.lat, lng: data.lng });
                        setAlamat(data.alamat);
                        setFormError("");
                      }}
                    />
                  </div>

                  {/* Form Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCloseForm}
                      disabled={isSubmitting}
                      className="flex items-center justify-center border border-border bg-background hover:bg-muted text-foreground font-semibold py-3.5 px-4 rounded-2xl transition-all min-h-[44px] disabled:opacity-50"
                    >
                      <span>Batal</span>
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex items-center justify-center gap-1.5 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-2xl shadow-sm hover:bg-primary/95 transition-all min-h-[44px] disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Simpan Lahan</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {deletingLahanId && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card w-full max-w-sm rounded-3xl p-5 border border-border shadow-xl space-y-4"
              >
                <div className="flex items-center gap-3 text-destructive">
                  <div className="p-2.5 bg-destructive/10 rounded-xl">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-base text-foreground">Hapus Lahan Ini?</h3>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan. Menghapus lahan ini juga akan menonaktifkan kalkulasi rekomendasi harga dan cuaca yang terikat padanya.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingLahanId(null)}
                    className="flex-1 py-3 border border-border hover:bg-muted text-foreground font-semibold rounded-2xl text-xs transition-all min-h-[40px]"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleDeleteLahan}
                    className="flex-1 py-3 bg-destructive text-destructive-foreground hover:bg-destructive/95 font-semibold rounded-2xl text-xs transition-all min-h-[40px]"
                  >
                    Hapus Permanen
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto text-center text-[10px] text-muted-foreground py-6 border-t border-border/50 px-4">
        &copy; {new Date().getFullYear()} Tani Pintar. Semua Hak Dilindungi.
        <br />
        Desain Mobile-First &bull; Literasi Pertanian Terintegrasi
      </footer>
    </div>
  );
}
