# 🔧 REFACTOR PLAN - Funding Source Tracking & Expense Simplification

**Status:** APPROVED (Pending Execution)  
**Date Created:** 2026-06-06  
**Owner:** User  
**Objective:** Implement per-transaction funding source tracking (Modal vs Kas) + simplify expense categories

---

## 📋 ARCHITECTURE DECISION (FINALIZED)

### Settlement Model - Priority Order

```
✅ PRIORITY SETTLEMENT (FIXED):
1️⃣  Operating Expenses (dibayar dari kas penjualan)
2️⃣  Balik Modal (partial/full, sesuai available)
3️⃣  Kas Reserve (untuk operasional bulan depan)
4️⃣  PROFIT SHARING (hanya jika modal 100% sudah kembali)

Modal Tracking: Per-transaksi, flexible (bukan lump sum)
Funding Source: ADA FIELD terpisah di expense (Dari Modal / Dari Penjualan)
```

### Business Logic

```
SKENARIO MONTHLY SETTLEMENT:

Penjualan Bulan 1: Rp 4juta
├─ Operating Expenses (dari kas): Rp 300rb
├─ Beli Bahan (dari modal Damim): Rp 400rb
├─ NET: Rp 4juta - Rp 300rb - Rp 400rb = Rp 3.3juta
│
├─ Balik Modal: PILIHAN FLEKSIBEL
│  ├─ OPSI 1 LUNAS: Balik Rp 1.5juta penuh (jika cash memenuhi)
│  │  └─ Semua modal clear, profit sharing mulai bulan 2
│  │
│  └─ OPSI 2 CICIL: Balik sebagian (jika cash tidak cukup)
│     └─ Sisa modal pending untuk bulan depan
│
├─ Kas Reserve Bulan 2: Rp 300rb
└─ PROFIT Bulan 1: Fleksibel tergantung modal repayment

SKENARIO PENJUALAN KECIL (Bulan 1 alternatif):

Penjualan: Rp 2.5juta
├─ Operating Expenses: Rp 200rb
├─ Pengeluaran Bahan/Alat: Rp 200rb
├─ NET: Rp 2.1juta
│
├─ Kas Reserve: Rp 100rb
├─ OPSI: Hanya bisa cicil (cash tidak cukup untuk balik penuh)
├─ Balik Modal Per Owner: Rp 2juta ÷ 3 = Rp 667rb each
└─ Sisa Modal Belum Balik: Rp 333rb each (pending ke bulan 2-3)
```

---

## 🗄️ DATABASE CHANGES (REQUIRED)

### 1. Add Funding Source Columns to Expenses Table

**Migration File:** `migrations/migration-funding-source-tracking.sql`

```sql
-- Add funding source tracking to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS 
  funding_source VARCHAR(50) DEFAULT 'kas'
  CHECK (funding_source IN ('kas', 'modal'));

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS 
  funded_by_investor_id UUID REFERENCES investors(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN expenses.funding_source IS 
  'Track whether expense paid from sales revenue (kas) or investor capital (modal)';

COMMENT ON COLUMN expenses.funded_by_investor_id IS 
  'Links to investors table when funding_source=modal. NULL when funding_source=kas';

-- Ensure all existing expenses default to 'kas' (safe assumption)
UPDATE expenses SET funding_source = 'kas' WHERE funding_source IS NULL;
```

**Impact:**
- ✅ Setiap expense tahu: dari modal investor atau dari kas penjualan
- ✅ Linked ke investor table (siapa yang inject modal)
- ✅ Backward compatible (existing expenses set to 'kas')

---

### 2. Simplify Expense Categories (5 → 3)

**FROM (5 kategori):**
```
├─ bahan
├─ operasional
├─ peralatan
├─ gabungan ← DELETE (ambiguous)
└─ lain_lain ← DELETE (ambiguous)
```

**TO (3 kategori):**
```
├─ bahan (asset - hanya track, bukan langsung expense)
├─ operasional (expense - langsung keluar dari operasional)
└─ peralatan (asset - investment, bukan langsung expense)
```

**Data Cleanup Script:** `database/cleanup-invalid-categories.sql`

