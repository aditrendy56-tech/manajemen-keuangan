# ANALISIS SISTEM REDESIGN: HUTANG, CICIL, DAN ALOKASI LABA
*Status: DRAFT ANALYSIS - Butuh approval user*

---

## 1. CURRENT STATE ANALYSIS

### 1.1 Data Reality (Confirmed dari database)
```
Capital Entries (Modal Masuk):
- arya erlangga:        Rp 370,111
- M, Rendi adhitya:     Rp 53,500
- M. Damim:             Rp 101,000
TOTAL:                  Rp 524,611

Financial Accounts:
- kas_utama_balance:    Rp 524,611 (= total modal input)
- profit_pending_balance: Rp 0
- simpan_uang_balance:  Rp 0

Status Investor (SAAT INI - Automatic):
- Semuanya CICIL (karena belum ada repayment)
- Automatic determination dari code: if outstanding > 0 → CICIL
```

### 1.2 Keluhan User (Identified)
1. **Hutang Konsep Tidak Jelas**
   - CICIL status automatic dari code, bukan user input
   - Tidak ada pilihan user: CICIL vs LUNAS vs Installment Plan
   - Jika CICIL, user tidak bisa input "cicil berapa"

2. **Dashboard Kas Utama Tidak Transparan**
   - Card hanya tampil angka Rp 524,611
   - Tidak ada tracking: dari penjualan berapa + dari injek modal berapa
   - User tidak tahu breakdown sumbernya

3. **Alokasi Laba Masih Incomplete**
   - Belum ada role KARYAWAN dalam flow
   - Hanya bisa alokasi untuk investor cicil
   - Tidak ada pemisahan: bayar investor vs bayar karyawan

4. **Pembayaran (Repayment) Flow Mungkin Outdated**
   - Laman pembayaran tidak sesuai structure baru
   - Tidak ada tracking capital_repayments dengan proper linking

---

## 2. BUSINESS LOGIC CLARIFICATION NEEDED

### 2.1 Hutang Status Type
**Current (Automatic):**
- LUNAS: outstanding ≤ 0
- CICIL: outstanding > 0  
- BELUM: no modal input

**Proposed (User Input):**
```
Option A: One-Time Input
├─ Pilihan saat input modal: FULL PAYMENT or CICILAN
│  ├─ FULL PAYMENT: bayar semua sekarang
│  └─ CICILAN: input berapa cicilan/bulan
│
Option B: Dynamic Input
├─ Input modal tanpa pilihan
├─ Saat Alokasi Laba → user choose: mau bayar cicil berapa?
└─ Flexible, bisa berubah per periode

Recommended: OPTION B (flexible, sesuai cash flow)
```

### 2.2 Role Hierarchy & Hutang Ownership
```
OWNER
├─ Punya hutang (invest modal)
├─ Priority 1-3 untuk alokasi cicil
└─ Bisa juga karyawan (perlu double role?)

INVESTOR  
├─ Punya hutang (invest modal)
├─ Priority 4+ untuk alokasi cicil
└─ Tidak bisa karyawan

KARYAWAN
├─ Tidak punya hutang
├─ Hanya dapat alokasi gaji
└─ Bisa juga OWNER atau INVESTOR? (ambiguitas)
```

---

## 3. PROBLEM MAPPING & IMPACT

| # | Problem | Scope | Impact | Dependencies |
|---|---------|-------|--------|--------------|
| P1 | Hutang status automatic, tidak user input | Database + API | Alokasi Laba calculation salah/kurang flexible | **BLOCKER untuk Alokasi Laba** |
| P2 | Kas Utama tracking tidak transparan | UI (Dashboard) | User tidak tahu breakdown kas | Display only, bukan blocker |
| P3 | Karyawan role belum di Alokasi Laba | API + UI | Alokasi incomplete untuk bayar gaji | **Tahap 2, bukan urgent** |
| P4 | Pembayaran (repayment) flow outdated | API + UI | Tidak bisa record capital_repayments | Can integrate setelah P1 fixed |
| P5 | Role ambiguity (owner + karyawan?) | Database | Unclear permission flow | Design issue, perlu clarification |

