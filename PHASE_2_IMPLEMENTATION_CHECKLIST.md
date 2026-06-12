# Phase 2: Dashboard Kas Utama Tracking Panel - Implementation Checklist

**Objective:** Enable users to see transparent breakdown of Kas Utama sources (capital, sales, allocation) and outflows (expenses, cicilan payments)

**Current State:**
- Kas Utama balance displays as single number (Rp 524,611)
- User cannot see breakdown: how much from capital? from sales? spent on expenses?
- Zero visibility into cash flow components

**Goal:** Real-time tracking dashboard with:
- Current balance visualization
- Sources breakdown (capital injections, sales, profit allocations)
- Outflows breakdown (operating expenses, cicilan repayments)
- Timeline/history view (optional v2)

---

## Task 1: Create API Endpoint `/api/cash/kas-utama-tracking`

**Location:** `src/app/api/cash/kas-utama-tracking/route.ts`

**Request:**
```
GET /api/cash/kas-utama-tracking?outlet_id=xxx&month=2026-06
```

**Response Structure:**
```json
{
  "outlet_id": "outlet-123",
  "month": "2026-06",
  "current_balance": 524611,
  "sources": {
    "capital_input": {
      "label": "Modal Masuk",
      "total_amount": 524611,
      "transactions": [
        { "investor": "Agus", "amount": 370111, "date": "2026-06-08" },
        { "investor": "Rendi", "amount": 53500, "date": "2026-06-08" },
        { "investor": "Damim", "amount": 101000, "date": "2026-06-08" }
      ]
    },
    "sales": {
      "label": "Penjualan",
      "total_amount": 0,
      "transactions": []
    },
    "allocation_profit": {
      "label": "Alokasi Profit",
      "total_amount": 0,
      "transactions": []
    }
  },
  "outflows": {
    "expenses": {
      "label": "Pengeluaran Operasional",
      "total_amount": 0,
      "transactions": []
    },
    "allocation_cicilan": {
      "label": "Pembayaran Hutang (Cicilan)",
      "total_amount": 0,
      "transactions": []
    }
  },
  "net_flow": 524611,
  "calculation_breakdown": {
    "opening_balance": 0,
    "plus_sources": 524611,
    "minus_outflows": 0,
    "closing_balance": 524611
  }
}
```

**Implementation Logic:**

```typescript
// Step 1: Get current kas_utama balance
SELECT balance FROM financial_accounts 
WHERE outlet_id = ? AND account_type = 'kas_utama'

// Step 2: Get capital inputs (modal masuk)
SELECT investor, amount, date 
FROM capital_entries 
WHERE outlet_id = ? AND DATE_TRUNC('month', date) = ?

// Step 3: Get sales transactions
SELECT category, amount, date 
FROM cash_transactions 
WHERE outlet_id = ? AND type = 'inflow' AND source = 'sales'
AND DATE_TRUNC('month', date) = ?

// Step 4: Get allocation inflows
SELECT investor, amount, date 
FROM profit_allocations 
WHERE outlet_id = ? AND allocation_month = ?

// Step 5: Get operating expenses
SELECT category, amount, date 
FROM cash_transactions 
WHERE outlet_id = ? AND type = 'outflow' AND purpose = 'expenses'
AND DATE_TRUNC('month', date) = ?

// Step 6: Get cicilan repayments
SELECT investor, amount, date 
FROM capital_repayments 
WHERE outlet_id = ? AND DATE_TRUNC('month', date) = ?
```

**Code File:**
- Create: `src/app/api/cash/kas-utama-tracking/route.ts`
- Status: **To Do**

---

## Task 2: Build Dashboard UI Component

**Location:** `src/components/dashboard/KasUtamaTracking.tsx`

**Component Structure:**
```tsx
export function KasUtamaTracking({ outletId, month }: { outletId: string; month: string }) {
  // Fetch data from API
  // Render:
  // 1. Balance display (big card, Rp XXX)
  // 2. Sources section (grid or cards)
  //    - Capital Masuk: Rp XXX
  //    - Penjualan: Rp XXX
  //    - Alokasi Profit: Rp XXX
  // 3. Outflows section (grid or cards)
  //    - Pengeluaran: Rp XXX
  //    - Pembayaran Cicilan: Rp XXX
  // 4. Calculation breakdown (optional expandable)
}
```

