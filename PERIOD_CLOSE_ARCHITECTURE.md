# 📋 Period Close & Adaptive Allocation Architecture

**Status:** Implementation Plan  
**Created:** 2026-06-12  
**Target Start:** This Week  
**Approval:** ✅ APPROVED

---

## 📌 Executive Summary

Sistem baru untuk manage **monthly period closing** + **adaptive allocation strategy**:
- **Tutup Buku**: Fixed tanggal 5 setiap bulan (lock transactions, process allocations)
- **Adaptive Allocation**: Start 60-40, flip to 40-60 after Month 3 (data-driven)
- **Sesi Harian**: Split into Editable (current) + Read-only (historical)

---

## 🎯 Goals

1. **Period Governance**: Clear business period boundaries
2. **Data-Driven Decisions**: Collect actual costs before changing allocation %
3. **User-Friendly**: Separate active sessions from history
4. **Audit Trail**: Record all allocation changes with reasoning
5. **Scalability**: Support long-term evolution to actual costing (Phase 5+)

---

## 🔄 Allocation Strategy

### Current State (Phase 1-4)
```
Monthly Revenue Split:
├── 60% → Kas Utama (operational buffer)
└── 40% → Profit Pending (allocation laba, cicilan, bonus)
```

### Transition Plan

#### Month 1-3: Data Collection Phase
```
├── Maintain: 60-40 split (conservative, safe)
├── Action: Track ALL actual operational spending
├── Review: Every tutup buku (5th of month)
├── Question: Is operational really 60%?
└── Expected: Actual operational costs ~40-45%
```

#### Month 3 Tutup Buku: Decision Point
```
├── Review: 3 months of actual spending data
├── Analysis: Compare actual vs 60% allocation
├── Decision: If consistently 20%+ over-allocated
│   └── APPROVE change to 40-60 split
├── Effective: Starting next period (after tutup buku)
└── Record: In allocation_rules history
```

#### Month 4+: Adaptive Mode
```
├── Allocation: 40% Kas Utama, 60% Profit Pending
├── Monitor: Continue tracking actual costs
├── Review: Can adjust % in future closes if needed
├── Philosophy: Data-driven, not set-and-forget
└── Next evolution: Phase 5 (actual costing)
```

---

## 🗓️ Tutup Buku System

### Definition
**Tutup Buku** = Monthly financial close on the 5th of every month
- Lock all transactions for completed period
- Reconcile & process allocations
- Optionally change allocation rules
- Create snapshot for accounting

### Timeline

```
Period Structure:
├── Period 1: June 6, 2026 - July 5, 2026
│   └── Tutup Buku: July 5, 2026 (end of day)
│
├── Period 2: July 6, 2026 - Aug 5, 2026
│   └── Tutup Buku: Aug 5, 2026 (end of day)
│
└── Period 3: Aug 6, 2026 - Sep 5, 2026
    └── Tutup Buku: Sep 5, 2026 (end of day)
    └── Decision: Change to 40-60? (based on 3 months data)
```

### Tutup Buku Action Flow

```
USER ACTION: Clicks [🔒 Tutup Buku] button

SYSTEM PROCESSES:

1. Validation
   ├── Check: Is today the 5th?
   ├── Check: All sesi harian recorded?
   └── Confirm: User ready to close?

2. Lock Current Period
   ├── UPDATE daily_sessions SET is_locked=true 
   │   WHERE period_id = current_period
   ├── UPDATE periods SET status='closed', closed_at=NOW()
   └── Record: closed_by VARCHAR

3. Create Buku Closing Record
   ├── Calculate: total_revenue (sum sesi harian)
   ├── Calculate: actual_operational_spent (from expense tracking)
   ├── Calculate: allocated_operational_buffer (60% of revenue)
   ├── Calculate: variance = allocated - actual
   ├── Determine: Should we change allocation rule?
   └── CREATE buku_closing record

4. Process Allocations (if applicable)
   ├── Create capital_repayments (hutang cicilan)
   ├── Create profit_allocations (bagi hasil)
   ├── Create employee_allocations (karyawan)
   └── Record: allocation records linked to buku_closing

5. Optionally Change Allocation Rule
   ├── IF variance > 20% AND month >= 3:
   │   ├── Show: "Rekomendasi: Change to 40-60 split"
   │   ├── Action: User confirms or declines
   │   └── CREATE: New allocation_rule record (effective next period)
   └── ELSE: Keep current allocation rule

6. Create Next Period
   ├── CREATE: New period (status='active', tomorrow's date)
   └── Ready: For new daily sessions next month

7. Reset UI
   ├── Clear: Sesi Aktif tab (shows empty state)
   ├── Update: Riwayat Sesi tab (add new closed period)
   └── Show: Success modal with summary

OUTPUT:
├── Riwayat Buku Closing: Recorded for audit
├── Transactions: Locked, cannot be edited
├── Allocations: Processed & recorded
├── Next Period: Ready for new entries
└── Allocation Rule: Optionally changed (if approved)
```

