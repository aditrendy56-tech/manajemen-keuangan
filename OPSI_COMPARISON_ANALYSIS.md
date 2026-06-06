# 📊 OPSI COMPARISON ANALYSIS - Profit Calculation Formulas

**Tujuan:** Menunjukkan perbedaan 3 opsi perhitungan profit dengan contoh konkret yang sama

---

## **SETUP CONTOH - SAMA UNTUK SEMUA OPSI**

### Kondisi Bulan 1:

```
3 Owner: Rendy, Arya, Damim
├─ Modal each: Rp 500rb
└─ Total Modal: Rp 1.5juta

TRANSAKSI BULAN 1:

Penjualan (dari sales): Rp 4juta
├─ GoFood: Rp 1.6juta
├─ Offline: Rp 1.4juta
└─ ShopeeFood: Rp 900rb

Pengeluaran dari KAS (operasional):
├─ Listrik: Rp 80rb
├─ Gas: Rp 50rb
├─ Gaji: Rp 100rb
├─ Misc: Rp 70rb
└─ Subtotal: Rp 300rb ✅

Pengeluaran dari MODAL (beli asset):
├─ Bahan (Damim inject): Rp 500rb
├─ Kompor (Rendy inject): Rp 250rb
├─ Meja (Arya inject): Rp 250rb
└─ Subtotal: Rp 1juta ✅
```

---

## **OPSI A - RECOMMENDED ✅ (YANG SAYA SARANKAN)**

### Formula:
```
Profit = Penjualan - Operasional (KAS ONLY)

Bahan & Peralatan = ASSET (tidak langsung expense)
Modal Repayment = SEPARATE (tidak tercampur profit)
```

### Kalkulasi:

```
GROSS PROFIT:
═════════════
Penjualan: Rp 4juta
Less: Operasional dari Kas: (Rp 300rb)
─────────────────────────────────
GROSS PROFIT: Rp 3.7juta

❌ JANGAN potong:
├─ Bahan Rp 500rb (asset)
└─ Peralatan Rp 500rb (asset)

✅ Asset ini masuk Balance Sheet, bukan income statement


SETTLEMENT AKHIR BULAN:
═══════════════════════

1. ALOKASI LABA (Tab 2):
   ├─ Input Laba Bersih: Rp 3.7juta
   ├─ Less: Reserve Kas: (Rp 300rb)
   ├─ Sisa untuk dibagi: Rp 3.4juta
   │
   ├─ Rendy: Rp 1.13juta
   ├─ Arya: Rp 1.13juta
   └─ Damim: Rp 1.14juta

2. PEMBAYARAN BALIK MODAL (Tab 3):
   ├─ Rendy: Rp 500rb (LUNAS) ✅
   ├─ Arya: Rp 500rb (LUNAS) ✅
   └─ Damim: Rp 500rb (LUNAS) ✅
   
   Note: Uang cukup untuk balik penuh!


RESULT PER OWNER:
═════════════════
Rendy:
├─ Profit: Rp 1.13juta
├─ Modal Balik: Rp 500rb
├─ TOTAL DAPAT: Rp 1.63juta
└─ Modal Status: CLEAR ✅

Arya:
├─ Profit: Rp 1.13juta
├─ Modal Balik: Rp 500rb
├─ TOTAL DAPAT: Rp 1.63juta
└─ Modal Status: CLEAR ✅

Damim:
├─ Profit: Rp 1.14juta
├─ Modal Balik: Rp 500rb
├─ TOTAL DAPAT: Rp 1.64juta
└─ Modal Status: CLEAR ✅


CASH FLOW VERIFICATION:
═══════════════════════
Masuk:
├─ Penjualan: Rp 4juta
├─ Modal Rendy: Rp 500rb
├─ Modal Arya: Rp 500rb
├─ Modal Damim: Rp 500rb
└─ TOTAL: Rp 5.5juta

Keluar:
├─ Operasional: Rp 300rb
├─ Bahan: Rp 500rb
├─ Peralatan: Rp 500rb
├─ Balik Modal: Rp 1.5juta
├─ Profit ke owner: Rp 3.4juta
└─ TOTAL: Rp 6.2juta ❌ LEBIH!

⚠️ WAIT! Ini error!
   Sebenarnya profit Rp 3.4juta itu sudah dalam operating cash!
   Jadi tidak "keluar" lagi dari kas!

CORRECT CALCULATION:
├─ Cash in: Rp 5.5juta
├─ Keluar (tangible): Rp 300rb + Rp 500rb + Rp 500rb + Rp 1.5juta = Rp 2.8juta
├─ Sisa kas: Rp 5.5juta - Rp 2.8juta = Rp 2.7juta
├─ Reserve Kas: Rp 300rb
├─ Profit (dari operating cash): Rp 3.4juta
│  └─ Ini BAGIAN dari Rp 3.7juta operating cash, bukan "keluar" lagi
└─ ✅ SEIMBANG!
```

