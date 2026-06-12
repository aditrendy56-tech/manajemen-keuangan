# Phase B: UI Implementation Checklist

> Period Close System UI - Sessions Page Redesign + Tutup Buku Modal

**Status**: 🔄 In Progress  
**Start Date**: 2026-06-12  
**Target Completion**: 2026-06-14  
**Current Phase**: Infrastructure + Component Creation

---

## 📋 Deliverables Breakdown

### 1️⃣ **Sessions Page Refactor**

- [ ] **1.1** Update page structure for tabs
  - [ ] Add Tabs component wrapper
  - [ ] Tab 1: "Active Sessions" (default)
  - [ ] Tab 2: "Historical Sessions"
  - [ ] Status: `not-started`

- [ ] **1.2** Active Sessions Tab
  - [ ] Query only sessions from current period
  - [ ] Show only non-locked sessions (is_locked = false)
  - [ ] Display: Date, Status, Revenue, Modal Awal, Modal Akhir
  - [ ] Actions: Edit, Close Session, Delete
  - [ ] Status: `not-started`

- [ ] **1.3** Historical Sessions Tab
  - [ ] Query sessions from closed periods
  - [ ] Show only locked sessions (is_locked = true)
  - [ ] Display: Date, Status, Revenue, Period Info, Lock Timestamp
  - [ ] Read-only mode (no edit/delete buttons)
  - [ ] Status: `not-started`

- [ ] **1.4** SessionForm Integration
  - [ ] Only show form in Active tab
  - [ ] Disable form if period is locked
  - [ ] Show message: "Periode sudah ditutup"
  - [ ] Status: `not-started`

---

### 2️⃣ **PeriodInfoBanner Component**

- [ ] **2.1** Create component structure
  - [ ] Display period dates (Jun 6 - Jul 5, 2026)
  - [ ] Display allocation split (60% Kas Utama / 40% Profit Pending)
  - [ ] Status: `not-started`

- [ ] **2.2** Lock status indicator
  - [ ] Show 🟢 Aktif (if period active)
  - [ ] Show 🔴 Terkunci (if period locked)
  - [ ] Status: `not-started`

- [ ] **2.3** Tutup Buku button
  - [ ] Enable only on 5th of month + period active
  - [ ] Styling: Primary button, prominent
  - [ ] Trigger: Open TutupBukuModal
  - [ ] Status: `not-started`

---

### 3️⃣ **TutupBukuModal Component**

- [ ] **3.1** Modal structure (3-step workflow)
  - [ ] Step 1: Review Summary
  - [ ] Step 2: Variance Analysis
  - [ ] Step 3: Confirm & Lock
  - [ ] Navigation: Previous/Next buttons
  - [ ] Status: `not-started`

- [ ] **3.2** Step 1: Period Summary
  - [ ] Display period dates
  - [ ] Count sessions in period
  - [ ] Calculate total revenue
  - [ ] Show allocation breakdown
  - [ ] Status: `not-started`

- [ ] **3.3** Step 2: Variance Calculation
  - [ ] Fetch allocation rule (60% baseline)
  - [ ] Calculate allocated buffer (60% of revenue)
  - [ ] Fetch actual operational spending from expenses
  - [ ] Calculate variance (allocated - actual)
  - [ ] Calculate variance % (variance / allocated * 100)
  - [ ] Generate interpretation message
  - [ ] Status: `not-started`

- [ ] **3.4** Step 3: Final Confirmation
  - [ ] Show lock summary
  - [ ] Confirmation checkbox: "Saya setuju untuk mengunci periode ini"
  - [ ] Warning message
  - [ ] Status: `not-started`

- [ ] **3.5** Execute Tutup Buku
  - [ ] Call POST /api/periods/close
  - [ ] Show loading state during execution
  - [ ] On success: Show success message
  - [ ] On error: Display error message + allow retry
  - [ ] Redirect to Sessions page (show Historical tab)
  - [ ] Status: `not-started`

---

### 4️⃣ **Lock Enforcement UI**

- [ ] **4.1** Session row styling
  - [ ] Active session: Normal styling
  - [ ] Closed session: Gray styling
  - [ ] Locked session: Red badge + strikethrough (if text)
  - [ ] Status: `not-started`

- [ ] **4.2** Lock info display
  - [ ] Show lock timestamp: "Terkunci pada: 2026-07-05 12:30"
  - [ ] Show locked_by: "oleh: system"
  - [ ] Show tooltip on hover
  - [ ] Status: `not-started`

- [ ] **4.3** Action button states
  - [ ] Active sessions: Show Edit, Close, Delete buttons
  - [ ] Locked sessions: Disable all buttons + show tooltip
  - [ ] Styling: Grayed out, cursor-not-allowed
  - [ ] Status: `not-started`

