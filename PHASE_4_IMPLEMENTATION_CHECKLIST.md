# Phase 4: Pembayaran Cicilan (Repayment) - Implementation Checklist

**Objective:** Record actual cicilan payments dari investors dan update hutang outstanding.

**Current State:**
- Alokasi Laba sudah buat plan pembayaran
- `capital_repayments` table sudah ada tapi belum diupdate untuk tracking cicilan
- Tab "Pembayaran" di funding page ada tapi minimal

**Goal:** 
- Form input untuk catat pembayaran cicilan
- Validasi: cicilan ≤ allocation dari Alokasi Laba
- Update `capital_entries.outstanding_hutang` 
- Create audit trail di `capital_repayments`
- Show remaining hutang after payment

---

## Task 1: Update capital_repayments Table (Database)

**Location:** `migrations/phase4-repayment-tracking.sql`

**Changes Required:**

```sql
-- 1. Add columns untuk tracking cicilan
ALTER TABLE capital_repayments
ADD COLUMN IF NOT EXISTS cicilan_number INT,  -- Cicilan ke-N
ADD COLUMN IF NOT EXISTS allocated_from_alokasi_laba UUID REFERENCES profit_allocations(id),
ADD COLUMN IF NOT EXISTS remaining_after_payment DECIMAL(15, 2);

-- 2. Create repayment_tracking table untuk audit trail detail
CREATE TABLE IF NOT EXISTS repayment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Repayment detail
  repayment_date DATE NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  repayment_type VARCHAR(50) DEFAULT 'cicilan' CHECK (repayment_type IN ('cicilan', 'full_payment')),
  
  -- Before/After
  outstanding_before DECIMAL(15, 2),
  outstanding_after DECIMAL(15, 2),
  
  -- Reference
  capital_entry_id UUID REFERENCES capital_entries(id),
  capital_repayment_id UUID REFERENCES capital_repayments(id),
  profit_allocation_id UUID REFERENCES profit_allocations(id),
  
  -- Metadata
  payment_method VARCHAR(50), -- bank_transfer, cash, check
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255)
);

CREATE INDEX idx_repayment_tracking_investor ON repayment_tracking(investor_id);
CREATE INDEX idx_repayment_tracking_outlet ON repayment_tracking(outlet_id);
CREATE INDEX idx_repayment_tracking_date ON repayment_tracking(repayment_date);

-- Enable RLS
ALTER TABLE repayment_tracking ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repayment_tracking_all" ON repayment_tracking;
CREATE POLICY "repayment_tracking_all" ON repayment_tracking FOR ALL USING (true);
```

**File:**
- Create: `migrations/phase4-repayment-tracking.sql`
- Status: **To Do**

---

## Task 2: Create Repayment API Endpoint

**Location:** `/api/capital-repayments` (update POST handler)

**Request:**
```json
{
  "outlet_id": "xxx",
  "investor_id": "yyy",
  "repayment_date": "2026-06-15",
  "amount_paid": 500000,
  "repayment_type": "cicilan",
  "payment_method": "bank_transfer",
  "notes": "Cicilan bulan Juni"
}
```

**Validation:**
1. investor_id harus ada
2. amount_paid > 0
3. repayment_date tidak boleh di masa depan
4. Cek: amount_paid ≤ outstanding hutang
5. Cek: repayment_type='cicilan' → amount_paid ≤ allocated_cicilan dari Alokasi Laba

**Processing:**
1. Get current outstanding dari capital_entries
2. Calculate outstanding_after = outstanding_before - amount_paid
3. Insert capital_repayments record
4. Update capital_entries.outstanding_hutang
5. Insert repayment_tracking untuk audit
6. Return: {success, outstanding_after, remaining_cicilan}

**Code File:**
- Update: `src/app/api/capital-repayments/route.ts` (POST handler)
- Status: **To Do**

---

## Task 3: Get Allocated Cicilan API

**Location:** `/api/capital-repayments/allocated?investor_id=xxx&outlet_id=xxx`

**Purpose:** Fetch berapa cicilan yang sudah dialokasikan via Alokasi Laba

**Response:**
```json
{
  "investor_id": "xxx",
  "total_allocated_this_month": 500000,
  "already_paid_this_month": 100000,
  "remaining_to_pay": 400000,
  "allocation_month": "2026-06"
}
```

**Query Logic:**
- Join `profit_allocations` + `capital_repayments`
- Filter: allocation_month = current month
- Sum: allocated amount dari hutang_payments
- Sum: paid amount dari capital_repayments where status='completed'

