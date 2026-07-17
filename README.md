# Tani Pintar — Web Dashboard Frontend

Tani Pintar adalah platform berbasis *AgriTech* (Harvest & Market Decision Intelligence Platform) yang membantu petani kecil di Indonesia mengambil keputusan optimal tentang **kapan memanen**, **ke mana menjual**, dan **bagaimana menyelamatkan hasil panen** dengan menggabungkan data harga pasar, cuaca, logistik, dan umur simpan komoditas.

---

## 🚀 Memulai Pengembangan (Local Setup)

### 1. Instalasi Dependensi
Pastikan Node.js sudah terinstal. Jalankan perintah berikut di folder proyek utama:
```bash
npm install
```

### 2. Jalankan Server Dev (Frontend)
Jalankan server pengembangan lokal di port default (`localhost:3000`):
```bash
npm run dev
```

### 3. Konfigurasi Environment Variables
Buat file `.env.local` di root folder proyek:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🌿 Alur Kerja Git (Git Workflow)

Untuk menjaga keteraturan codebase, diterapkan aturan mutlak berikut:

### 1. Cabang per Fitur (Feature Branching)
*   **Dilarang keras** menulis kode langsung di branch `main`.
*   Setiap fitur (F1 sampai F11) wajib dikerjakan di branch terpisah yang dicabangkan dari `main` ter-update.
*   **Format nama branch:** `feature/fX-nama-fitur` (contoh: `feature/f2-harvest-timing`).

*Langkah membuat branch baru:*
```bash
git checkout main
git pull origin main
git checkout -b feature/f2-harvest-timing
```

### 2. Penggabungan Kode (Merging)
*   Setelah fitur selesai diimplementasikan dan diverifikasi secara lokal, buat **Pull Request (PR)** dari branch fitur ke `main`.
*   Lakukan review kode sebelum merge disetujui.

---

## 🛠️ Sinkronisasi dengan Branch Backend

Kode backend disimpan dalam branch `backend` pada repositori ini. Untuk dapat menjalankan backend lokal secara bersamaan tanpa mengganggu pengembangan frontend di folder kerja utama, gunakan fitur **`git worktree`**:

### 1. Tambah Worktree Backend
Jalankan perintah ini di terminal folder utama `tani-pintar-ui` untuk meng-checkout branch `backend` ke folder sebelah:
```bash
git worktree add ../tani-pintar-backend origin/backend
```

### 2. Jalankan Backend Lokal
1. Masuk ke folder worktree backend yang baru dibuat:
   ```bash
   cd ../tani-pintar-backend
   ```
2. Instal dependensi dan lakukan sinkronisasi database Prisma:
   ```bash
   npm install
   npx prisma db push
   ```
3. Jalankan server backend (sesuai port konfigurasi, misal `5000`):
   ```bash
   npm run dev
   ```

### 3. Hapus Worktree (Jika Sudah Selesai)
Jika worktree backend sudah tidak digunakan lagi:
```bash
# Kembali ke folder utama
cd ../tani-pintar-ui
# Hapus worktree
git worktree remove ../tani-pintar-backend
```
