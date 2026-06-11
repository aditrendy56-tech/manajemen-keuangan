# 🏗️ COMPREHENSIVE SYSTEM REFACTOR v2.0 - IMPLEMENTATION GUIDE

**Status:** 🔧 PLANNING PHASE (2026-06-11)  
**Version:** 2.0 - MAJOR SYSTEM REDESIGN  
**Date Created:** 2026-06-11  
**Owner:** User + Development Team  
**Priority:** CRITICAL - Business Logic Foundation

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [New Architecture](#new-architecture)
4. [Implementation Details](#implementation-details)
5. [Implementation Phases](#implementation-phases)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Success Metrics](#success-metrics)

---

## 📊 EXECUTIVE SUMMARY

### What Changed

This is a **COMPLETE SYSTEM REDESIGN** from simplified expense tracking (v1.0) to **enterprise-grade financial management system** with proper business logic for investment management.

### Key Evolution

```
v1.0 (Simplified):              v2.0 (Redesigned):
- Single Kas bucket       →     - Dual bucket (Kas Utama + Profit Pending)
- Manual allocation       →     - Auto-split sales (60-40)
- No hutang check         →     - Hutang PRIORITY (checked first)
- All investors equal     →     - Investor differentiation (LUNAS/CICIL/BELUM)
- Basic forms             →     - Smart validation + real-time feedback
- NO Simpan Uang          →     - Strategic fund tracking + history
- NO Kasir Dari           →     - Expense source tracking per bucket
- NO auto-actions         →     - Automated workflows
```

### Why Redesign Now?

During profit allocation discussion (2026-06-11), discovered current system **CANNOT** fairly handle:
- ❌ Investor hutang management with priority
- ❌ Profit sharing differentiation (LUNAS vs CICIL)
- ❌ Clear separation: cash vs accounting profit
- ❌ Strategic fund allocation & tracking
- ❌ Real-time cash position per bucket

### Business Logic Foundation

**New principle:** BAYAR HUTANG DULU, BARU BAGIKAN PROFIT

```
PROFIT ALLOCATION LOGIC:

Profit Pending: Rp 9M
├─ Step 1: Auto-deduct Hutang (Rp 11M)
│  └─ Create auto repayment entries
│
├─ Step 2: Allocate Kas Utama (Rp 4M)
│  └─ For next month operations
│
├─ Step 3: Allocate Simpan Uang (Rp 2M)
│  └─ Strategic fund with reason tracking
│
└─ Step 4: Bagikan Sisa Profit (Rp -8M)
   └─ HANYA ke investor LUNAS (tidak ada sisa)
   
Investor Status Impact:
├─ LUNAS: dapat profit share ✅
├─ CICIL: dapat 0 (sudah dapat bayar balik) ⚠️
└─ BELUM: dapat 0 (harus bayar dulu) ❌
```

---

## 🎯 PROBLEM STATEMENT - WHY REDESIGN?

### Issues with v1.0 System

1. **No Hutang Priority:**
   - Investor bayar modal, tapi profit dibagi ke semua
   - Tidak ada enforcement: bayar hutang dulu, baru dapat profit
   - Logic salah: investor cicil dapat profit padahal modal belum kembali
   - **Impact:** Unfair distribution, investor frustration

2. **Single Kas Bucket Problem:**
   - Sales langsung masuk Kas Utama (not segregated)
   - Operasional ambil dari Kas (no control)
   - Profit "calculated" tapi tidak ada di kas
   - Confusion: "Profit Rp 9M tapi kas hanya Rp 6.5M - duit mana?"
   - **Impact:** User confusion, unclear cash position

3. **No Strategic Fund:**
   - Tidak ada tempat untuk "simpan" untuk kebutuhan besar
   - Semua uang untuk operasional atau dibagi
   - Sulit grow (no emergency fund)
   - **Impact:** Business fragility

4. **Expense Tracking Limited:**
   - Hanya category, tidak clear from mana
   - Kasir tidak bisa pilih: dari Kas Utama atau Simpan Uang
   - No real-time balance check per bucket
   - **Impact:** Risk overspending, no control

5. **Investor Status Not Differentiated:**
   - Investor LUNAS vs CICIL diperlakukan sama
   - Business logic says: LUNAS dapat profit, CICIL tidak
   - System tidak enforce
   - **Impact:** Unfair business logic

---

## 🏗️ NEW ARCHITECTURE (v2.0)

### Three-Bucket Financial Model

```
┌─────────────────────────────────────────────────────┐
│ SALES MASUK: Rp 500k                               │
├─────────────────────────────────────────────────────┤
│                    AUTO-SPLIT 60-40                 │
├──────────────────────┬──────────────────────────────┤
│                      │                              │
│ Rp 300k (60%)        │ Rp 200k (40%)               │
│ KAS UTAMA            │ PROFIT PENDING              │
│ Daily Operations     │ For Allocation              │
│ Real-time deduct     │ LOCKED                      │
│ Tracked per expense  │ Handled monthly             │
│                      │                              │
└──────────────────────┴──────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ ALOKASI PROFIT - Profit Pending Rp 9M              │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 1️⃣ Bayar Hutang: -Rp 8M (auto-deduct first!)      │
│ 2️⃣ Kas Utama Top-up: -Rp 4M (next month)          │
│ 3️⃣ Simpan Uang: -Rp 2M (strategic)                │
│ 4️⃣ Profit Share: +Rp -5M (only LUNAS get)         │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ SIMPAN UANG - Strategic Fund                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Source: Manual allocation dari profit              │
│ Tracking: Full history (date, amount, reason)      │
│ Usage: Emergency, growth, equipment                │
│ Separate: Different bucket dari Kas Utama          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Daily Workflow

```
SETIAP HARI - Auto-Split Sales:

1. Sales masuk Rp 500k
2. System automatic:
   ├─ Create Rp 300k (60%) entry → kas_utama
   ├─ Create Rp 200k (40%) entry → profit_pending
   └─ Update financial_accounts balances
3. Dashboard refresh real-time
4. User lihat: Kas+Profit updated immediately

Kasir Beli Bahan:
1. Input expense: Rp 100k, kategori "Bahan"
2. Select "Kasir Dari": Kas Utama (dropdown)
3. System validate: Kas Utama Rp 300k >= Rp 100k ✓
4. Submit → Deduct from Kas Utama
5. Result: Kas Utama jadi Rp 200k
```

### Monthly Workflow

```
SETIAP BULAN - Alokasi Laba:

Accumulated:
├─ Profit Pending: Rp 9M (40% dari sales sepanjang bulan)
├─ Kasir Dari: Rp 5.5M (sisa setelah operasional)
└─ Hutang Outstanding: Rp 11M

Step 1: Check Hutang (REQUIRED - Show to user)
├─ Owner: LUNAS ✓
├─ Investor A: CICIL (sisa Rp 3M) ⚠️
└─ Investor B: CICIL (sisa Rp 8M) ⚠️

Step 2: Ask User
└─ "Profit Rp 9M tapi Kas Rp 5.5M"
   ├─ Full profit (defer cash) → select
   ├─ Available kas only → select
   └─ Custom → input

Step 3: Auto-deduct Hutang (NO CHOICE - Priority)
├─ Rp 3M → Investor A (LUNAS) ✓
├─ Rp 5M → Investor B (sisa Rp 3M)
└─ Remaining: Rp 1M

Step 4: Allocate Kas Utama
├─ Input: Rp 0.5M (next month ops estimate)
└─ Remaining: Rp 0.5M

Step 5: Allocate Simpan Uang
├─ Input: Rp 0.3M
├─ Reason: "Emergency Fund"
└─ Create simpan_uang_allocations entry

Step 6: Calculate Profit Share
├─ Remaining: Rp 0.2M
├─ Owner (50%): Rp 0.1M ✓ (LUNAS dapat)
├─ Investor A (25%): Rp 0 (tapi dapat Rp 3M bayar balik)
└─ Investor B (25%): Rp 0 (tapi dapat Rp 5M bayar balik)

Step 7: Save & Done
└─ Update financial_accounts, create records, dashboard refresh
```

---

## 💾 IMPLEMENTATION DETAILS

### Database Changes

#### ADD Tables:

**1. financial_accounts (NEW)**
```sql
CREATE TABLE financial_accounts (
  id UUID PRIMARY KEY,
  outlet_id UUID REFERENCES outlets(id),
  
  kas_utama_balance DECIMAL(15,2) DEFAULT 0,
  profit_pending_balance DECIMAL(15,2) DEFAULT 0,
  simpan_uang_balance DECIMAL(15,2) DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**2. simpan_uang_allocations (NEW)**
```sql
CREATE TABLE simpan_uang_allocations (
  id UUID PRIMARY KEY,
  outlet_id UUID REFERENCES outlets(id),
  
  allocation_date DATE,
  amount DECIMAL(15,2),
  reason VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### ADD Columns:

**expenses table:**
- `kas_source VARCHAR(50)` - 'kas_utama' | 'simpan_uang'

**profit_allocations table:**
- `simpan_uang_amount DECIMAL(15,2)`
- `simpan_reason VARCHAR(255)`
- `kas_utama_topup DECIMAL(15,2)`
- `user_choice VARCHAR(50)` - 'full_profit' | 'available_kas' | 'custom'

**capital_repayments table:**
- `allocated_from_profit_allocation_id UUID` - link to allocation

### API Changes

#### NEW Endpoints:

1. **POST /api/cash/split-sales**
   - Auto-triggered when sales created
   - Split 60-40 into kas_utama & profit_pending

2. **GET /api/simpan-uang/history**
   - Show allocation history with full audit trail

3. **GET /api/financial-summary**
   - Real-time balances for all three buckets

#### MODIFIED Endpoints:

1. **POST /api/profit-allocations**
   - Complete redesign with 7-step workflow
   - Check hutang first, auto-deduct, etc

2. **POST /api/expenses**
   - Add kas_source validation
   - Check balance against specific bucket

3. **POST /api/sales**
   - Auto-trigger split sales

### Frontend Changes

#### ADD Components:

1. **ExpenseForm - NEW Field**
   - Dropdown: "Kasir Dari" (Kas Utama / Simpan Uang)
   - Real-time balance validation

2. **Dashboard Section 2 - NEW Cards**
   - Kas Utama (Blue)
   - Profit Pending (Yellow)
   - Simpan Uang (Green)
   - Hutang Outstanding (Red)

3. **TabAllokasiLaba - REDESIGNED**
   - 8-section flow with validations

4. **NEW Tab - Simpan Uang Management**
   - History table with full audit trail

#### MODIFIED Components:

1. **Dashboard Section 2**
   - Layout update for 4 clear cards
   - Real-time refresh

---

## 📅 IMPLEMENTATION PHASES

### Phase 1: Database & API Foundation (3-4 days)

- [ ] Create migration files
- [ ] Add tables & columns
- [ ] Update API endpoints
- [ ] Test API with Postman

### Phase 2: Dashboard Update (2-3 days)

- [ ] Update Section 2 layout
- [ ] Add real-time refresh
- [ ] Add new cards
- [ ] Test dashboard display

### Phase 3: Alokasi Laba Implementation (3-4 days)

- [ ] Redesign TabAllokasiLaba complete
- [ ] Implement 7-step workflow
- [ ] Add validations
- [ ] Test with scenarios

### Phase 4: Forms & Features (2-3 days)

- [ ] Add ExpenseForm Kasir Dari dropdown
- [ ] Create Simpan Uang tracking tab
- [ ] Add real-time validations
- [ ] Test all forms

### Phase 5: Testing & Deployment (2-3 days)

- [ ] Comprehensive testing
- [ ] User acceptance testing
- [ ] Deployment
- [ ] Monitor & support

**Total Estimated:** 12-17 working days

---

## ✅ SUCCESS CRITERIA

1. ✅ Sales auto-split 60-40 between kas & profit
2. ✅ Expense can select kas_source (Kas Utama / Simpan Uang)
3. ✅ Real-time balance display for all buckets
4. ✅ Alokasi Laba checks hutang first
5. ✅ Investor differentiation (LUNAS/CICIL/BELUM)
6. ✅ Profit share only to LUNAS investor
7. ✅ Simpan Uang allocation with history
8. ✅ Dashboard real-time refresh
9. ✅ No data loss from migration
10. ✅ All existing workflows still work (backward compatible)

---

## 🔄 ROLLBACK PLAN

If issues arise:
1. Keep old migrations in version control
2. Create reverse migration scripts
3. Backup data before each phase
4. Test rollback before deployment
5. Keep old endpoints available for grace period

---

**Ready to implement? START WITH PHASE 1 (Database + API)**

