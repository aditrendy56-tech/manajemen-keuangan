# FIX: Sales Input Error - Database Schema Missing Columns

## Problem
Error: `Could not find the 'calculated_total' column of 'sales' in the schema cache`

Ini terjadi karena fitur online sales fee analysis menambahkan kolom baru ke database, tapi migration belum dijalankan di Supabase.

## Solution

### Langkah 1: Jalankan Migration di Supabase

1. **Buka [Supabase Console](https://app.supabase.com)** → pilih project kamu
2. **Pilih tab "SQL Editor"** (atau "SQL" di sidebar)
3. **Buat query baru** atau buka query existing, kemudian **copy-paste semua kode ini**:

```sql
-- Migration: Add online sales fee analysis columns
-- Date: 2026-06-13
-- Purpose: Support calculated_total, fee_amount, fee_percentage for online sales gap analysis

ALTER TABLE IF EXISTS sales
ADD COLUMN IF NOT EXISTS calculated_total NUMERIC NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fee_amount NUMERIC NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fee_percentage NUMERIC NULL DEFAULT NULL;

COMMENT ON COLUMN sales.calculated_total IS 'Calculated total from item prices (used for online sales fee analysis)';
COMMENT ON COLUMN sales.fee_amount IS 'Fee/gap amount between calculated_total and net_amount (used for online sales fee analysis)';
COMMENT ON COLUMN sales.fee_percentage IS 'Fee percentage calculated as (fee_amount / calculated_total) * 100';

-- Index untuk query fee analysis
CREATE INDEX IF NOT EXISTS idx_sales_calculated_total ON sales(calculated_total) WHERE calculated_total IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_fee_amount ON sales(fee_amount) WHERE fee_amount IS NOT NULL;
```

4. **Klik tombol "Run"** atau tekan `Ctrl+Enter`
5. Tunggu sampai ada notifikasi "Success" atau response ditampilkan

### Langkah 2: Verifikasi Migration Berhasil

Setelah migration selesai, cek apakah kolom sudah ada dengan query ini di SQL Editor:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'sales' AND column_name IN ('calculated_total', 'fee_amount', 'fee_percentage');
```

Harusnya menampilkan 3 baris dengan kolom-kolom tersebut.

### Langkah 3: Test Sales Input

1. **Reload aplikasi** (F5 atau Cmd+R)
2. **Buka Sesi Harian** di dashboard
3. **Input penjualan baru**:
   - **Offline**: Pilih channel "Offline" → input items → submit
   - **Online**: Pilih channel "Online" → pilih platform → input "Pendapatan Bersih" → submit

Sales seharusnya bisa diterima sekarang tanpa error.

## Technical Details

### Apa yang ditambahkan?

- **`calculated_total`** (NUMERIC): Total kalkulasi dari item × harga aplikasi
- **`fee_amount`** (NUMERIC): Selisih antara calculated_total dan net_amount
- **`fee_percentage`** (NUMERIC): Persentase fee = (fee_amount / calculated_total) * 100

### Kenapa diperlukan?

Fitur online sales fee analysis memerlukan kolom-kolom ini untuk:
1. Menyimpan analisis fee gap antara harga kalkulasi dan uang bersih yang diterima
2. Menampilkan fee breakdown di laporan keuangan
3. Memberikan warning jika ada gap fee yang tidak normal

### API Fallback

Code sudah diupdate untuk handle gracefully jika kolom belum ada (fallback ke schema lama), tapi harus jalankan migration untuk fungsionalitas penuh.

## Troubleshooting

**Q: Migration tidak bisa dijalankan (error timeout?)**
- Coba jalankan ulang, atau hubungi Supabase support

**Q: Masih error setelah migration?**
- Reload aplikasi di browser (Ctrl+Shift+Delete cache, atau Private/Incognito window)
- Check network tab di DevTools untuk memastikan API call ke `/api/sales` berhasil

**Q: Laporan tidak menampilkan fee analysis?**
- Buat penjualan online baru setelah migration berjalan
- Laporan hanya menampilkan analisis untuk sales yang dibuat SETELAH kolom ditambahkan

---

**Status**: Migration di-commit ke branch `main` (commit 719f72e)  
**Files Modified**:
- ✅ `migrations/migration-online-sales-fee-analysis.sql` (baru)
- ✅ `src/app/api/sales/route.ts` (fallback handling)
- ✅ `src/types/index.ts` (fee analysis fields in types)
- ✅ `src/app/api/reports/summary/route.ts` (fee analysis metrics)
- ✅ `src/components/tables/ReportsTable.tsx` (fee display in report UI)