---

## **OPSI B - EXCLUDE SEMUA EXPENSE (Alternatif)**

### Formula:
```
Profit = Penjualan - Semua Expense (termasuk bahan & peralatan)

Semua pengeluaran potong dari profit (baik KAS maupun MODAL)
Modal Repayment = INCLUDED dalam profit calculation
```

### Kalkulasi:

```
PROFIT CALCULATION:
═══════════════════
Penjualan: Rp 4juta
Less: Operasional (kas): (Rp 300rb)
Less: Bahan (modal): (Rp 500rb)
Less: Peralatan (modal): (Rp 500rb)
─────────────────────────
PROFIT: Rp 2.7juta

⚠️ MASALAH:
├─ Bahan & peralatan langsung jadi expense
├─ Padahal itu ASSET (harusnya di balance sheet)
└─ Over-state pengeluaran, under-state profit!


SETTLEMENT AKHIR BULAN:
═══════════════════════

1. ALOKASI LABA (Tab 2):
   ├─ Input Laba Bersih: Rp 2.7juta
   ├─ Less: Reserve Kas: (Rp 300rb)
   ├─ Sisa untuk dibagi: Rp 2.4juta
   │
   ├─ Rendy: Rp 800rb
   ├─ Arya: Rp 800rb
   └─ Damim: Rp 800rb

2. PEMBAYARAN BALIK MODAL (Tab 3):
   ├─ Rendy: Rp 500rb (LUNAS) ✅
   ├─ Arya: Rp 500rb (LUNAS) ✅
   └─ Damim: Rp 500rb (LUNAS) ✅

RESULT PER OWNER:
═════════════════
Rendy:
├─ Profit: Rp 800rb
├─ Modal Balik: Rp 500rb
├─ TOTAL DAPAT: Rp 1.3juta
└─ Modal Status: CLEAR ✅

Arya:
├─ Profit: Rp 800rb
├─ Modal Balik: Rp 500rb
├─ TOTAL DAPAT: Rp 1.3juta
└─ Modal Status: CLEAR ✅

Damim:
├─ Profit: Rp 800rb
├─ Modal Balik: Rp 500rb
├─ TOTAL DAPAT: Rp 1.3juta
└─ Modal Status: CLEAR ✅


MASALAH DENGAN OPSI B:
══════════════════════
1. ❌ Profit terlalu rendah (Rp 2.7juta vs Rp 3.7juta)
2. ❌ Bahan & peralatan jadi "expense", padahal harusnya asset
3. ❌ Tidak sesuai dengan proper accounting
4. ✅ Tapi: Lebih conservative (hati-hati)
```

---

## **OPSI C - EXCLUDE MODAL DARI EXPENSE (Hybrid)**

### Formula:
```
Profit = Penjualan - Operasional ONLY

Bahan & Peralatan dari MODAL = NOT expense (investment/asset)
Modal Repayment = SEPARATE (clear distinction)

Ini MIRIP OPSI A, tapi phrasing/mindset berbeda
```

### Kalkulasi:

```
PROFIT CALCULATION:
═══════════════════
Penjualan: Rp 4juta
Less: Operasional (dari kas): (Rp 300rb)
─────────────────────────
GROSS PROFIT: Rp 3.7juta

❌ JANGAN potong bahan & peralatan dari modal
   (Ini capital expenditure, bukan operating expense)

✅ Asset tracking separate


SETTLEMENT AKHIR BULAN:
═══════════════════════

1. ALOKASI LABA (Tab 2):
   ├─ Input Laba Bersih: Rp 3.7juta
   ├─ Less: Reserve Kas: (Rp 300rb)
   ├─ Sisa untuk dibagi: Rp 3.4juta
   │
   ├─ Rendy: Rp 1.13juta
   ├─ Arya: Rp 1.13juta
   └─ Damim: Rp 1.14juta

2. PEMBAYARAN BALIK MODAL (Tab 3):
   ├─ Rendy: Rp 500rb (LUNAS) ✅
   ├─ Arya: Rp 500rb (LUNAS) ✅
   └─ Damim: Rp 500rb (LUNAS) ✅

RESULT: SAMA DENGAN OPSI A!
═════════════════════════════
Setiap owner: Rp 1.63-1.64juta


PERBEDAAN OPSI A vs C:
══════════════════════
Sebenarnya SAMA dalam hasil akhir!
├─ Perbedaan hanya di mindset/phrasing
├─ OPSI A: "Asset tidak langsung expense"
└─ OPSI C: "Capital expenditure ≠ operating expense"
```

---

## **COMPARISON TABLE - RINGKAS**

| Aspek | Opsi A (Recommended) | Opsi B | Opsi C |
|-------|----------------------|--------|--------|
| **Formula Profit** | Penjualan - Operasional | Penjualan - All Expense | Penjualan - Operasional |
| **Profit Hasil** | Rp 3.7juta | Rp 2.7juta | Rp 3.7juta |
| **Bahan/Peralatan** | Asset ✅ | Expense ❌ | Asset ✅ |
| **Per Owner Dapat** | Rp 1.63juta | Rp 1.3juta | Rp 1.63juta |
| **Accounting Standard** | ✅ PROPER | ❌ Simplified | ✅ PROPER |
| **Transparency** | ✅ Clear | ⚠️ Ambigu | ✅ Clear |
| **Rekomendasi** | **✅ PILIH INI!** | Hanya jika very conservative | Sama dengan A |

---

## **SKENARIO PENJUALAN KECIL - OPSI CICIL**

Kalau penjualan bulan 1 hanya Rp 2.5juta:

```
PENJUALAN: Rp 2.5juta
Less: Operasional: (Rp 200rb)
─────────────────────
GROSS PROFIT: Rp 2.3juta

Kalau pakai OPSI A:
├─ Reserve Kas: (Rp 300rb)
├─ Sisa untuk dibagi: Rp 2juta
├─ Profit per owner: Rp 667rb
│
├─ Modal Balik - MASALAH: Rp 1.5juta pending!
│  └─ Cash tidak cukup untuk balik penuh!
│
└─ SOLUSI: CICIL!
   ├─ Balik modal sebagian: Rp 1juta (dari available cash)
   │  ├─ Rendy: Rp 333rb
   │  ├─ Arya: Rp 333rb
   │  └─ Damim: Rp 334rb
   │
   ├─ Sisa modal pending: Rp 500rb (untuk balik bulan depan)
   ├─ Profit dibagi: Rp 2juta ÷ 3 = Rp 667rb
   │
   └─ RESULT:
      ├─ Owner dapat: Rp 667rb profit + Rp 333rb balik modal = Rp 1juta
      ├─ Modal sisa pending: Rp 167rb × 3 = Rp 500rb
      └─ Lanjut bulan 2: Balik sisa modal dulu
```

---

## **KESIMPULAN**

```
✅ GUNAKAN OPSI A (yang saya rekomendasikan):
   ├─ Profit = Penjualan - Operasional ONLY
   ├─ Bahan & Peralatan = Asset (balance sheet)
   ├─ Modal Repayment = Separate (liabilitas)
   └─ Transparansi maksimal! ✅

⚠️ JANGAN gunakan Opsi B:
   └─ Terlalu conservative, profit jadi terlihat kecil

ℹ️ OPSI C = Sama dengan A, hanya phrasing beda
```

---

**File ini untuk reference ketika ada pertanyaan tentang "kenapa harus begini" untuk profit calculation!**