---

## 💾 Database Schema

### New Tables

#### `periods` Table
```sql
CREATE TABLE periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Period definition
  period_month VARCHAR(7) NOT NULL,        -- "2026-06" (YYYY-MM)
  period_start_date DATE NOT NULL,         -- 2026-06-06
  period_end_date DATE NOT NULL,           -- 2026-07-05
  
  -- Status tracking
  status VARCHAR(20) NOT NULL,             -- 'active' | 'closed'
  is_locked BOOLEAN DEFAULT false,         -- True after tutup buku
  
  -- Audit trail
  created_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP,                     -- When closed
  closed_by VARCHAR,                       -- Who closed (user email/id)
  
  -- Indexing
  UNIQUE (outlet_id, period_month),
  INDEX idx_periods_outlet_status (outlet_id, status)
);
```

#### `buku_closings` Table
```sql
CREATE TABLE buku_closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
  
  -- Financial recap
  total_revenue DECIMAL(15, 2) NOT NULL,           -- Sum of sesi harian
  total_sales_transactions INT DEFAULT 0,          -- Count of sesi
  
  actual_operational_spent DECIMAL(15, 2) NOT NULL, -- Tracked spending
  allocated_operational_buffer DECIMAL(15, 2),    -- 60% or new % of revenue
  variance DECIMAL(15, 2),                        -- allocated - actual
  variance_percent DECIMAL(5, 2),                 -- variance / revenue * 100
  
  -- Allocation processing
  total_cicilan_allocated DECIMAL(15, 2) DEFAULT 0,
  total_profit_allocated DECIMAL(15, 2) DEFAULT 0,
  total_employee_allocated DECIMAL(15, 2) DEFAULT 0,
  
  -- Decision point
  current_allocation_rule_id UUID REFERENCES allocation_rules(id),
  next_allocation_rule_id UUID REFERENCES allocation_rules(id),
  allocation_changed BOOLEAN DEFAULT false,
  change_reason TEXT,
  
  -- Metadata
  notes TEXT,
  closed_at TIMESTAMP DEFAULT NOW(),
  closed_by VARCHAR,
  
  INDEX idx_buku_closings_outlet_period (outlet_id, period_id)
);
```

#### `allocation_rules` Table
```sql
CREATE TABLE allocation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  
  -- Rule definition
  kas_utama_percent DECIMAL(5, 2) NOT NULL,      -- e.g., 60.00 or 40.00
  profit_pending_percent DECIMAL(5, 2) NOT NULL, -- e.g., 40.00 or 60.00
  
  -- Temporal
  effective_from_date DATE NOT NULL,  -- When this rule starts
  effective_to_date DATE,             -- When this rule ended (NULL if current)
  is_current BOOLEAN DEFAULT true,
  
  -- Governance
  approved_by VARCHAR NOT NULL,
  approved_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,                        -- Why this rule chosen
  
  -- History tracking
  previous_rule_id UUID REFERENCES allocation_rules(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_allocation_rules_outlet_current (outlet_id, is_current)
);
```

### Modified Tables

#### `daily_sessions` Alterations
```sql
ALTER TABLE daily_sessions ADD COLUMN (
  period_id UUID REFERENCES periods(id) ON DELETE CASCADE,
  is_locked BOOLEAN DEFAULT false,    -- True after tutup buku
  locked_at TIMESTAMP,
  locked_by VARCHAR,
  period_end_date DATE                -- Denormalized for query speed
);

-- Add indexes
CREATE INDEX idx_daily_sessions_period (period_id);
CREATE INDEX idx_daily_sessions_locked (is_locked);
```

#### `buku_closings` Link
```sql
ALTER TABLE buku_closings ADD COLUMN (
  profit_allocation_processing_complete BOOLEAN DEFAULT false
);
```

---

## 🔌 API Endpoints