```sql
-- BACKUP FIRST (hanya untuk audit, optional)
-- SELECT * FROM expenses WHERE category IN ('gabungan', 'lain_lain');

-- DELETE expenses dengan kategori yang sudah dihapus
DELETE FROM expenses 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000'
  AND category IN ('gabungan', 'lain_lain');

-- Verify deletion
SELECT COUNT(*) as total_expenses, 
       COUNT(DISTINCT category) as unique_categories,
       category
FROM expenses 
WHERE outlet_id = '660e8400-e29b-41d4-a716-446655440000'
GROUP BY category;
-- Expected: only bahan, operasional, peralatan
```

---

## 🎨 UI/FORM CHANGES

### 1. ExpenseForm.tsx - Major Refactor

**Location:** `src/components/forms/ExpenseForm.tsx`

**BEFORE Structure:**
```tsx
const [form, setForm] = useState({
  category: '',
  description: '',
  amount: 0,
  date: '',
  material_id?: string,      // ← REMOVE
  supplier_id?: string,       // ← REMOVE
  delivery_date?: string,     // ← REMOVE
  notes: ''
})
```

**AFTER Structure:**
```tsx
const [form, setForm] = useState({
  category: '',               // ✅ Keep (3 only: bahan, operasional, peralatan)
  description: '',            // ✅ Keep + MAKE MANDATORY (min 3 chars)
  amount: 0,                  // ✅ Keep
  date: '',                   // ✅ Keep
  fundingSource: 'kas',       // ✅ NEW (kas | modal)
  fundedByInvestorId: '',     // ✅ NEW (conditional - if fundingSource=modal)
  investorPurpose: '',        // ✅ NEW (optional note - if fundingSource=modal)
  notes: ''                   // ✅ Keep
})
```

**Form Fields to Render:**

```tsx
1. Kategori [Select]
   Options: bahan, operasional, peralatan (ONLY 3)
   Validation: required

2. Deskripsi [Input text]
   Placeholder: "e.g. Beras bulk kg 50, Pembayaran listrik"
   Validation: required, min 3 chars  ← NEW VALIDATION
   
3. Jumlah [Input number]
   Placeholder: "0"
   Validation: required, > 0

4. Tanggal [Input date]
   Default: today
   Validation: required

5. Sumber Dana [Select] ← NEW FIELD
   Options:
   ├─ Dari Kas (default)
   └─ Dari Modal
   Validation: required

6. [CONDITIONAL] Investor [Select] ← NEW FIELD (if Sumber Dana = Dari Modal)
   Options: Load from investors table (owner, investor, karyawan)
   Display: "👤 Owner1", "🤝 Investor1", "🧑 Karyawan1"
   Validation: required if fundingSource=modal

7. [CONDITIONAL] Catatan Modal [Input text] ← NEW FIELD (if Sumber Dana = Dari Modal)
   Placeholder: "e.g. untuk beli bahan bulk, peralatan baru"
   Validation: optional

8. Catatan Tambahan [Textarea]
   Placeholder: "Catatan tambahan (opsional)"
   Validation: optional

REMOVED FIELDS:
❌ Material Picker (no longer needed)
❌ Supplier Dropdown (no longer needed)
❌ Delivery Date Picker (no longer needed)
```

**Validation Logic:**

```tsx
function validateForm() {
  if (!form.category) return 'Pilih kategori';
  if (!['bahan', 'operasional', 'peralatan'].includes(form.category)) {
    return 'Kategori hanya bisa: bahan, operasional, peralatan';
  }
  if (!form.description || form.description.length < 3) {
    return 'Deskripsi harus minimal 3 karakter';
  }
  if (!form.amount || parseFloat(form.amount) <= 0) {
    return 'Jumlah harus > 0';
  }
  if (!form.date) return 'Tanggal harus diisi';
  if (!form.fundingSource) return 'Pilih sumber dana';
  
  // NEW: If from modal, require investor
  if (form.fundingSource === 'modal' && !form.fundedByInvestorId) {
    return 'Pilih investor untuk modal';
  }
  
  return null;
}
```

---

### 2. Dashboard Page - Update Category Display

**Location:** `src/app/dashboard/dashboard/page.tsx`

**CHANGE:**
- ✅ Update expense breakdown to show ONLY 3 categories
- ✅ Calculate based on new categories
- ✅ Remove 5-category display

**Before:**
```
Pengeluaran Per Kategori:
├─ Bahan: Rp XXX
├─ Operasional: Rp XXX
├─ Peralatan: Rp XXX
├─ Gabungan: Rp XXX ← REMOVE
└─ Lain-lain: Rp XXX ← REMOVE
```

