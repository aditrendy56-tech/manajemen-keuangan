Ringkasan Masalah Keamanan & Rekomendasi Perbaikan
=================================================

Tujuan: ringkas isu yang ditemukan dari `npm audit`, jelaskan mengapa berbahaya, dan berikan langkah mitigasi cepat agar sistem bisa dipakai hari ini, serta rencana perbaikan jangka menengah.

1) Temuan utama
----------------
- `xlsx` (SheetJS) — *High* (Prototype Pollution + ReDoS)
  - Lokasi penggunaan: `src/lib/export/excel.ts`, `src/app/api/reports/export/route.ts`.
  - Status di repo: hanya untuk *menulis* laporan XLSX (tidak mem-parsing upload pengguna).

- `postcss` (via `next`) — *Moderate* (XSS pada hasil stringify CSS)
  - Perbaikan upstream memerlukan upgrade mayor `next`/`postcss` (potensial breaking change).

- (Sebelumnya) `esbuild`/`vite` chain terkait test tooling — sebagian sudah dihapus ketika kita membatalkan setup Vitest.

2) Mengapa ini berbahaya
-------------------------
- Prototype Pollution (xlsx): memungkinkan attacker memodifikasi prototype objek yang dapat mengubah perilaku aplikasi di runtime jika library mem-parsing input yang berbahaya. Risiko tinggi jika aplikasi menerima file XLSX dari pengguna.
- ReDoS (xlsx): file tertentu bisa membuat regex bekerja lama sehingga menimbulkan denial-of-service.
- XSS (postcss): jika pipeline menghasilkan CSS dari sumber tak tepercaya, output bisa menyisipkan payload `</style>` yang menyebabkan XSS.

3) Risiko nyata untuk sistem kamu sekarang
-----------------------------------------
- Karena penggunaan `xlsx` di repo hanya untuk *menulis* file server-side, eksposurnya relatif rendah hari ini (selama tidak ada parsing XLSX dari pengguna). Namun tetap (a) catat sebagai technical debt, (b) pantau patch upstream.
- `postcss`/`next` issue berpotensi muncul saat membundling CSS; jika kamu tidak mengizinkan CSS input dari user, immediate risk rendah, tetapi upgrade `next` harus direncanakan.

4) Mitigasi cepat (agar sistem jalan hari ini)
-----------------------------------------------
Lakukan langkah-langkah ini sekarang supaya tim dapat terus menggunakan aplikasi:

- Jangan jalankan `npm audit fix --force`.
- Pastikan endpoint export XLSX TIDAK pernah mem-parsing file XLSX dari pengguna. Jika ada upload, matikan fitur upload untuk sementara.
- Backup DB jika akan melakukan perubahan schema atau menjalankan alokasi yang menulis kas.
- Jalankan migrasi & seed (selama belum diterapkan):

  ```bash
  # jalankan migrasi SQL di Supabase SQL Editor atau psql
  # 1) terapkan migration-allocations-schema.sql
  # 2) jalankan migrations/seed-allocation-default.sql (opsional)
  ```

- Akses environment variables: pastikan `NEXT_PUBLIC_SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` tersedia untuk environment server.
- Lakukan smoke test: buka UI funding -> lakukan Preview (dry-run) untuk sebuah bulan; verifikasi preview; jika OK, eksekusi satu kali untuk menguji write flow pada data contoh.
- Pantau logs dan tabel: `cash_transactions`, `allocation_runs`, `allocation_items`, `investors.remaining_balance`.

5) Rencana perbaikan jangka menengah (rekomendasi)
--------------------------------------------------
- Ganti `xlsx` dengan library yang hanya menulis (mis. `exceljs`) atau gunakan adapter yang tidak memiliki sejarah Prototype Pollution. Saya bisa melakukan migrasi ini (sedikit perubahan di 2 file).
- Rencanakan upgrade `next` + `postcss` di branch terpisah: buat checklist testing, perbaiki breaking changes, jalankan full test & build.
- Tambahkan CI untuk menjalankan smoke tests dan audit dependency setelah upgrade.
- Tambahkan unit tests + integration tests untuk `computeAllocationPreview()` dan `executeAllocation()` (agar upgrades lebih aman).
- Pertimbangkan periodic `npm audit` dan dependabot/GitHub Dependabot untuk menerima PR update paket secara teratur.

6) Rekomendasi jangka panjang (keamanan & proses)
-------------------------------------------------
- Pisahkan library yang menulis file (server-side) dengan ketat: jangan parsing file dari user kecuali perlu; jika perlu, gunakan sandboxed/parsing library yang aman.
- Terapkan policy backup & rollback sebelum eksekusi operasi finansial otomatis.
- Dokumentasikan RLS/permissions Supabase dan pastikan service-role kunci hanya di server.

7) Checklist tindakan singkat yang bisa kamu jalankan sekarang (urut)
----------------------------------------------------------------------
- [ ] Pastikan repo commit bersih: `git add -A && git commit -m "checkpoint"`
- [ ] Jalankan `npm install` (sudah dilakukan); jika muncul vulns, catat.
- [ ] Terapkan migration SQL ke Supabase (jika belum): `migrations/migration-allocations-schema.sql`
- [ ] Jalankan seed (opsional): `migrations/seed-allocation-default.sql`
- [ ] Restart server: `npm run dev` atau `npm start` di production build
- [ ] Smoke test: dry-run preview di UI, lalu (jika aman) eksekusi 1 run
- [ ] Verifikasi tabel `cash_transactions` dan `allocation_runs`

8) Jika mau saya bantu selesaikan:
----------------------------------
- Migrasi export XLSX ke `exceljs` sekarang (saya ubah `src/lib/export/excel.ts` dan `src/app/api/reports/export/route.ts`).
- Tambahkan CI job sederhana untuk menjalankan `npm audit` + smoke tests.
- Bantu uji dan jalankan migrations di Supabase (langkah per langkah).

Catatan: file ini dibuat otomatis oleh asisten — beri tahu saya jika mau saya commit perubahan ini ke git dan/atau buat issue tracker (GitHub issue) untuk follow-up.