### Period Management

#### `GET /api/periods`
```
Query params:
  outlet_id (required)
  status (optional): 'active' | 'closed'
  limit (optional, default 12)

Response:
{
  success: true,
  periods: [
    {
      id: UUID,
      outlet_id: UUID,
      period_month: "2026-06",
      period_start_date: "2026-06-06",
      period_end_date: "2026-07-05",
      status: "active" | "closed",
      is_locked: boolean,
      closed_at: timestamp | null
    },
    ...
  ]
}
```

#### `GET /api/periods/current`
```
Query params:
  outlet_id (required)

Response:
{
  success: true,
  current_period: { ...period data... },
  current_allocation_rule: {
    kas_utama_percent: 60,
    profit_pending_percent: 40,
    effective_from_date: "2026-06-06"
  }
}
```

#### `POST /api/periods/close`
```
Body:
{
  outlet_id: UUID (required),
  period_id: UUID (required),
  allocation_change_approved?: {
    new_kas_utama_percent: 40,
    reason: "Phase 3 analysis shows actual operational 40%"
  }
}

Response:
{
  success: true,
  buku_closing_id: UUID,
  summary: {
    period_closed: "2026-06",
    sessions_locked: 28,
    total_revenue: 50000000,
    variance_percent: -15,
    variance_interpretation: "Under-allocated by 15%",
    allocation_changed: boolean,
    next_allocation_rule: { ... }
  }
}
```

### Buku Closing

#### `GET /api/buku-closings`
```
Query params:
  outlet_id (required)
  period_id (optional)
  limit (optional, default 12)

Response:
{
  success: true,
  closings: [
    {
      id: UUID,
      period_id: UUID,
      period_month: "2026-06",
      total_revenue: 50000000,
      variance_percent: -15,
      allocation_changed: boolean,
      closed_at: timestamp
    },
    ...
  ]
}
```

#### `POST /api/buku-closings` (internal, called by close action)
```
Body:
{
  outlet_id: UUID,
  period_id: UUID,
  total_revenue: number,
  actual_operational_spent: number,
  allocation_change?: allocation_rules record
}

Response:
{
  success: true,
  buku_closing_id: UUID
}
```

### Allocation Rules

#### `GET /api/allocation-rules/history`
```
Query params:
  outlet_id (required)

Response:
{
  success: true,
  rules: [
    {
      id: UUID,
      kas_utama_percent: 60,
      profit_pending_percent: 40,
      effective_from_date: "2026-06-06",
      effective_to_date: "2026-09-05",
      approved_by: "admin@outlet.com",
      reason: "MVP baseline"
    },
    {
      id: UUID,
      kas_utama_percent: 40,
      profit_pending_percent: 60,
      effective_from_date: "2026-09-06",
      effective_to_date: null,
      approved_by: "admin@outlet.com",
      reason: "Phase 3 analysis: actual operational 40%"
    }
  ]
}
```

### Update Daily Sessions

#### `GET /api/daily-sessions`
```
Changes:
  ✅ Add period_id filter
  ✅ Add is_locked check
  ✅ Exclude locked sessions by default (use ?include_locked=true)
```

#### `POST /api/daily-sessions` (Create)
```
Changes:
  ✅ Auto-assign period_id based on date & current active period
  ✅ Return error if period is locked (status 403: "Period closed")
```

#### `PATCH /api/daily-sessions/{id}` (Update)
```
Changes:
  ✅ Check: if is_locked=true, return 403 "Cannot edit locked session"
  ✅ Return 403 if period is closed
```

---

## 🎨 UI Changes

### Sesi Harian Page (`/dashboard/sessions`)

#### Current Architecture (Before)
```
/dashboard/sessions
├── Header: "Sesi Harian"
├── [SessionCard 1] (editable)
├── [SessionCard 2] (editable)
├── [+ Tambah Sesi] button
└── [🔒 Tutup Buku] button (appears near bottom)
```

#### New Architecture (After)