**After:**
```
Pengeluaran Per Kategori:
├─ Bahan: Rp XXX
├─ Operasional: Rp XXX
└─ Peralatan: Rp XXX
```

---

### 3. Dashboard - Remove Duplikat Cash Inflow Display

**Location:** `src/app/dashboard/dashboard/page.tsx` (around line 214)

**REMOVE:**
```tsx
{/* REMOVE THIS */}
<Card>
  <CardHeader>
    <CardTitle>Cash Masuk Total</CardTitle>
  </CardHeader>
  <CardContent className="text-2xl font-bold text-green-600">
    {formatCurrency(metrics.today_cash_inflow)}
  </CardContent>
</Card>
```

**REPLACE WITH:**
```tsx
{/* NEW: Separate Modal vs Sales */}
<Card>
  <CardHeader>
    <CardTitle>Cash Masuk Modal</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold text-blue-600">
      {formatCurrency(metrics.cash_from_modal || 0)}
    </p>
    <p className="text-xs text-gray-500 mt-1">dari investor</p>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>Cash Masuk Penjualan</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold text-green-600">
      {formatCurrency(metrics.cash_from_sales || 0)}
    </p>
    <p className="text-xs text-gray-500 mt-1">dari penjualan</p>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    <CardTitle>Total Cash Masuk</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-2xl font-bold text-purple-600">
      {formatCurrency((metrics.cash_from_modal || 0) + (metrics.cash_from_sales || 0))}
    </p>
    <p className="text-xs text-gray-500 mt-1">modal + penjualan</p>
  </CardContent>
</Card>
```

---

### 4. Tab 3: Pembayaran Balik Modal - NEW FEATURE (Cicil vs Lunas)

**Location:** `src/app/dashboard/funding/page.tsx` (Tab 3 - already exists, needs enhancement)

**NEW FEATURES TO ADD:**

#### A. Smart Suggestion System

```tsx
// Calculate available cash for repayment
const availableCashForRepayment = operatingCash - reserveKas;
const totalModalOutstanding = getTotalModalOutstanding(); // sum of all pending modal

// Smart guidance note
function renderRepaymentGuidance() {
  if (availableCashForRepayment >= totalModalOutstanding) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <AlertCircle className="h-4 w-4 text-green-600" />
        <AlertTitle>✅ Uang Cukup untuk Balik Modal PENUH!</AlertTitle>
        <AlertDescription>
          Available: Rp {formatCurrency(availableCashForRepayment)}
          {' | '} 
          Total Modal Pending: Rp {formatCurrency(totalModalOutstanding)}
          {' | '}
          Saran: Balik PENUH sekarang agar modal clear! ✅
        </AlertDescription>
      </Alert>
    );
  } else {
    return (
      <Alert className="bg-yellow-50 border-yellow-200">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>⚠️ Uang Tidak Cukup untuk Balik Modal PENUH</AlertTitle>
        <AlertDescription>
          Available: Rp {formatCurrency(availableCashForRepayment)}
          {' | '} 
          Total Modal Pending: Rp {formatCurrency(totalModalOutstanding)}
          {' | '}
          Saran: Cicil sebagian saja, lanjut bulan depan 📅
        </AlertDescription>
      </Alert>
    );
  }
}
```

#### B. Repayment Selection - Cicil vs Lunas

