# Phase 1: Hutang User Input - Implementation Checklist

## Current Status: Code Ready ✅

All TypeScript errors resolved. Frontend and API are ready to accept and process `hutang_status` (FULL_PAYMENT vs CICILAN).

## Remaining Tasks

### Task 1: Execute Supabase Migration ⏳
**Status:** Pending (User Action)

**What it does:**
- Adds 6 new columns to `capital_entries` table:
  - `hutang_status` (varchar): 'cicilan' or 'full_payment'
  - `cicilan_amount` (integer): Monthly payment amount
  - `cicilan_start_date` (date): When cicilan starts
  - `cicilan_months` (integer): Number of months for cicilan
  - `hutang_status_set_at` (timestamp): Audit trail timestamp
  - `hutang_status_set_by` (varchar): Who made the decision

**SQL Location:** `migrations/phase1-hutang-user-input.sql`

**Steps to Execute:**
1. Open Supabase Dashboard → SQL Editor
2. Copy SQL content from `migrations/phase1-hutang-user-input.sql`
3. Paste into SQL editor
4. Execute (Click "RUN")
5. Verify success message

---

### Task 2: Test Modal Masuk Form ✅ Ready

**Form Location:** Dashboard → Manajemen Pendanaan → Modal Masuk Tab

**Current Implementation:**
```
✅ Investor selection dropdown
✅ Amount input
✅ Source selection
✅ Hutang Status radio buttons:
   - FULL_PAYMENT: "Akan dibayar penuh, tidak muncul di Alokasi Laba"
   - CICILAN: "Akan dicicil setiap bulan, akan muncul di Alokasi Laba"
✅ Conditional cicilan fields (visible only when CICILAN selected):
   - Cicilan Amount (Rp/bulan)
   - Cicilan Start Date (picker)
   - Cicilan Months (numeric)
✅ Form validation: Requires cicilan_amount when hutang_status='cicilan'
```

**Test Cases:**

**Test A: FULL_PAYMENT scenario**
1. Select investor (e.g., "Agus" or "Budi")
2. Enter amount: 500,000
3. Select source: "Owner"
4. Select hutang_status: **FULL_PAYMENT**
5. Observe: Green message appears, cicilan fields hidden
6. Click Submit
7. Verify: Data saved to database, investor won't appear in Alokasi Laba hutang

**Test B: CICILAN scenario**
1. Select investor (e.g., "Citra")
2. Enter amount: 300,000
3. Select source: "Investor"
4. Select hutang_status: **CICILAN**
5. Observe: Yellow box appears with 3 new fields
6. Fill cicilan fields:
   - Cicilan Amount: 75,000 (Rp/month)
   - Cicilan Start Date: Tomorrow
   - Cicilan Months: 4
7. Click Submit
8. Verify: Data saved, investor appears in Alokasi Laba with 75,000/bulan hutang

---

### Task 3: Verify Alokasi Laba Step 2-3 Display ✅ Ready

**Location:** Dashboard → Manajemen Pendanaan → Alokasi Laba Tab → "Load Data" button

**What should happen:**

**Step 2 Display:**
- Shows all investors with their hutang status badge
- Color coding:
  - ✅ LUNAS (green): No outstanding
  - ⚠️ CICIL (orange): Has monthly hutang
  - ❌ BELUM (red): Never paid before
  - (New) FULL_PAYMENT: Will NOT appear in total hutang calculation

**Step 3 Auto-Deduct:**
- Button: "Lanjut: Auto-Deduct Hutang"
- Shows: Total Profit Pending → minus Total Hutang (only CICIL investors)
- Result: Profit After Hutang = available for Kas top-up + Simpan Uang + Profit share

**Verification Checklist:**
- [ ] Step 2 loads investor list
- [ ] totalHutang shows only CICIL investors (not FULL_PAYMENT)
- [ ] Step 3 auto-deduct correctly calculates remaining profit
- [ ] FULL_PAYMENT investors don't reduce the profit pool

---

### Task 4: Verify autoDeductHutang Logic ✅ Verified

**Code Location:** `src/app/dashboard/funding/page.tsx` line 968