**UI Layout:**
```
┌─ Kas Utama Tracking Panel ─────────────┐
│                                        │
│  💰 Saldo Kas Utama Saat Ini          │
│  Rp 524,611                            │
│                                        │
├─ 📥 SUMBER KAS ──────────────────────┤
│ ┌─ Modal Masuk         │ Rp 524,611 ┐ │
│ │ • Agus       370,111             │ │
│ │ • Rendi       53,500             │ │
│ │ • Damim      101,000             │ │
│ │                                  │ │
│ ├─ Penjualan           │ Rp 0      ┤ │
│ │ (Belum ada transaksi)             │ │
│ │                                  │ │
│ └─ Alokasi Profit      │ Rp 0      ┘ │
│   (Belum ada alokasi)                │
│                                        │
├─ 📤 KELUARAN KAS ─────────────────────┤
│ ┌─ Pengeluaran         │ Rp 0      ┐ │
│ │ (Belum ada pengeluaran)            │ │
│ │                                  │ │
│ └─ Pembayaran Cicilan  │ Rp 0      ┘ │
│   (Belum ada pembayaran)              │
│                                        │
├─ 🧮 PERHITUNGAN ──────────────────────┤
│ Saldo Awal              Rp 0          │
│ + Sumber Kas          + Rp 524,611    │
│ - Keluaran Kas        - Rp 0          │
│ ──────────────────────────────        │
│ = Saldo Akhir         = Rp 524,611    │
│                                        │
└─ [Refresh] [Export] ──────────────────┘
```

**File:**
- Create: `src/components/dashboard/KasUtamaTracking.tsx`
- Status: **To Do**

---

## Task 3: Integrate into Main Dashboard

**Location:** `src/app/dashboard/page.tsx` or `src/app/dashboard/(main)/page.tsx`

**Integration:**
- Add KasUtamaTracking component to dashboard
- Pass outletId and current month
- Position: Below existing financial summary or in sidebar
- Height: ~600px (scrollable if needed)

**Changes:**
- Import KasUtamaTracking component
- Add to JSX layout
- Style to match dashboard theme

**File:**
- Update: `src/app/dashboard/page.tsx`
- Status: **To Do**

---

## Task 4: Test & Validation

**Test Case 1: Current Data**
- Open Dashboard → Kas Utama Tracking
- Verify balance = Rp 524,611
- Verify sources breakdown shows 3 investors with correct amounts
- Verify outflows = Rp 0 (no expenses yet)

**Test Case 2: Month Navigation**
- Change month selector (if implemented)
- Verify data updates correctly

**Test Case 3: API Response**
- Call `/api/cash/kas-utama-tracking?outlet_id=xxx&month=2026-06`
- Verify JSON structure matches spec
- Verify totals add up correctly

**Status:** **To Do**

---

## Implementation Order

1. ✅ **Done:** Understand Phase 2 requirements
2. ⏳ **Next:** Create API endpoint `/api/cash/kas-utama-tracking`
3. ⏳ **Then:** Build UI component `KasUtamaTracking`
4. ⏳ **Then:** Integrate into dashboard
5. ⏳ **Then:** Test end-to-end

---

## Key Business Rules

**Rule 1: Kas Utama Balance Calculation**
```
Opening Balance (from financial_accounts.kas_utama_balance)
+ Capital Inputs (from capital_entries)
+ Sales Revenue (from cash_transactions where source='sales')
+ Profit Allocations (from profit_allocations)
- Operating Expenses (from cash_transactions where purpose='expenses')
- Cicilan Repayments (from capital_repayments)
= Closing Balance
```

**Rule 2: Transaction Inclusion**
- Only include transactions for current outlet_id
- Only include transactions from current month (configurable)
- Include investor names for capital and cicilan
- Group by category/investor for clarity

**Rule 3: Data Freshness**
- Fetch real-time from database
- Cache for 5-10 minutes to reduce queries
- Manual refresh button available

---

## Database Tables Involved

| Table | Columns Used | Purpose |
|-------|-------------|---------|
| `financial_accounts` | `kas_utama_balance` | Current balance |
| `capital_entries` | `investor_id`, `amount`, `date` | Capital sources |
| `cash_transactions` | `source`, `purpose`, `amount`, `date` | Sales + expenses |
| `profit_allocations` | `investor_id`, `amount`, `allocation_month` | Profit allocation sources |
| `capital_repayments` | `investor_id`, `amount`, `date` | Cicilan outflows |

---

## Success Criteria

✅ API endpoint returns correct data structure
✅ UI component renders correctly
✅ Totals add up: opening + sources - outflows = closing
✅ All transactions visible with investor/category details
✅ Works for current month and previous months
✅ Responsive on mobile and desktop
✅ Refresh/reload updates data

---

## Notes for Implementation

- Use same formatting functions as rest of dashboard (formatCurrency)
- Use consistent color scheme (green for inflows, red for outflows)
- Add loading state while fetching data
- Add error handling if data unavailable
- Consider adding a simple chart visualization (optional v2)