```tsx
// For each investor
function RepaymentItemForm({ investor }) {
  const totalInvested = investor.initial_contribution;
  const alreadyRepaid = investor.total_repaid_so_far;
  const pendingModal = totalInvested - alreadyRepaid;

  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-semibold mb-2">{investor.name}</h4>
      
      {/* Summary Info */}
      <div className="grid grid-cols-3 gap-2 text-sm mb-4 p-3 bg-gray-50 rounded">
        <div>
          <p className="text-gray-500">Total Invest</p>
          <p className="font-bold">{formatCurrency(totalInvested)}</p>
        </div>
        <div>
          <p className="text-gray-500">Sudah Balik</p>
          <p className="font-bold text-green-600">{formatCurrency(alreadyRepaid)}</p>
        </div>
        <div>
          <p className="text-gray-500">Sisa Pending</p>
          <p className="font-bold text-orange-600">{formatCurrency(pendingModal)}</p>
        </div>
      </div>

      {/* Repayment Options */}
      <div className="space-y-3">
        <Label>Pilih Metode Pembayaran</Label>
        
        {/* Option 1: Lunas (Full) */}
        <div className="flex items-center space-x-2">
          <Radio 
            id={`lunas_${investor.id}`}
            value="lunas"
            checked={repaymentMethod === 'lunas'}
            onChange={() => setRepaymentMethod('lunas')}
          />
          <Label htmlFor={`lunas_${investor.id}`} className="cursor-pointer">
            ✅ Bayar LUNAS (Penuh)
          </Label>
        </div>

        {repaymentMethod === 'lunas' && (
          <div className="ml-6 p-3 bg-green-50 rounded border border-green-200">
            <p className="text-sm font-semibold text-green-700">
              Balik Modal: {formatCurrency(pendingModal)}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Modal akan clear 100% ✅
            </p>
            <Textarea
              placeholder="Note: Pembayaran full modal (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-2"
            />
          </div>
        )}

        {/* Option 2: Cicil (Partial) */}
        <div className="flex items-center space-x-2 mt-3">
          <Radio 
            id={`cicil_${investor.id}`}
            value="cicil"
            checked={repaymentMethod === 'cicil'}
            onChange={() => setRepaymentMethod('cicil')}
          />
          <Label htmlFor={`cicil_${investor.id}`} className="cursor-pointer">
            📅 Cicil (Sebagian)
          </Label>
        </div>

        {repaymentMethod === 'cicil' && (
          <div className="ml-6 p-3 bg-yellow-50 rounded border border-yellow-200">
            <p className="text-sm font-semibold text-yellow-700 mb-2">
              Bayar Sebagian (Cicilan)
            </p>
            
            {/* Input custom amount */}
            <div>
              <Label className="text-xs">Jumlah Bayar Kali Ini (Rp)</Label>
              <Input
                type="number"
                value={repaymentAmount}
                onChange={(e) => setRepaymentAmount(parseFloat(e.target.value))}
                placeholder="0"
                max={pendingModal}
              />
            </div>

            {/* Show remaining after this payment */}
            <div className="mt-2 p-2 bg-white rounded text-sm">
              <p>Sisa Modal Setelah Ini: 
                <span className="font-bold text-orange-600 ml-2">
                  {formatCurrency(pendingModal - repaymentAmount)}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                (Akan dibayar di bulan-bulan berikutnya)
              </p>
            </div>

            <Textarea
              placeholder="Note: Pembayaran cicil, sisa untuk bulan depan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-2"
            />
          </div>
        )}
      </div>

      {/* Submit Button */}
      <Button 
        onClick={() => handleRepaymentSubmit(investor.id)}
        className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
      >
        Simpan Pembayaran
      </Button>
    </div>
  );
}
```

#### C. Database Record

```ts
// Both cicil & lunas create capital_repayments record:

capital_repayments:
├─ investor_id: investor.id
├─ amount: (full or partial amount)
├─ repayment_date: today
├─ repayment_type: 'lunas' | 'cicil'  // NEW field to track
├─ notes: "Pembayaran lunas modal" / "Cicil tahap 1, sisa Rp XXX"
├─ remaining_modal: (amount masih pending)  // NEW field
└─ created_at: today
```

---

## 🔌 API CHANGES

### 1. Dashboard Calculation API - Update Metrics

**Location:** `src/app/api/dashboard/route.ts`

**BEFORE (DashboardMetrics returned):**
```ts
today_cash_inflow: number  // MIXED (modal + penjualan)
```

**AFTER (DashboardMetrics updated):**
```ts
cash_from_modal: number         // ✅ NEW - dari capital_entries
cash_from_sales: number         // ✅ NEW - dari sales
today_cash_inflow: number       // ✅ KEEP (untuk backward compatibility)
expense_from_kas: number        // ✅ NEW - operasional & bahan dari kas
expense_from_modal: number      // ✅ NEW - dari modal investor
available_for_distribution: number  // ✅ UPDATED - calculate correctly
```

**Calculation Logic:**