---

### 5️⃣ **API Integration**

- [ ] **5.1** GET /api/periods
  - [ ] Fetch current period for outlet
  - [ ] Include allocation_rules data
  - [ ] Status: `already-implemented` ✅

- [ ] **5.2** GET /api/sessions
  - [ ] Filter by period_id (current period for Active tab)
  - [ ] Filter by is_locked (false for Active, true for Historical)
  - [ ] Return period info in response
  - [ ] Status: `needs-update`

- [ ] **5.3** POST /api/sessions
  - [ ] Auto-link to current period
  - [ ] Check period.is_locked before creation
  - [ ] Return 403 if period locked
  - [ ] Status: `needs-testing`

- [ ] **5.4** PATCH /api/sessions/[id]
  - [ ] Check session.is_locked before update
  - [ ] Return 403 if locked with message
  - [ ] Status: `needs-testing`

- [ ] **5.5** DELETE /api/sessions/[id]
  - [ ] Check session.is_locked before delete
  - [ ] Return 403 if locked with message
  - [ ] Status: `needs-testing`

- [ ] **5.6** POST /api/periods/close
  - [ ] Calculate variance from expenses
  - [ ] Create buku_closings record
  - [ ] Lock all sessions (update is_locked = true)
  - [ ] Mark period as closed
  - [ ] Create next period
  - [ ] Status: `already-implemented` ✅

- [ ] **5.7** GET /api/allocation-rules
  - [ ] Fetch current allocation rule
  - [ ] Include allocation split percentages
  - [ ] Status: `needs-implementation`

---

### 6️⃣ **Documentation Updates**

- [ ] **6.1** WORKFLOW_CALCULATIONS.md
  - [ ] Phase A: Period Close workflow ✅
  - [ ] Phase B: UI workflows ✅
  - [ ] Status: `completed` ✅

- [ ] **6.2** API Documentation
  - [ ] Update endpoint descriptions
  - [ ] Document lock enforcement logic
  - [ ] Status: `not-started`

- [ ] **6.3** Component Documentation
  - [ ] Document PeriodInfoBanner props
  - [ ] Document TutupBukuModal usage
  - [ ] Document ActiveSessionsTab / HistoricalSessionsTab
  - [ ] Status: `not-started`

---

## 🔧 Files to Create/Update

### New Components (to create):
- `src/components/layout/PeriodInfoBanner.tsx`
- `src/components/modals/TutupBukuModal.tsx`
- `src/components/tables/ActiveSessionsTab.tsx`
- `src/components/tables/HistoricalSessionsTab.tsx`

### Modified Files:
- `src/app/dashboard/sessions/page.tsx` (add tabs, banner, modal)
- `src/lib/sessions.ts` (add period filtering logic)
- `src/app/api/sessions/route.ts` (update query to include period info)
- `src/app/api/allocation-rules/route.ts` (create endpoint)

### Documentation:
- ✅ `WORKFLOW_CALCULATIONS.md` (updated)
- `PHASE_B_IMPLEMENTATION_CHECKLIST.md` (this file)

---

## 📊 Progress Tracking

| Component | Status | % Complete | Notes |
|-----------|--------|-----------|-------|
| **Sessions Page Refactor** | ⏳ Not Started | 0% | Waiting for component creation |
| **PeriodInfoBanner** | ⏳ Not Started | 0% | Prerequisite component |
| **TutupBukuModal** | ⏳ Not Started | 0% | Core feature |
| **Lock Enforcement** | ⏳ Not Started | 0% | UI validation |
| **API Integration** | ⏳ Partial | 40% | Some endpoints done, need updates |
| **Documentation** | 🟢 Partial | 50% | Workflows documented |

---

## 🎯 Next Steps

### Immediate (Priority 1):
1. Create `PeriodInfoBanner` component
2. Create `TutupBukuModal` with 3-step workflow
3. Create `ActiveSessionsTab` and `HistoricalSessionsTab` components

### Short-term (Priority 2):
1. Update Sessions page to use new components
2. Test lock enforcement
3. Test API integration

### Testing:
1. Manual UI testing in browser
2. API endpoint testing (lock checks)
3. Period close execution test

---

## 📝 Notes

- **Data Source**: Period data from `GET /api/periods`, sessions from `GET /api/sessions`
- **Lock Behavior**: Once period closed, all sessions immutable (is_locked = true)
- **Timezone**: Using outlet timezone for period date calculations
- **Mobile**: Ensure responsive design for modal + tabs on mobile

---

**Last Updated**: 2026-06-12  
**Version**: 1.0  
**Owner**: Development Team
