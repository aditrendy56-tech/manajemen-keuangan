# Online Sales Fee Architecture (Proposed)

**Date:** 2026-06-13  
**Status:** Documentation only (not executed yet)  
**Scope:** Penjualan online Shopee / GoFood

---

## 1. Goal

Membuat alur penjualan online yang lebih jelas dan akurat:
- uang real yang masuk ke kas = `net_revenue` yang user input sendiri
- item yang terjual tetap dicatat untuk tracking dan analisis
- perbandingan antara harga kalkulasi item vs uang bersih yang diterima dari aplikasi tetap terlihat
- fee / potongan dari marketplace menjadi objek analisis, bukan sesuatu yang harus ditebak otomatis

---

## 2. Core Principle

### Source of Truth
- `net_revenue` = uang real yang benar-benar masuk ke dompet / kas
- `calculated_total` = hasil kalkulasi dari item × harga aplikasi
- `fee_amount` = selisih antara `calculated_total` dan `net_revenue`

Dengan prinsip ini:
- laporan, dashboard, dan cash flow memakai `net_revenue`
- item tracking tetap dipertahankan untuk audit dan analisa
- fee / potongan menjadi jelas sebagai gap yang bisa dianalisa

---

## 3. Proposed Input Flow

### Form Penjualan Online
1. Input `pendapatan bersih dari aplikasi` (utama)
2. Input item yang terjual seperti biasa
3. Sistem menghitung `calculated_total` dari item × harga
4. Sistem menghitung `fee_amount` = `calculated_total - net_revenue`
5. Jika gap terlalu besar, tampilkan warning untuk review manual
6. Simpan data real ke cash / laporan / dashboard

---

## 4. Business Rule

### A. Real Money Rule
- `net_revenue` adalah angka yang dipakai di dashboard, laporan, dan cash flow
- angka ini adalah data yang benar-benar masuk ke kas

### B. Tracking Rule
- item yang terjual tetap diinput untuk melihat apa yang laku
- item data membantu analisis menu / performa / top product

### C. Fee Analysis Rule
- fee / potongan tidak ditebak otomatis sebagai satu angka pasti
- fee dilihat sebagai selisih antara harga kalkulasi dan cash real
- jika gap terlalu besar, tampilkan warning untuk analisa manual

---

## 5. Dashboard / Reporting Impact

### Cash / Dashboard
- gunakan `net_revenue` sebagai angka real
- tampilkan `calculated_total` dan `fee_amount` sebagai visual comparison

### Tab Analisis Fee (planned)
- tampilkan total gross vs net per channel
- tampilkan fee amount dan fee percentage
- tampilkan breakdown Shopee / GoFood / total
- digunakan untuk memantau apakah fee / potongan mulai tidak sehat

---

## 6. Why This Design

- lebih jelas daripada mengandalkan fee otomatis yang sering tidak akurat
- lebih aman karena uang real masuk ke sistem dari input user
- lebih baik untuk analisa fee / potongan dari platform
- tetap menjaga traceability item yang terjual

---

## 7. Implementation Notes

This document is intended as the design reference before implementation.

Planned next steps:
1. add online-sales input form with `net_revenue` on top
2. store `calculated_total`, `fee_amount`, `fee_percentage`, and channel metadata
3. add fee-analysis dashboard tab
4. use `net_revenue` as the real cash amount in reports and dashboard