---

## 4. PROPOSED SOLUTION ROADMAP

### PHASE 1: FIX HUTANG LOGIC (PRIORITY 1 - BLOCKER)
**Goal:** Hutang status jadi user input + flexible

#### Changes Required:
1. **Database Schema**
   - Add column ke `capital_entries`: 
     - `hutang_status` (enum: 'full_payment' | 'cicilan')
     - `cicilan_amount` (nullable, for monthly installment)
     - `cicilan_start_date` (nullable)

2. **API Changes**
   - `/api/investors/{id}/hutang-status` → Return actual status dari DB (bukan automatic)
   - `/api/capital` → Add input modal form dengan pilihan status

3. **UI Changes**
   - Modal Masuk page: Tambah pilihan FULL vs CICILAN
   - If CICILAN selected: show input "Rp/bulan"
   - Alokasi Laba page: Show actual status, tidak hardcoded

4. **Alokasi Laba Impact**
   - Step 2-3: Ambil status dari capital_entries.hutang_status
   - Jika FULL_PAYMENT: skip dari hutang allocation
   - Jika CICILAN: alokasikan sesuai cicilan_amount

**Implementation:**
```sql
-- Phase 1 Migration
ALTER TABLE capital_entries ADD COLUMN hutang_status VARCHAR(20) DEFAULT 'cicilan';
ALTER TABLE capital_entries ADD COLUMN cicilan_amount INTEGER;
ALTER TABLE capital_entries ADD COLUMN cicilan_start_date DATE;

-- Update existing (semua jadi CICILAN)
UPDATE capital_entries SET hutang_status = 'cicilan' WHERE investor_id IS NOT NULL;
```

**Timeline:** 1-2 hari

---

### PHASE 2: DASHBOARD KAS UTAMA TRACKING PANEL (PRIORITY 2)
**Goal:** User bisa lihat breakdown kas utama: dari penjualan + dari modal injek

#### Changes Required:
1. **API New Endpoint**
   - `/api/cash/kas-utama-tracking?outlet_id=...`
   - Return:
     ```json
     {
       "current_balance": 524611,
       "sources": [
         { "source": "capital_input", "amount": 524611, "date": "2026-06-08" },
         { "source": "sales", "amount": 0, "date": null },
         { "source": "allocation_profit", "amount": 0, "date": null }
       ],
       "outflows": [
         { "purpose": "expenses", "amount": 0, "date": null },
         { "purpose": "allocation_cicilan", "amount": 0, "date": null }
       ]
     }
     ```

2. **UI Component**
   - Dashboard → Add new Card: "Tracking Kas Utama"
   - Show sources breakdown
   - Show outflows breakdown
   - Timeline view (optional)

**Timeline:** 1 hari

---

### PHASE 3: ADD KARYAWAN ROLE DALAM ALOKASI LABA (PRIORITY 3)
**Goal:** Alokasi laba bisa untuk bayar investor cicil + karyawan

#### Changes Required:
1. **Database**
   - `profit_allocations` table: Add columns:
     - `karyawan_allocations` (JSONB)
     - `employee_mode` ('include' | 'exclude')

2. **Alokasi Laba Flow**
   - Step 1: Load data
   - Step 2-3: Hutang investor (existing)
   - **NEW Step 4: Choose employee mode**
     - Option A: Non-karyawan (skip employee allocation)
     - Option B: Include Karyawan (allocate to employees)
   - Step 5-8: Rest of flow

3. **API Update**
   - `/api/profit-allocations` → Accept `employee_mode` flag
   - `/api/employees` → Fetch active employees for allocation

4. **UI Component**
   - New step in wizard: "Pilihan Alokasi Karyawan"
   - Radio: Include / Exclude
   - If Include: show employee list + allocation amount input

**Timeline:** 2-3 hari

---

### PHASE 4: FIX PEMBAYARAN (REPAYMENT) FLOW (PRIORITY 4)
**Goal:** Pembayaran page jadi relevant dengan structure baru

#### Changes Required:
1. **API**
   - `/api/capital-repayments` → Track pembayaran cicilan
   - Link dengan `capital_entries` dan investor