**Current Implementation (CORRECT):**
```typescript
function autoDeductHutang() {
  const allocations: Record<string, { investorName: string; amount: number }> = {};
  let remainingProfit = profitPending;

  // Prioritas: bayar hutang investor CICIL dulu
  for (const investor of data.investors) {
    const hutang = investorHutang[investor.id];
    if (hutang && hutang.status === 'cicil') {  // ← ONLY CICIL!
      const toPay = Math.min(hutang.outstanding, remainingProfit);
      if (toPay > 0) {
        allocations[investor.id] = { investorName: investor.name, amount: toPay };
        remainingProfit -= toPay;
      }
    }
  }

  setHutangAllocations(allocations);
  setProfitAfterHutang(remainingProfit);
  setStep(5);
}
```

**What this does:**
✅ Loops through investors
✅ Filters for `hutang.status === 'cicil'` (skips full_payment!)
✅ Deducts only CICIL hutang from remaining profit
✅ FULL_PAYMENT investors are completely ignored

---

### Task 5: API Endpoint Ready ✅

**POST `/api/capital`**
- Accepts: `hutang_status`, `cicilan_amount`, `cicilan_start_date`, `cicilan_months`
- Validates: cicilan_amount required when hutang_status='cicilan'
- Stores: All fields + audit trail (hutang_status_set_at, hutang_status_set_by)
- Status: **Ready**

**GET `/api/investors/{id}?hutang-status=true`**
- Returns: hutang status from database (not calculated)
- Includes: cicilan_info with monthly breakdown
- Status: **Ready**

---

## Summary: What's Working Now ✅

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend Form | ✅ Ready | Modal Masuk has hutang_status selection |
| API Endpoints | ✅ Ready | Accept and store hutang_status |
| Database Fields | ⏳ Pending | Need migration execution |
| Alokasi Laba Logic | ✅ Ready | Already filters for cicil only |
| Type Definitions | ✅ Fixed | No TypeScript errors |

---

## Next Steps

**Priority 1 (Unblock everything):**
1. Execute migration SQL on Supabase
2. Refresh dev server
3. Test Modal Masuk form submission

**Priority 2 (Verify workflow):**
1. Test Alokasi Laba loads correctly with new hutang_status data
2. Verify Step 3 auto-deduct only includes CICIL investors
3. Check that FULL_PAYMENT investors don't affect profit allocation

**Priority 3 (Finish Phase 1):**
1. Test complete workflow: Modal → Alokasi → Profit distribution
2. Verify investor sees correct hutang in dashboard
3. Test monthly cicilan calculation in future allocations

---

## Key Business Rules Implemented

### Rule 1: Hutang Status at Input Time
- User chooses FULL_PAYMENT or CICILAN when recording capital
- Choice stored permanently with audit trail
- Cannot change retroactively (immutable)

### Rule 2: FULL_PAYMENT = No Alokasi Laba Hutang Deduction
- FULL_PAYMENT investors: hutang does NOT reduce Profit Pending
- Their mode is "bayar nanti" (pay later, outside system)
- Entire capital is considered as owner's liability

### Rule 3: CICILAN = Automatic Monthly Deduction
- CICILAN investors: hutang deducted from monthly Profit Pending
- Amount fixed at input time (e.g., 75,000/month for 4 months)
- Continues monthly until hutang_status becomes 'lunas'

---

## Database State After Migration

```sql
ALTER TABLE capital_entries ADD COLUMN hutang_status VARCHAR(20) 
  DEFAULT 'cicilan' CHECK (hutang_status IN ('full_payment', 'cicilan'));
ALTER TABLE capital_entries ADD COLUMN cicilan_amount INTEGER;
ALTER TABLE capital_entries ADD COLUMN cicilan_start_date DATE;
ALTER TABLE capital_entries ADD COLUMN cicilan_months INTEGER;
ALTER TABLE capital_entries ADD COLUMN hutang_status_set_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE capital_entries ADD COLUMN hutang_status_set_by VARCHAR(255);

-- Index for fast lookup
CREATE INDEX idx_capital_entries_hutang_status 
  ON capital_entries(investor_id, hutang_status);
```

---

## Error Resolution History

✅ Fixed: "RpNaN" display → API routing + field name mismatch
✅ Fixed: TypeScript type errors → Updated investorHutang type definition
✅ Fixed: Hutang auto-calculated → Now database-driven from user input