```
/dashboard/sessions
├── <Tabs>
│   ├── Tab 1: "📝 Sesi Aktif"
│   └── Tab 2: "📚 Riwayat Sesi"
│
├── TAB 1: SESI AKTIF (Active Sessions)
│  ├── Header
│  │  ├── "Sesi Harian - Juni 2026"
│  │  ├── Status badge: "🟢 Aktif"
│  │  └── Subtitle: "Buka: 2026-06-06"
│  │
│  ├── Content (when active period exists)
│  │  ├── [SessionCard 1] ✏️ EDITABLE
│  │  │  ├── [Edit button]
│  │  │  ├── [Delete button]
│  │  │  └── [View details]
│  │  ├── [SessionCard 2] ✏️ EDITABLE
│  │  │  └── (same controls)
│  │  ├── [+ Tambah Sesi] button (blue)
│  │  └── Divider
│  │
│  ├── Action Area
│  │  └── [🔒 Tutup Buku] button (red/warning color)
│  │     └── Tooltip: "Close period on 5th, lock sessions, process allocations"
│  │
│  └── Empty State (after tutup buku, before next period data arrives)
│     ├── 🎉 "Periode Ditutup!"
│     ├── "Tutup buku berhasil di-proses"
│     ├── "Bulan baru siap untuk sesi harian baru"
│     └── [Tunggu sebentar... loading]
│
├── TAB 2: RIWAYAT SESI (Historical Sessions)
│  │
│  ├── "Mei 2026" [▶/▼ toggle]
│  │  ├── Subtitle: "Tutup: 2026-06-05"
│  │  └── [Collapsed by default]
│  │     └── [SessionCard 1] 📄 READ-ONLY
│  │        ├── Status badge: "🔒 Arsip"
│  │        ├── Fields visible but disabled
│  │        └── [View full details] (read-only modal)
│  │     └── [SessionCard 2] 📄 READ-ONLY
│  │
│  ├── "April 2026" [▶/▼ toggle]
│  │  ├── Subtitle: "Tutup: 2026-05-05"
│  │  └── [Collapsed by default]
│  │     └── [SessionCard 1] 📄 READ-ONLY
│  │     └── [SessionCard 2] 📄 READ-ONLY
│  │
│  └── (older periods, collapsed)
```

### SessionCard Component Changes

#### Active Session Card (Editable)
```tsx
<SessionCard 
  session={session}
  isLocked={false}
  onEdit={handleEdit}
  onDelete={handleDelete}
/>

// Visual: White card, full input fields, edit/delete buttons visible
// Behavior: All fields editable, can delete
```

#### Historical Session Card (Read-Only)
```tsx
<SessionCard 
  session={session}
  isLocked={true}
  isHistorical={true}
/>

// Visual: Gray card with "🔒 Arsip" badge, fields disabled/grayed
// Behavior: Click to view details in modal (read-only), no edits
```

### Tutup Buku Modal

#### Step 1: Confirmation
```
Title: "🔒 Tutup Buku - Periode Juni 2026?"

Content:
├── "Setelah tutup buku:"
├── "✅ Semua sesi harian terkunci (tidak bisa diubah)"
├── "✅ Data dipindah ke Riwayat Sesi"
├── "✅ Bulan baru dimulai"
├── "⚠️ Aksi ini tidak bisa dibatalkan"
└── "Total sesi tercatat: 28"

Buttons:
├── [Batal]
└── [Lanjut →] (primary)
```

#### Step 2: Allocation Review (if Month >= 3)
```
Title: "💰 Review Alokasi"

Content:
├── "Total Revenue: Rp 50,000,000"
├── "Actual Operational: Rp 20,000,000 (40%)"
├── "Allocated Buffer: Rp 30,000,000 (60%)"
├── "Variance: -Rp 10,000,000 (-20%)"
├── ""
├── "📊 Analisis:"
├── "Over-allocated by 20% untuk 3 bulan berturut-turut"
├── ""
├── "🔄 Rekomendasi:"
├── "Ubah alokasi ke 40% Kas Utama, 60% Profit Pending"
└── ""

Options:
├── ☐ "Setuju dengan rekomendasi"
└── ☐ "Tidak, tetap 60-40 untuk sekarang"

Buttons:
├── [← Kembali]
└── [Tutup Buku ✓] (enabled if checkbox selected)
```

#### Step 3: Success
```
Title: "✅ Tutup Buku Berhasil!"

Content:
├── "Periode Juni 2026 ditutup"
├── "Sesi: 28 → 🔒 Terkunci"
├── ""
├── "Allocation Rule:"
├── "  Dari: 60% Kas, 40% Profit"
├── "  Ke:   40% Kas, 60% Profit (BARU)"
├── ""
├── "Next: Bulan Juli 2026"
├── "Buka: 2026-07-06"
└── "Siap untuk sesi harian baru ✓"

Button:
└── [Tutup & Refresh] → Reload page, show empty Sesi Aktif tab
```