```ts
// Separate cash sources
const cashFromModal = capitalEntries
  .filter(c => c.date === dateStr)
  .reduce((sum, c) => sum + parseFloat(c.amount), 0);

const cashFromSales = dailySales
  .filter(s => s.date === dateStr)
  .reduce((sum, s) => sum + parseFloat(s.total_amount), 0);

const totalCashInflow = cashFromModal + cashFromSales;

// Separate expense sources
const expenseFromKas = dailyExpenses
  .filter(e => e.funding_source === 'kas')
  .reduce((sum, e) => sum + parseFloat(e.amount), 0);

const expenseFromModal = dailyExpenses
  .filter(e => e.funding_source === 'modal')
  .reduce((sum, e) => sum + parseFloat(e.amount), 0);

// Available for distribution = Operating cash - Modal repayment needs
const operatingCash = cashFromSales - expenseFromKas;
const capitalRepaymentNeeds = expenseFromModal; // from modal investor
const availableForDistribution = operatingCash - capitalRepaymentNeeds;

return {
  cash_from_modal: cashFromModal,
  cash_from_sales: cashFromSales,
  today_cash_inflow: totalCashInflow,
  expense_from_kas: expenseFromKas,
  expense_from_modal: expenseFromModal,
  available_for_distribution: availableForDistribution
};
```

---

### 2. Expense API - Add Validation for Funding Source

**Location:** `src/app/api/expenses/route.ts`

**Validation in POST handler:**

```ts
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate funding_source
  if (!['kas', 'modal'].includes(body.funding_source)) {
    return NextResponse.json(
      { error: 'Invalid funding_source. Must be kas or modal' },
      { status: 400 }
    );
  }
  
  // If modal, require investor_id
  if (body.funding_source === 'modal') {
    if (!body.funded_by_investor_id) {
      return NextResponse.json(
        { error: 'funded_by_investor_id required when funding_source=modal' },
        { status: 400 }
      );
    }
    
    // Verify investor exists
    const investor = await supabase
      .from('investors')
      .select('id')
      .eq('id', body.funded_by_investor_id)
      .single();
    
    if (!investor.data) {
      return NextResponse.json(
        { error: 'Investor not found' },
        { status: 404 }
      );
    }
  }
  
  // If kas, investor_id should be NULL
  if (body.funding_source === 'kas') {
    body.funded_by_investor_id = null;
  }
  
  // Validate category (only 3 allowed)
  const validCategories = ['bahan', 'operasional', 'peralatan'];
  if (!validCategories.includes(body.category)) {
    return NextResponse.json(
      { 
        error: `Invalid category. Only allowed: ${validCategories.join(', ')}`
      },
      { status: 400 }
    );
  }
  
  // ... rest of insert logic
}
```

---

### 3. Type Definitions Update

**Location:** `src/types/index.ts`

**Update Expense interface:**

```ts
export interface Expense {
  id: string;
  outlet_id: string;
  date: string;
  category: 'bahan' | 'operasional' | 'peralatan';  // ✅ ONLY 3
  description: string;
  amount: number;
  funding_source?: 'kas' | 'modal';  // ✅ NEW
  funded_by_investor_id?: string | null;  // ✅ NEW
  notes?: string;
  created_at: string;
  edited_at?: string;
}
```

---

## ✅ VALIDATION CHECKLIST

**Pre-Execution Verification:**

- [ ] **Database:**
  - [ ] expenses table punya column `funding_source` (kas/modal)
  - [ ] expenses table punya column `funded_by_investor_id`
  - [ ] investors table punya 3 owner sudah input
  - [ ] No existing expenses corrupt (check COUNT)

- [ ] **UI/Form:**
  - [ ] ExpenseForm punya Funding Source dropdown
  - [ ] Kalau "Dari Modal" → show investor selector
  - [ ] Deskripsi field mandatory (min 3 chars validation)
  - [ ] Category validation hanya accept: bahan, operasional, peralatan
  - [ ] Material picker REMOVED
  - [ ] Supplier dropdown REMOVED
  - [ ] Delivery date picker REMOVED

- [ ] **Dashboard:**
  - [ ] Kategori display hanya 3 (bahan, operasional, peralatan)
  - [ ] Duplikat "Cash Masuk Total" removed
  - [ ] Expense breakdown show (dari_kas, dari_modal, total)
  - [ ] Cash inflow breakdown (modal, penjualan, total)

- [ ] **API Calculation:**
  - [ ] Settlement priority correct: Operasional → Modal → Reserve → Profit
  - [ ] Balik modal tracked dari capital_entries
  - [ ] Profit calculation excludes modal & operating expenses
  - [ ] expense_from_kas & expense_from_modal calculated correctly
  - [ ] available_for_distribution = operating_cash - modal_repayment

- [ ] **Data Cleanup:**
  - [ ] Expenses dengan kategori gabungan/lain_lain deleted
  - [ ] No data orphan
  - [ ] All expenses have default funding_source='kas'

---

## ❓ CRITICAL QUESTIONS (MUST ANSWER)

