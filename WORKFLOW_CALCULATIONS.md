# Workflow & Calculations Documentation

> Panduan lengkap alur bisnis, perhitungan, dan data flow untuk sistem manajemen Roti Bakar

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Core Workflows](#core-workflows)
3. [Financial Calculations](#financial-calculations)
4. [Data Flow Architecture](#data-flow-architecture)
5. [Business Rules & Validations](#business-rules--validations)
6. [Calculation Examples](#calculation-examples)

---

## System Overview

**Sistem Manajemen Roti Bakar** adalah platform terintegrasi untuk mengelola:
- Multi-outlet operations
- Sales & revenue tracking (online + offline)
- Material sourcing & inventory (tracking & future HPP calculation)
- **Equipment (Alat) asset tracking** ⭐ NEW
- Financial allocation (profit sharing)
- Capital management & investor tracking
- Expense & cash flow monitoring

### Key Entities
```
Business
  ├── Outlet (fisik toko)
  │   ├── Products (harga per channel)
  │   ├── Sessions (sesi penjualan harian)
  │   ├── Sales (transaksi per session)
  │   ├── Expenses (pengeluaran operasional + tracking)
  │   │   ├── category='operasional' (ALL recurring costs: sewa, gaji, listrik, air, gas, marketing, dll → DEDUCTED from profit)
  │   │   ├── category='bahan' (raw materials → tracked only, NOT deducted)
  │   │   └── category='peralatan' (equipment/assets → tracked only, NOT deducted)
  │   ├── Material Purchases (tracked via expenses WHERE category='bahan')
  │   ├── Equipment Assets (tracked via expenses WHERE category='peralatan')
  │   └── Cash Ledger
  ├── Investors (pemberi modal)
  ├── Suppliers (pemasok bahan)
  └── Settings (konfigurasi outlet)
```

---

## Core Workflows

### 1. **Daily Sales Workflow**

```
Morning
  ↓
[Create Session] → Set session_date, status='active'
  ↓
[Record Sales] → Product + Quantity + Channel (offline/shopeefood/gofood)
  ├─ Price lookup (channel-specific)
  ├─ Calculate gross amount (price × qty)
  ├─ Apply platform fee (if online)
  └─ Net amount to outlet cash
  ↓
[Mid-day Expenses] → (optional) Catat pengeluaran harian
  ├─ Food supplies
  ├─ Labor
  └─ Operational
  ↓
Evening
  ↓
[Close Session] → status='closed'
  ├─ Finalize totals
  ├─ Record settlement to cash ledger
  └─ Ready for allocation
```

**Key Calculations in Sales:**
- **Gross Amount** = `unit_price × quantity`
- **Platform Fee** = `gross_amount × fee_percent` (if shopeefood/gofood)
- **Net Amount** = `gross_amount - platform_fee`
- **Channel Revenue** = Sum of net amounts by channel

---

### 2. **Profit Allocation Workflow**

```
End of Period (weekly/monthly)
  ↓
[Input Profit Data]
  ├─ Total Penjualan (from sales)
  ├─ Total Operasional (from expenses)
  └─ Penjualan Bersih = Penjualan - Operasional
  ↓
[Potong Kas Cadangan] → Reserve 10-20% for emergency
  ├─ Kas Cadangan = Penjualan Bersih × reserve_percent
  └─ Sisa untuk dibagikan = Penjualan Bersih - Kas Cadangan
  ↓
[Manual Distribution] → Bagi sisa ke stakeholders
  ├─ Owner (pemilik)
  ├─ Investor (pemberi modal)
  └─ Karyawan (pekerja)
  ↓
[Record Allocation] → Save ke profit_allocations tabel
  ├─ Track reserve + distributed amounts
  ├─ Audit trail
  └─ Settlement status
```

**Key Calculations in Allocation:**
- **Penjualan Bersih** = `Total Penjualan - Total Operasional`
- **Kas Cadangan** = `Penjualan Bersih × reserve_percent`
- **Available for Distribution** = `Penjualan Bersih - Kas Cadangan`
- **Share per Stakeholder** = Manual input (NOT automatic)

---

### 3. **Material Purchasing Workflow**

```
Identify Need
  ↓
[Create Material Purchase Request]
  ├─ Select raw material (telur, tepung, dll)
  ├─ Choose supplier
  ├─ Input quantity + unit_price
  └─ Calculate total_amount
  ↓
[Validate Cash] → Cek kas tersedia
  ├─ If sufficient → Proceed
  └─ If insufficient → Show warning (user can override)
  ↓
[Record Purchase] → Insert ke material_purchases tabel
  ├─ Deduct dari cash ledger
  ├─ Record supplier_id + delivery_date
  └─ Set payment_status (pending/paid)
  ↓
[Delivery & Quality Check]
  ├─ Update quality rating
  ├─ Verify quantity received
  └─ Mark as completed
```

**Key Calculations:**
- **Total Amount** = `quantity × unit_price`
- **Cash Impact** = `-total_amount` (debit from cash)
- **Quality Score** = User input (1-5 stars)

---

### 3B. **Equipment (Alat) Tracking Workflow** ⭐ NEW (2026-06-09)

```
[Equipment Purchase] → Input via Pengeluaran dengan category='peralatan'
  ├─ Deskripsi: nama alat (e.g., "Kompor 2 Burner", "Gerobak", "Freezer")
  ├─ Amount: harga beli
  ├─ Date: tanggal pembelian
  ├─ Funding Source: kas/modal
  └─ Notes: (optional) kondisi awal, spec
  ↓
[Stored in expenses table]
  └─ category='peralatan' (NOT deducted from profit)
  ↓
[View in Tab "Alat"] → Dashboard Manajemen Bahan
  ├─ Display: Nama Alat | Harga | Tanggal
  ├─ Sorted: By date (newest first)
  └─ Total: Sum of all equipment purchases
  ↓
[Future Enhancements - PLANNED]
  ├─ [ ] Condition tracking (Aktif/Rusak/Dijual)
  ├─ [ ] Depreciation calculation (straight-line, declining balance)
  ├─ [ ] ROI per equipment per investor
  ├─ [ ] Equipment lifecycle (purchase → maintenance → sale/scrap)
  └─ [ ] Maintenance log integration
```

**Key Concepts:**
- **Asset Registry**: Transparent tracking semua peralatan dari pembelian awal
- **NOT deducted from profit**: Equipment adalah ASSET, bukan expense
- **For Investor Transparency**: Investor bisa lihat apa aja asset yang dibeli dengan modal mereka
- **Future HPP Enhancement**: Equipment cost dapat include depreciation dalam HPP (later phase)

**Data Flow:**
```
User Input → Pengeluaran Form (kategori='peralatan')
           ↓
         API POST /api/expenses
           ↓
    Validate: category='peralatan', amount > 0
           ↓
    Save to expenses table
           ↓
    Tab "Alat" ← Query: SELECT * FROM expenses WHERE category='peralatan'
           ↓
    Display: Simple table (Nama Alat | Harga | Tanggal)
```

---

### 4. **Capital & Investor Management Workflow**

```
[Initial Setup]
  ├─ Define investors (owner, investors, karyawan)
  ├─ Track initial contribution
  └─ Set priority order
  ↓
[Capital Entry] → Catat modal masuk
  ├─ Source (investor, owner, bank loan, dll)
  ├─ Amount
  ├─ Date
  └─ Notes
  ↓
[Edit/Delete Capital Entry] → (dengan audit trail)
  ├─ Save original values
  ├─ Record edit reason
  ├─ Track edit_at timestamp
  └─ Keep audit log
  ↓
[Capital Repayment] → Catat pengembalian modal
  ├─ Track repayment date
  ├─ Update remaining_balance
  └─ Record method (cash/transfer/deduct from profit)
```

**Key Calculations:**
- **Remaining Balance** = `initial_contribution - total_repayments`
- **Investment ROI** = `(net_profit / initial_contribution) × 100`

---

### 5. **Cash Flow Monitoring Workflow**

```
[Daily Cash Ledger]
  ↓
[Inflow Sources]
  ├─ Sales (settlement dari session)
  ├─ Capital injection
  ├─ Loan received
  └─ Refund/return
  ↓
[Outflow Sources]
  ├─ Material purchases
  ├─ Operating expenses
  ├─ Salary/wages
  ├─ Loan repayment
  └─ Profit distribution
  ↓
[Calculate Kas Tersedia] → Real-time cash balance
  ├─ Sum all inflows
  ├─ Subtract all outflows
  └─ Compare with threshold
  ↓
[Monitor Status]
  ├─ Healthy: > 100,000 IDR
  ├─ Warning: 0 - 100,000 IDR
  └─ Critical: < 0 IDR (deficit)
```

**Key Calculations:**
- **Kas Tersedia** = `SUM(inflows) - SUM(outflows)`
- **Status** = IF kas >= 100k THEN "healthy" ELSE IF kas >= 0 THEN "warning" ELSE "critical"

---

## Financial Calculations

### ⚠️ IMPORTANT: Current Implementation (2026-06-08)

**Materials/Bahan are NOT currently deducted from profit calculations.**

Why?
- **HPP (cost_price per product) already includes all material costs** upfront
  - When you sell a product at Rp 20,000 with HPP Rp 8,000 → profit already factors in material costs
  - No need to separately deduct materials from monthly profit
- **Material tracking is FOR FUTURE use** (inventory management, re-costing, audits)
- **Current profit calculation is simple:**
  - `Profit = Penjualan - Operasional Expenses ONLY`
  - Operasional = gaji, listrik, air, misc (category='operasional')
  - Materials (category='bahan') & Equipment (category='peralatan') = tracked but NOT deducted

**This system is MANAGEMENT-FOCUSED, not GAAP accounting:**
- Goal: Simple monthly profit calculation for stakeholder distribution
- Material costs already reflected in product margins
- No complex HPP re-allocation needed

### A. Sales Revenue Calculation

```typescript
// Per Sale Transaction
const saleRevenue = {
  gross_amount: unit_price * quantity,
  platform_fee: platform === 'offline' ? 0 : gross_amount * platform_fee_percent,
  net_amount: gross_amount - platform_fee,
  // Breakdown by channel
  channel_revenue: {
    offline: sum_of_offline_sales,
    shopeefood: sum_of_shopeefood_sales,
    gofood: sum_of_gofood_sales
  }
}

// Period Total
const periodRevenue = {
  total_gross: SUM(all_gross_amounts),
  total_fees: SUM(all_platform_fees),
  total_net: total_gross - total_fees,
  by_channel: {
    offline: SUM(net where channel='offline'),
    shopeefood: SUM(net where channel='shopeefood'),
    gofood: SUM(net where channel='gofood')
  }
}
```

### B. Expense Calculation

**Current Model (2026-06-08): SIMPLE - Operasional Expenses Only**

```typescript
// ONLY Operasional Expenses are deducted from profit
const operasionalExpenses = {
  gaji: wage_expenses,            // Salaries (admin, staff)
  listrik: electricity,           // Electric bills
  air: water,                     // Water bills
  gas: gas,                       // Gas
  misc: other_misc                // Marketing, transport, supplies
}

// ✅ Deducted from profit
const total_operasional = gaji + listrik + air + gas + misc

// Bahan & Peralatan are tracked but NOT deducted
const trackedButNotDeducted = {
  bahan: raw_materials,           // Raw materials (category='bahan')
  peralatan: equipment            // Equipment (category='peralatan')
}

// Why not deducted?
// - HPP (product cost_price) ALREADY includes all material costs
// - When you sell at Rp 20k with HPP Rp 8k → profit already includes material cost
// - No need to separately deduct materials again
// - These are tracked for FUTURE inventory management enhancements

// 💡 Full Cash Outflows (for cash flow tracking, different from profit):
const all_cash_outflows = {
  ...operasionalExpenses,         // These affect profit
  ...trackedButNotDeducted        // These affect cash but NOT profit
}
```

**Expense Categories in System:**
- **`category='operasional'`** → Semua recurring operational costs (Sewa, Gaji, Listrik, Air, Gas, Misc, Marketing, dll) → ✅ Deducted from profit
- **`category='bahan'`** → Raw materials → ❌ NOT deducted (HPP already included)
- **`category='peralatan'`** → Equipment/tools/assets → ❌ NOT deducted

**Note:** Deskripsi di ekspense form menjelaskan apa expense tersebut (e.g., "Sewa Lahan Rp 500rb", "Gaji karyawan", "Pembayaran Listrik", dll)

### C. Profit Calculation (Current - 2026-06-08)

**Simple Model: Penjualan - Operasional Expenses**

```typescript
// Revenue
const total_penjualan = total_net_sales  // After platform fees

// Operating Expenses (ONLY - category='operasional')
// FLEXIBLE - bisa apa saja recurring operational cost
const operasional_expenses = {
  sewa_lahan: rent,       // Sewa lahan (fixed monthly)
  gaji: wages,            // Salaries
  listrik: electricity,   // Electric bills
  air: water,            // Water
  gas: gas,              // Gas
  marketing: marketing,   // Marketing & promo
  transport: transport,   // Transport & delivery
  misc: other            // Other misc costs
}

const total_operasional = SUM(operasional_expenses)

// ⚠️ IMPORTANT: Profit dapat NEGATIVE jika operasional expense > penjualan
// Contoh: Hari pertama bayar sewa Rp 500rb tanpa penjualan = profit -Rp 500rb (OK)

// PROFIT CALCULATION
const penjualan_bersih = total_penjualan - total_operasional

// Why is this simple?
// - HPP (product cost_price) already includes ALL material costs
// - When selling at 20k with HPP 8k → 12k profit margin already accounts for materials
// - Materials don't need separate monthly deduction
// - Operasional expenses are the ONLY monthly costs

// Reserve & Distribution
const kas_cadangan = penjualan_bersih * reserve_percent        // 10-20%
const available_distribution = penjualan_bersih - kas_cadangan

// Manual Distribution to Stakeholders
const distribution = {
  owner_share: manual_input,
  investor_share: manual_input,
  karyawan_share: manual_input,
  
  total_distributed: owner_share + investor_share + karyawan_share,
  
  assert: total_distributed <= available_distribution,
  error: "Distribusi melebihi dana tersedia"
}
```

**Notes:**
- **NOT tracking material costs monthly** because they're already in product HPP
- **Bahan & Peralatan expenses** are recorded in system but NOT used in profit calculation
- **Future enhancement:** Might track inventory & re-cost products if needed
- **Current focus:** Simple monthly settlement for stakeholder distribution

### D. Cost Price & Margin Calculation

```typescript
// Product-level tracking
const productMetrics = {
  unit_cost_price: cost_of_product,           // HPP (Harga Pokok Penjualan)
  unit_sell_price: retail_price_by_channel,
  
  // Per unit margin
  margin_per_unit: unit_sell_price - unit_cost_price,
  margin_percent: (margin_per_unit / unit_sell_price) * 100,
  
  // Session-level margin
  session_gross_profit: SUM(margin_per_unit * quantity_sold),
  gross_profit_margin_pct: (session_gross_profit / session_revenue) * 100
}
```

### E. Cash Balance Calculation

```typescript
// Real-time cash availability
const cashFlow = {
  // Inflows
  sales_settlement: SUM(net_sales_by_session),
  capital_injection: SUM(capital_entries),
  refunds: SUM(returned_amounts),
  
  // Outflows
  material_purchases: SUM(purchase_amounts),
  operating_expenses: SUM(expense_amounts),
  capital_repayment: SUM(repayment_amounts),
  profit_distribution: SUM(allocated_amounts),
  
  // Net calculation
  total_inflow: sales_settlement + capital_injection + refunds,
  total_outflow: material_purchases + operating_expenses + capital_repayment + profit_distribution,
  
  kas_tersedia: total_inflow - total_outflow
}

// Status validation
const cashStatus = {
  healthy: kas_tersedia > 100_000,      // Normal
  warning: 0 <= kas_tersedia <= 100_000, // Low cash
  critical: kas_tersedia < 0             // Deficit (shouldn't happen)
}
```

---

## Data Flow Architecture

### Database Schema Relationships

```sql
-- Core business structure
businesses
  ↓ (1:many)
outlets
  ├─ (1:many) sessions
  │           ├─ (1:many) sales
  │           └─ settlement to cash_ledger
  ├─ (1:many) products
  ├─ (1:many) raw_materials
  ├─ (1:many) suppliers
  ├─ (1:many) supplier_prices
  ├─ (1:many) material_purchases
  ├─ (1:many) expenses
  ├─ (1:many) cash_transactions / cash_ledger
  ├─ (1:many) profit_allocations
  └─ (1:1) outlet_settings

-- Stakeholder management
investors
  ├─ (1:many) capital_entries
  ├─ (1:many) capital_repayments
  ├─ (1:many) profit_allocations
  └─ audit trail fields

-- Support tables
allocation_rules (per outlet)
stakeholders (owner, investor, karyawan)
```

### API Call Flow for Sales Entry

```
Frontend (ProductsPage/BatchSaleForm)
  ↓
POST /api/sales
  ├─ Validate outlet_id + session_id
  ├─ Fetch product pricing
  ├─ Calculate platform fees
  ├─ Check cash balance (warning only)
  └─ INSERT into sales table
  ↓
Success Response
  ├─ Return sale record with ID
  ├─ Frontend updates UI
  └─ Session total recalculated
```

### API Call Flow for Profit Allocation

```
Frontend (DashboardPage/Tab "Alokasi Laba")
  ↓
POST /api/profit-allocations
  ├─ Validate: period + outlet_id
  ├─ Fetch: period_sales + period_expenses
  ├─ Calculate: penjualan_bersih
  ├─ User inputs: reserve_percent + distribution amounts
  ├─ Validate: SUM(distributions) <= available
  ├─ INSERT profit_allocation record
  └─ INSERT cash_transaction (settle allocation)
  ↓
Response
  ├─ Return allocation with calculated amounts
  ├─ Update dashboard summary
  └─ Record settle to cash ledger
```

### API Call Flow for Material Purchase

```
Frontend (SourcingPage/MaterialPurchaseForm)
  ↓
POST /api/material-purchases
  ├─ Validate: outlet_id + raw_material_id + supplier_id
  ├─ Calculate: total_amount = quantity × unit_price
  ├─ Check cash balance
  │  ├─ IF kas < total_amount → Return 400 (KAS_TIDAK_CUKUP)
  │  └─ Frontend shows warning banner with override option
  ├─ IF user confirms → Set force_override=true
  ├─ INSERT material_purchase record
  ├─ INSERT cash_transaction (debit from kas)
  └─ Update cash_ledger
  ↓
Response
  ├─ Return purchase record
  ├─ Update cash balance in dashboard
  └─ Show success notification
```

---

## Business Rules & Validations

### Sales Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Channel Pricing** | Product has channel-specific prices | Use channel price; else use fallback `price_offline` |
| **Platform Fee** | Channel is shopeefood/gofood | Apply fee_percent from outlet_settings |
| **Minimum Order** | Quantity > 0 | Required validation |
| **Product Active** | Product is_active = false | Prevent sale (optional UX choice) |
| **Session Status** | Session status != 'active' | Prevent new sales |

### Expense Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Cash Validation** | Expense amount > kas_tersedia | Show warning (soft fail) |
| **Force Override** | User confirms despite warning | Allow with `force_override=true` flag |
| **Category Required** | Category = null | Reject (400 error) |
| **Category Options** | Category must be one of 3 | ONLY: 'bahan', 'operasional', 'peralatan' |
| **Operasional Deduction** | Category = 'operasional' | ✅ DEDUCTED from profit calculation |
| **Bahan Non-Deduction** | Category = 'bahan' | ⚠️ TRACKED only, NOT deducted (HPP already included) |
| **Peralatan Non-Deduction** | Category = 'peralatan' | 📊 ASSET tracking, NOT deducted from profit |
| **Peralatan Visibility** | Category = 'peralatan' | Auto-display in Tab "Alat" (Manajemen Bahan page) |
| **Date Validation** | Date > today | Warn but allow (for planning) |

### Equipment (Alat) Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Input Method** | Add equipment | Via Pengeluaran form dengan category='peralatan' |
| **Display** | Query peralatan | Tab "Alat" → `/dashboard/sourcing` |
| **Profit Impact** | Equipment purchased | TIDAK dikurangi dari profit (is ASSET, not expense) |
| **Ownership Tracking** | Via funding_source field | Track modal/kas source for investor transparency |
| **Future Condition** | (PLANNED) Maintenance tracking | Will support aktif/rusak/dijual status |
| **Future Depreciation** | (PLANNED) Equipment lifecycle | Will calculate depreciation for HPP enhancement |

### Allocation Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Period Unique** | Same period already allocated | Allow edit/overwrite or error (config choice) |
| **Distribution Total** | SUM(distributions) > available | Reject (400 error) |
| **Reserve Percent** | 0 <= reserve <= 100 | Validate range |
| **Audit Trail** | Any edit to allocation | Track edit reason + timestamp |
| **No Retroactive** | Allocate for past period | Allow with warning |

### Capital Management Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Initial Entry** | Create new capital entry | Save with created_at timestamp |
| **Edit Capital** | Update existing entry | Save original values + edit reason |
| **Delete Capital** | Remove entry | Soft delete (keep audit trail) |
| **Remaining Balance** | Remaining < 0 | Flag but allow (user manages) |
| **Audit Trail** | Any capital change | Record original + new values |

### Cash Flow Rules

| Rule | Condition | Action |
|------|-----------|--------|
| **Real-time** | Any transaction | Recalculate kas_tersedia immediately |
| **Status Update** | Kas crosses threshold | Update status (healthy/warning/critical) |
| **Prevent Overdraft** | Kas < 0 | Show critical warning (allow if force_override) |
| **Settlement** | Session closed | Automatically settle sales to cash_ledger |

---

## Calculation Examples

### Example 1: Daily Sales with Platform Fees

**Scenario:**
- Outlet: "Roti Bakar Utama"
- Session Date: 2026-06-08
- Channel Mix:
  - Offline: 10 roti @ 20,000 = 200,000
  - Shopeefood: 5 roti @ 22,000 = 110,000 (platform fee: 15%)
  - GoFood: 3 roti @ 22,000 = 66,000 (platform fee: 15%)

**Calculation:**

```typescript
// Offline (no fee)
offline: {
  gross: 200_000,
  fee: 0,
  net: 200_000
}

// Shopeefood (15% fee)
shopeefood: {
  gross: 110_000,
  fee: 110_000 × 0.15 = 16_500,
  net: 93_500
}

// GoFood (15% fee)
gofood: {
  gross: 66_000,
  fee: 66_000 × 0.15 = 9_900,
  net: 56_100
}

// Period Total
total_gross: 376_000
total_fee: 26_400
total_net: 349_600  ← This settles to cash_ledger
```

---

### Example 2: Profit Allocation with Distribution

**Scenario (Current Model - 2026-06-08):**
- Period: Week 1 June 2026
- Sales (net): Rp 1,500,000
- Operating Expenses: Rp 400,000
  - Salary: Rp 200,000
  - Utilities: Rp 100,000
  - Miscellaneous: Rp 100,000
- Note: Materials already in product HPP, no separate deduction

**Calculation:**

```typescript
total_penjualan: 1_500_000
total_operasional: 400_000  // Only operasional category
penjualan_bersih: 1_500_000 - 400_000 = 1_100_000

// Reserve 15% for emergency fund
kas_cadangan: 1_100_000 × 0.15 = 165_000
available_distribution: 1_100_000 - 165_000 = 935_000

// Manual distribution (decided by owner)
owner_share: 500_000      // 53% of available
investor_share: 300_000   // 32% of available (2 investors, Rp 150k each)
karyawan_share: 135_000   // 15% of available (2 employees, Rp 67.5k each)

total_distributed: 935_000
remaining: 0  ← Fully allocated

// Impact on cash flow
Cash In:    1_500_000   (sales)
Cash Out:   400_000     (operasional only)
─────────────────────
Net Before Distribution: 1_100_000

Reserve:   165_000
Payout:    935_000
─────────────────────
Final Kas Terakhir: 0

✅ SIMPLE: No materials to separately track
   (Materials already included in product margins)
```

---

### Example 3: Material Purchase with Validation

**Scenario:**
- Current kas_tersedia: Rp 450,000
- Purchase Request:
  - Raw Material: Telur Grade A
  - Quantity: 10 lusin
  - Unit Price: Rp 60,000/lusin
  - Total: Rp 600,000
  - Supplier: "Suplai Telur Terpercaya"

**Calculation & Validation:**

```typescript
total_amount: 10 × 60_000 = 600_000
kas_tersedia_before: 450_000

// Validation Check
kas_tersedia < total_amount ?
450_000 < 600_000 → TRUE

// Result: Warning ⚠️
deficit: 600_000 - 450_000 = 150_000
message: "Kas kurang Rp 150,000"

// Frontend shows warning banner
// User choices:
// A) Cancel → Purchase not recorded
// B) Continue Despite Shortage → force_override=true
//    → INSERT purchase
//    → kas becomes -150,000 (deficit)
//    → Show critical warning: awaiting capital injection
```

---

### Example 4: Investor Capital Management

**Scenario:**
- Investor: "Teman A"
- Initial Contribution: Rp 2,000,000
- Capital Entries:
  - Entry 1: Rp 2,000,000 (initial) - Date: 2026-05-01
  - Entry 2: Rp 500,000 (injection) - Date: 2026-06-01
- Repayments:
  - Repayment 1: Rp 1,000,000 - Date: 2026-06-05
  - Repayment 2: Rp 300,000 - Date: 2026-06-08

**Calculation:**

```typescript
total_contribution: 2_000_000 + 500_000 = 2_500_000
total_repayment: 1_000_000 + 300_000 = 1_300_000

remaining_balance: 2_500_000 - 1_300_000 = 1_200_000

// Investment Status
invested: Rp 1,200,000 (still outstanding)
returned: Rp 1,300,000
recovery_rate: (1_300_000 / 2_500_000) × 100 = 52%

// Audit Trail Example (Edit Capital Entry 1)
original: {
  amount: 2_000_000,
  date: 2026-05-01,
  notes: "Initial investment"
}

edit (by owner): {
  amount: 1_800_000,  // Corrected typo
  edit_reason: "Dokumentasi awal tidak akurat",
  edited_at: 2026-06-08T10:30:00Z
}

// Audit log stores both for tracking
```

---

### Example 5: Negative Profit (Opening Day with Rental Payment)

**Scenario (Day 1 - Grand Opening):**
- Outlet: "Roti Bakar Baru"
- Sales: Rp 0 (baru buka, belum mulai jualan)
- Operasional Expenses:
  - Sewa Lahan: Rp 500,000 (deskripsi: "Sewa Lahan 1 Bulan")
  - Listrik (instalasi awal): Rp 100,000

**Calculation:**

```typescript
total_penjualan: 0         // No sales yet
total_operasional: 600_000  // Sewa + Listrik

penjualan_bersih: 0 - 600_000 = -600_000  ✅ NEGATIVE PROFIT (OK!)

// Interpretation
├─ Bisnis belum mulai menghasilkan
├─ Tapi sudah mengeluarkan biaya operasional
└─ Profit negative adalah NORMAL & EXPECTED

// Impact pada Allocation Tab
├─ No profit to allocate
├─ Kas reserve: -60,000 (deficit)
└─ Message: "Deficit bulan ini, perlu capital injection untuk operasi"
```

**Status:** SISTEM BEKERJA DENGAN BENAR ✅
- Operasional expenses masuk kategori 'operasional' (deskripsi: "Sewa Lahan")
- Tidak ada penjualan
- Profit = negative (OK, tidak ada validation yang mencegah)
- Sistem siap untuk capital injection bulan depan

---

## Summary Table: Key Formulas


| Metric | Formula | Notes |
|--------|---------|-------|
| **Gross Revenue** | `unit_price × quantity` | Total before platform fees |
| **Platform Fee** | `gross × fee_percent` | Deduction for online channels (Shopeefood/GoFood) |
| **Net Revenue** | `gross - platform_fee` | ✅ Cash inflow to outlet |
| **Operasional Expenses** | `gaji + listrik + air + gas + misc` | ✅ ONLY these deducted from profit |
| **Bahan (Materials)** | `quantity × unit_price` | ❌ NOT deducted (already in HPP) |
| **Peralatan (Equipment)** | `equipment cost` | ❌ NOT deducted (tracked separately) |
| **Penjualan Bersih (Profit)** | `net_revenue - operasional_expenses` | ✅ Current formula (simple!) |
| **Kas Cadangan** | `penjualan_bersih × reserve_percent` | Emergency reserve (typically 10-20%) |
| **Available Distribution** | `penjualan_bersih - kas_cadangan` | For stakeholder payout |
| **Product Margin %** | `(sell_price - cost_price) / sell_price × 100` | Per-product profitability (HPP included) |
| **Cash Balance** | `inflows - outflows` | Real-time liquidity (ALL transactions) |
| **Investor ROI** | `(net_profit_share / initial_investment) × 100` | Investor return percentage |

### Key: What's In Profit vs What's Not

| Category | In Profit Calc? | In Cash? | Why? |
|----------|:---------------:|:--------:|:----:|
| **Operasional** (gaji, listrik, air, gas, misc) | ✅ YES | ✅ YES | Monthly cash costs |
| **Bahan** (materials) | ❌ NO | ❌ NO* | Already in product HPP |
| **Peralatan** (equipment) | ❌ NO | ✅ YES | Recorded but not profit impact |

*Bahan might impact cash if you're recording purchases, but HPP already includes material costs
| **Platform Fees** | ✅ YES (indirect) | ✅ YES | Built into net revenue |

---

## Related Documentation

- [README.md](README.md) - System overview & feature list
- [REFACTOR_FUNDING_EXPENSES_PLAN.md](REFACTOR_FUNDING_EXPENSES_PLAN.md) - Profit allocation refactor details
- [OPSI_COMPARISON_ANALYSIS.md](OPSI_COMPARISON_ANALYSIS.md) - Alternative calculation approaches
- [SMOKE_TESTING_GUIDE.md](SMOKE_TESTING_GUIDE.md) - Testing scenarios

---

**Last Updated:** 2026-06-08  
**Version:** 1.0  
**Status:** Documentation Complete