### Dashboard Integration

#### Funding Page Update
```
When Tutup Buku closes period:
├── Auto-check: Are there hutang to pay/cicilan?
├── If yes: Create profit_allocations automatically
├── If employee mode active: Create employee_allocations
├── Record: All linked to buku_closing record
└── Show: Summary "Period close processed: X cicilan, Y bonuses"
```

---

## 📊 Implementation Phases

### Phase A: Database & API (This Week - Days 1-3)

**Deliverables:**
- ✅ `periods` table created
- ✅ `buku_closings` table created
- ✅ `allocation_rules` table created
- ✅ `daily_sessions` altered (add period_id, is_locked)
- ✅ All API endpoints implemented & tested
- ✅ Backward compatibility: Create initial period record for today

**Testing:**
- ✅ Unit tests for period close logic
- ✅ API integration tests
- ✅ Database queries optimized

---

### Phase B: UI Implementation (Days 3-5)

**Deliverables:**
- ✅ Split sessions page into 2 tabs
- ✅ Tab 1: Active sessions (editable, with Tutup Buku button)
- ✅ Tab 2: Historical sessions (expandable, read-only)
- ✅ SessionCard: two variants (edit vs read-only)
- ✅ Tutup Buku modal: 3-step flow
- ✅ Error handling: Prevent edits on locked sessions

**Testing:**
- ✅ Browser testing: Create, edit, lock flow
- ✅ Locked session verification: Can't edit
- ✅ Modal flow: Confirm, review, success
- ✅ Historical view: Expand/collapse works

---

### Phase C: Integration & Data Collection (Week 2)

**Deliverables:**
- ✅ Dashboard integration: Show allocation rules
- ✅ Expense tracking UI (simple): Log operational costs
- ✅ Month 1-3 data collection started

**Actions:**
- Train team on Tutup Buku process
- Start tracking actual operational spending daily
- Review every tutup buku (5th of month)

---

### Phase D: Month 3 Decision (After 3 Months)

**Deliverables:**
- ✅ 3 months of actual spending data analyzed
- ✅ Decision: Flip to 40-60 if data supports
- ✅ New allocation_rule created (effective next period)

**Actions:**
- Review variance trends
- Decide on allocation % change
- Document reasoning

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Forgot to tutup buku on 5th | Data gets messy | ❌ Reminder system, admin notification, can't save sesi harian after day 5 |
| Allocation rule change affects existing data | Confusion, accounting errors | ✅ New rule only effective next period, historical unaffected |
| Users edit locked sessions (bypass) | Data integrity lost | ✅ API check: 403 if is_locked=true, UI disables buttons |
| Month 3 analysis inconclusive | Can't decide to change % | ✅ Stakeholder meeting to review data, may extend Phase B |

---

## 📋 Success Criteria

### Phase A (Database/API)
- ✅ All tables created & migrated
- ✅ API endpoints tested & returning correct data
- ✅ 0 SQL errors
- ✅ Backward compatibility: existing data migrated

### Phase B (UI)
- ✅ Sessions page split into 2 tabs
- ✅ Tutup Buku button works end-to-end
- ✅ Locked sessions can't be edited
- ✅ Historical view functional
- ✅ Modal flow intuitive

### Phase C (Data Collection)
- ✅ Team trained on Tutup Buku process
- ✅ Actual operational costs tracked daily
- ✅ 1st month close completed successfully
- ✅ No data loss, audit trail intact

### Phase D (Month 3 Decision)
- ✅ 3 months of data analyzed
- ✅ Variance trends identified
- ✅ Decision made & documented
- ✅ New allocation rule created (if applicable)

---

## 📚 Documentation Needed

1. **User Guide**: How to use Tutup Buku feature
2. **Data Collection Guide**: How to track operational costs
3. **API Reference**: New endpoints documentation
4. **Database Schema**: Visual diagram
5. **Architecture Diagram**: System flow

---

## ✅ Sign-Off

- **Prepared By:** Architecture Team
- **Date:** 2026-06-12
- **Status:** APPROVED - Ready for Implementation
- **Next Action:** Begin Phase A (Database/API)

---

## 📞 Questions Before Starting?

Before we execute, any clarifications needed on:
- Database schema? ✅
- API endpoints? ✅
- UI mockups? ✅
- Timeline? ✅
- Risk mitigations? ✅