1. **Database Migration Approach:**
   - Should I create new migration file in `migrations/` folder?
   - Or direct ALTER in Supabase SQL Editor?
   - **Decision:** _________________

2. **Existing Expenses:**
   - All existing expenses set `funding_source = 'kas'` (safe default)?
   - Or need manual review first?
   - **Decision:** _________________

3. **Investor Selection (mandatory):**
   - If user tries to submit "Dari Modal" without selecting investor:
     - A: Reject submit (mandatory)
     - B: Auto-select first investor (risky)
   - **Decision:** _________________

4. **Dashboard "Available for Distribution":**
   - Should EXCLUDE capital repayment needs pending?
   - Or INCLUDE (assuming user already settled)?
   - **Decision:** _________________

5. **Settlement Workflow Confirmation:**
   Di halaman Alokasi Laba, sistem auto-calculate:
   ```
   Operating Expenses: (auto from expenses WHERE funding_source='kas')
   Balik Modal: (auto from expenses WHERE funding_source='modal')
   Reserve Kas: (manual input)
   PROFIT = Penjualan - Operasional - Balik Modal - Reserve
   ```
   Is this correct?
   - **Decision:** _________________

---

## 📁 FILES TO MODIFY

### Database
- ✅ NEW: `migrations/migration-funding-source-tracking.sql`
- ✅ NEW: `database/cleanup-invalid-categories.sql`

### Frontend
- 🔧 MODIFY: `src/components/forms/ExpenseForm.tsx` (major update)
- 🔧 MODIFY: `src/app/dashboard/expenses/page.tsx` (integrate new form)
- 🔧 MODIFY: `src/app/dashboard/dashboard/page.tsx` (update display)
- 🔧 MODIFY: `src/app/api/dashboard/route.ts` (update calculation)
- 🔧 MODIFY: `src/app/api/expenses/route.ts` (add validation)
- 🔧 MODIFY: `src/types/index.ts` (add fields)

### NO CHANGES NEEDED
- ✅ KEEP: `src/app/dashboard/funding/page.tsx` (sudah benar)
- ✅ KEEP: `src/components/modals/StakeholderModal.tsx` (keep as-is)
- ✅ KEEP: Role Management (sudah benar)
- ✅ KEEP: Alokasi Laba UI (sudah benar)

---

## 🚀 EXECUTION SEQUENCE

```
Phase 1: Database Preparation
  1. Create migration file (funding-source-tracking)
  2. Run migration in Supabase SQL Editor
  3. Verify columns added to expenses table
  4. Run data cleanup (delete gabungan/lain_lain)
  5. Verify all existing expenses have funding_source='kas'

Phase 2: Backend API
  6. Update types in src/types/index.ts
  7. Update dashboard API calculation (add separate cash_from_modal, etc)
  8. Update expense API validation (funding_source & investor_id)
  9. Test endpoints with Postman/curl

Phase 3: Frontend UI
  10. Refactor ExpenseForm.tsx (remove fields, add funding source)
  11. Update Dashboard page (3 categories only, remove duplikat)
  12. Update Dashboard API display (new metrics)
  13. Test UI forms locally

Phase 4: Testing & Verification
  14. Test create expense with "Dari Kas"
  15. Test create expense with "Dari Modal" (select investor)
  16. Test dashboard displays correctly
  17. Test settlement calculation
  18. Verify data in Supabase

Phase 5: Deploy
  19. Commit all changes to dev branch
  20. Push: git push origin dev:main (per user preference)
```

---

## 📝 NOTES & REFERENCES

- **Settlement Priority Reference:** See Architecture section above
- **Per-Transaction Modal System:** User explained in conversation - not lump sum, but flexible injections per need
- **Funding Source Concept:** Opsi B dari discussion - track mana dari modal, mana dari kas
- **3 Categories Rationale:** Simplify from 5 (bahan, operasional, peralatan) - remove ambiguous gabungan & lain_lain

---

## 🔄 HOW TO USE THIS FILE

**If connection drops or error occurs:**
1. Read this file completely
2. Identify which phase was interrupted
3. Resume from that phase
4. No need to re-explain system from scratch

**If refactor goes wrong:**
1. Refer to "Files to Modify" section
2. Check "Execution Sequence" for dependencies
3. Rollback affected changes only

---

**Status:** Ready for Execution (Pending answer to Critical Questions)  
**Last Updated:** 2026-06-06