**Code File:**
- Create: `src/app/api/capital-repayments/allocated/route.ts`
- Status: **To Do**

---

## Task 4: Update UI - Pembayaran Tab

**Location:** `src/app/dashboard/funding/page.tsx` - TabRepayment component

**New Features:**

1. **Form Fields:**
   - Investor dropdown (only CICIL status)
   - Repayment date picker
   - Amount paid input
   - Payment method dropdown (bank_transfer, cash, check)
   - Notes textarea

2. **Validation Display:**
   - Show: Outstanding hutang investor
   - Show: Allocated cicilan bulan ini
   - Show: Remaining to pay
   - Warn: if amount > remaining

3. **Submit Logic:**
   - POST to `/api/capital-repayments`
   - Show success: "Pembayaran Rp XXX berhasil dicatat! Sisa hutang: Rp YYY"
   - Refresh list & balances

4. **Display List:**
   - Table: Recent repayments
   - Columns: Investor, Date, Amount, Type, Outstanding After, Status
   - Filter: by investor, by date range

**Code File:**
- Update: `src/app/dashboard/funding/page.tsx` - TabRepayment function
- Status: **To Do**

---

## Task 5: Update Dashboard Summary

**Location:** `src/app/dashboard/dashboard/page.tsx`

**Add Card:** "Cicilan Terutang Bulan Ini"
- Show: Total cicilan allocated this month
- Show: Total cicilan paid this month
- Show: Remaining cicilan to pay
- Progress bar visual

**Code File:**
- Update: `src/app/dashboard/dashboard/page.tsx`
- Status: **To Do**

---

## Implementation Order

1. ✅ **Understand Phase 4 requirements**
2. ⏳ **Next:** Create migration SQL (`phase4-repayment-tracking.sql`)
3. ⏳ **Then:** Create `/api/capital-repayments/allocated` endpoint
4. ⏳ **Then:** Update `/api/capital-repayments` POST handler
5. ⏳ **Then:** Update Pembayaran UI form
6. ⏳ **Then:** Add dashboard summary card
7. ⏳ **Then:** Test end-to-end

---

## Key Business Rules

**Rule 1: Cicilan Payment Priority**
```
Hutang Outstanding
├─ Allocated Cicilan (dari Alokasi Laba bulan ini)
│  └─ Pembayaran hanya bisa sebesar allocated amount
└─ Sisa hutang untuk cicilan bulan depan
```

**Rule 2: Payment Validation**
- `amount_paid ≤ outstanding`
- `repayment_type='cicilan'` → `amount_paid ≤ allocated_this_month`
- `repayment_type='full_payment'` → `amount_paid = outstanding` (tutup hutang)

**Rule 3: Status Tracking**
- Status 'completed': pembayaran sudah tercatat
- Status 'cancelled': batal (void)
- Status 'pending': menunggu approval (future feature)

**Rule 4: Data Consistency**
- Every payment → create repayment_tracking record (immutable audit log)
- Update capital_entries.outstanding_hutang only after validation
- Never allow payment > outstanding

---

## Database Tables After Phase 4

| Table | Changes | Purpose |
|-------|---------|---------|
| `capital_repayments` | +cicilan_number, +allocated_from_alokasi_laba, +remaining_after_payment | Track repayments with cicilan details |
| `repayment_tracking` | (NEW) | Immutable audit log of all payments |
| `capital_entries` | outstanding_hutang (update) | Updated after each payment |

---

## Success Criteria

✅ Migration runs without errors
✅ `/api/capital-repayments` validates correctly
✅ `/api/capital-repayments/allocated` returns accurate allocated amounts
✅ UI form shows validation warnings properly
✅ After payment: outstanding_hutang updated correctly
✅ Repayment history shows in list
✅ No TypeScript errors
✅ Dashboard shows cicilan summary

---

## Edge Cases to Handle

1. **Zero allocation cicilan** → Cannot pay cicilan (must use full_payment)
2. **Overpayment attempt** → Show error, suggest remaining amount
3. **Multiple cicilan bulan-bulan** → Only show this month allocation
4. **Full payment** → Close hutang completely
5. **Negative outstanding** → Should never happen (validation prevents)

---

## Future Enhancements (Post Phase 4)

- Approval workflow (Manager approve pembayaran besar)
- Automatic email receipt to investor
- Cicilan reminder (30 hari sebelum cicilan jatuh tempo)
- Cicilan late tracking (overdue payments)
- Cicilan schedule visualization
- Bulk payment import (excel/csv)