2. **UI**
   - Pembayaran page: Show investor hutang sisa
   - Input: pembayaran untuk investor mana, berapa
   - Save → Create capital_repayments record

3. **Alokasi Laba Integration**
   - After save allocation → auto create repayment records?
   - atau manual di Pembayaran page?

**Timeline:** 2 hari (after Phase 1 done)

---

### PHASE 5: ROLE CLARITY & PERMISSION (PRIORITY 5)
**Goal:** Jelas owner/investor/karyawan itu apa, bisa double role atau tidak

#### Design Decision Needed:
```
Question 1: Bisa karyawan + owner sekaligus?
- Option A: Ya, via double role (user punya both)
- Option B: Tidak, harus pilih satu

Question 2: Karyawan bisa invest modal?
- Option A: Ya, bisa invest (karyawan + investor)
- Option B: Tidak, hanya owner/investor bisa

Question 3: Owner/Investor bisa dapat gaji karyawan?
- Option A: Ya
- Option B: Tidak (either hutang cicil OR gaji)
```

**Timeline:** Design only, 0.5 hari

---

## 5. IMPLEMENTATION PLAN (SEQUENCE)

| Phase | Task | Dependencies | Timeline | Effort |
|-------|------|--------------|----------|--------|
| 1 | P1: Fix Hutang Logic | None | 1-2d | HIGH |
| 2 | P2: Dashboard Tracking | Phase 1 ✅ | 1d | MEDIUM |
| 3 | P3: Karyawan Role | Phase 1 ✅ | 2-3d | HIGH |
| 4 | P4: Pembayaran Flow | Phase 1 ✅ | 2d | MEDIUM |
| 5 | P5: Role Clarity | All above | 0.5d | LOW |

**Total Effort:** 6-9 hari

**Recommended Start:** Phase 1 ASAP (it's blocker), then 2, then 3+4 in parallel

---

## 6. DECISION POINTS (Awaiting User Input)

### Decision 1: Hutang Input Approach
```
Option A: Input saat Modal Masuk (one-time)
- User pilih: FULL vs CICILAN saat first input
- Pro: Clear dari awal
- Con: Tidak flexible kalau situation change

Option B: Input saat Alokasi Laba (dynamic)  
- User tinggal input modal tanpa pilihan
- Pilih cicilan amount saat alokasi laba
- Pro: Flexible, bisa adjust per periode
- Con: Perlu lebih complex logic di allocation

RECOMMENDATION: Option B (lebih sesuai cash flow bisnis)
```

### Decision 2: Role Double-Role Support
```
Butuh clarification: 
- Owner bisa jadi karyawan?
- Investor bisa dapat gaji?
- Karyawan bisa punya hutang?

Ini perlu business rule yg jelas
```

### Decision 3: Phase Prioritization
```
Urgent (mulai hari ini):
1. Phase 1 (Fix Hutang Logic) - BLOCKER

Normal:
2. Phase 2 (Dashboard) - visibility
3. Phase 3 (Karyawan) - feature

Later:
4. Phase 4 (Pembayaran) - after testing
5. Phase 5 (Role) - design clarification
```

---

## 7. SUMMARY FOR USER REVIEW

**✅ Confirmed Issues:**
1. Hutang CICIL automatic (dari code), bukan user input
2. Kas Utama tidak transparan (no breakdown)
3. Alokasi Laba incomplete (no karyawan)
4. Role structure ambiguous

**🛠️ Proposed Fixes:**
- Phase 1: Add user input untuk hutang status/cicilan
- Phase 2: Dashboard tracking panel untuk kas utama
- Phase 3: Add karyawan flow dalam alokasi laba  
- Phase 4: Fix repayment/pembayaran flow
- Phase 5: Clarify role permission

**⏱️ Timeline:**
- Phase 1: 1-2 hari (BLOCKER, must do first)
- Phases 2-5: 7-8 hari (can parallel)

**🎯 Next Step:**
User review + approve:
1. Hutang input approach (Option A vs B?)
2. Role double-role support?
3. Phase prioritization?

---

*Dibuat: 2026-06-11*
*Status: Awaiting user approval untuk start implementation*
