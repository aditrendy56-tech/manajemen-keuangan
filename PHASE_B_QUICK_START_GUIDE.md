# Phase B: Quick Start Guide

> How to test Period Close UI in development

---

## 🚀 Quick Setup

### 1. Ensure migration executed
```bash
# Check in Supabase SQL Editor:
SELECT COUNT(*) FROM periods;  -- Should be > 0
SELECT COUNT(*) FROM allocation_rules;  -- Should be > 0
SELECT COUNT(*) FROM buku_closings;  -- Should be > 0
```

### 2. Start dev server
```bash
npm run dev
```

### 3. Navigate to Sessions page
```
http://localhost:3000/dashboard/sessions
```

---

## 🎯 Testing Workflows

### ✅ Test 1: View Period Info Banner

**Goal**: Verify period information displays correctly

**Steps**:
1. Open Sessions page
2. Look at top banner
3. Verify:
   - ✅ Period dates shown (e.g., "2026-06 (Jun 6 - Jul 5)")
   - ✅ Allocation split shown (e.g., "60% Kas Utama • 40% Profit Pending")
   - ✅ Lock status shows (🟢 Aktif)

**Expected Result**: Banner displays all info without errors

---

### ✅ Test 2: Switch Between Tabs

**Goal**: Verify tab switching works

**Steps**:
1. Click "🟢 Sesi Aktif" tab (should be default)
   - Should show active sessions + create form
2. Click "🔒 Historis" tab
   - Should show historical sessions (empty if no closed periods)
3. Click back to Active tab
   - Should show active sessions again

**Expected Result**: Tabs switch without page reload, content updates

---

### ✅ Test 3: Create Session in Active Tab

**Goal**: Verify new session creation

**Steps**:
1. In Active tab, fill SessionForm
   - Date: Today
   - Opening Cash: 100000
   - Closing Cash: 500000
2. Click "Buat Sesi"
3. Verify:
   - ✅ Session appears in list below form
   - ✅ Revenue calculated (500000 - 100000 = 400000)
   - ✅ Status shows "🟢 Buka"

**Expected Result**: New session created + displayed

---

### ✅ Test 4: Close Session

**Goal**: Verify session close action

**Steps**:
1. In Active tab, find a session
2. Click blue power button (⚡)
3. Confirm dialog
4. Verify:
   - ✅ Session status changes to "🔴 Tutup"
   - ✅ Buttons change (can't close again)

**Expected Result**: Session closed successfully

---

### ✅ Test 5: Delete Session

**Goal**: Verify session deletion

**Steps**:
1. In Active tab, find an "open" session
2. Click red trash button (🗑️)
3. Confirm dialog
4. Verify:
   - ✅ Session removed from list
   - ✅ Count updates

**Expected Result**: Session deleted successfully

---

### ✅ Test 6: Open Tutup Buku Modal (Conditional)

**Goal**: Test tutup buku button availability

**Current State**: 
- Button shows only on 5th of month
- Since today is 12th June, button is hidden
- To test, need to simulate date change

**Workaround** (for demo):
1. Look at PeriodInfoBanner
2. If 5th is not today:
   - Button won't show
   - Banner shows: "📅 Tombol 'Tutup Buku' akan tersedia pada tanggal 5 bulan depan"

**To Enable Testing** (dev mode):
```typescript
// In PeriodInfoBanner.tsx, temporarily change:
const today = new Date();
// TO:
const today = new Date(2026, 6, 5); // Force July 5th

// This enables tutup buku testing
```

---

### ✅ Test 7: Tutup Buku Modal - 3 Steps (if enabled)

**Goal**: Test complete tutup buku workflow

#### Step 1: Review Summary
1. Modal opens
2. Verify:
   - ✅ Period shown (2026-06)
   - ✅ Sessions count correct
   - ✅ Total revenue calculated
   - ✅ Allocation breakdown shown

**Action**: Click "Lanjut" → Go to Step 2

#### Step 2: Variance Analysis
1. Verify:
   - ✅ Allocated buffer = 60% of revenue
   - ✅ Actual spending fetched
   - ✅ Variance calculated (allocated - actual)
   - ✅ Variance % calculated
   - ✅ Interpretation shown

**Interpretation examples**:
- If surplus > 5%: "✅ Operasional lebih efisien..."
- If deficit < -5%: "⚠️ Operasional melebihi alokasi..."
- If ±5%: "✏️ Operasional sesuai proyeksi..."

**Action**: Click "Lanjut" → Go to Step 3

#### Step 3: Confirm & Lock
1. Verify:
   - ✅ Confirmation checkbox shown
   - ✅ Warning message displayed
   - ✅ Submit button disabled (until checkbox checked)
2. Check checkbox
   - ✅ Button becomes enabled
3. Click "✅ Konfirmasi Tutup Buku"
   - ✅ Loading state shows
   - ✅ Success message appears
   - ✅ Modal closes
   - ✅ Historical tab shows new data

**Expected Result**: Period closed, sessions locked, page refreshed

---

### ✅ Test 8: Locked Sessions in Historical Tab

**Goal**: Verify locked sessions show correctly

**Prerequisites**: Close a period (Test 7 passed)

**Steps**:
1. Click "🔒 Historis" tab
2. Verify:
   - ✅ Sessions from closed period appear
   - ✅ All show 🔒 Terkunci badge
   - ✅ Lock timestamp shown (e.g., "Terkunci pada: 2026-07-05 12:30")
   - ✅ Sessions grouped by period
   - ✅ Summary stats shown (total sessions + revenue)

**Expected Result**: Historical sessions display correctly as read-only

---

### ✅ Test 9: Period Locked - No New Sessions

**Goal**: Verify period locked prevents new sessions

**Prerequisites**: Close a period (Test 7 passed)

**Steps**:
1. Go to Active tab
2. Verify:
   - ✅ SessionForm hidden
   - ✅ Alert shown: "🔒 Periode sudah ditutup. Tidak bisa membuat sesi baru."
3. Try to add session via API:
   ```bash
   curl -X POST http://localhost:3000/api/sessions \
     -H "Content-Type: application/json" \
     -d '{"outlet_id":"...", "date":"...", "opening_cash":100000}'
   ```
   - ✅ Returns 403 with message: "Sesi terkunci karena periode sudah ditutup"

**Expected Result**: Period lock enforced, prevents new operations

---

## 🔍 Debugging Tips

### Check Browser Console
```javascript
// Monitor API calls
// Open DevTools (F12) → Network tab
// Look for:
// - GET /api/periods
// - GET /api/allocation-rules
// - GET /api/sessions
// - POST /api/periods/close
```

### Check Network Response
```
1. Open DevTools → Network tab
2. Filter for API calls
3. Click request to see:
   - Request payload
   - Response body
   - Status code (200, 400, 403, 500)
```

### Common Issues & Fixes

#### Issue: "404 allocation_rules" error
**Cause**: Column names mismatch (old vs new schema)  
**Fix**: Verify seed executed successfully
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'allocation_rules';
-- Should show: kas_utama_percent, profit_pending_percent
```

#### Issue: Modal doesn't open
**Cause**: Button not visible (not 5th of month)  
**Fix**: Check PeriodInfoBanner button condition in code

#### Issue: Variance shows 0
**Cause**: Expenses not fetched correctly  
**Fix**: Check if expenses linked to sessions + periods

#### Issue: Sessions not updating
**Cause**: Cache issue  
**Fix**: Clear browser cache or hard refresh (Ctrl+Shift+R)

---

## 📊 Data Flow Verification

### Check Period Data
```sql
SELECT 
  id,
  period_month,
  period_start_date,
  period_end_date,
  status,
  is_locked
FROM periods
WHERE outlet_id = '<your-outlet-id>'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Allocation Rules
```sql
SELECT 
  id,
  outlet_id,
  kas_utama_percent,
  profit_pending_percent,
  is_current
FROM allocation_rules
WHERE outlet_id = '<your-outlet-id>'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Sessions Lock Status
```sql
SELECT 
  id,
  date,
  status,
  is_locked,
  locked_at,
  period_id
FROM daily_sessions
WHERE outlet_id = '<your-outlet-id>'
ORDER BY date DESC
LIMIT 10;
```

### Check Expenses for Period
```sql
SELECT 
  e.id,
  e.date,
  e.category,
  e.amount,
  ds.period_id
FROM expenses e
LEFT JOIN daily_sessions ds ON e.session_id = ds.id
WHERE ds.outlet_id = '<your-outlet-id>'
  AND e.category = 'operasional'
ORDER BY e.date DESC
LIMIT 10;
```

---

## ✅ Pre-Release Checklist

Before going to production:

- [ ] All 9 tests passed ✅
- [ ] No console errors
- [ ] No red badges in Network tab (no 404/500)
- [ ] TypeScript compilation: 0 errors
- [ ] Responsive design tested (mobile/tablet/desktop)
- [ ] Dark mode tested (if applicable)
- [ ] Localization tested (Indonesian strings correct)
- [ ] Performance: Page loads < 3 seconds
- [ ] Accessibility: Tab navigation works
- [ ] Cross-browser tested (Chrome, Firefox, Safari)

---

## 🎁 Quick Commands

### Start dev server
```bash
npm run dev
```

### Check TypeScript errors
```bash
npm run type-check
```

### Build for production
```bash
npm run build
```

### Run tests (if configured)
```bash
npm run test
```

---

## 📞 Need Help?

1. Check [PHASE_B_COMPLETION_SUMMARY.md](./PHASE_B_COMPLETION_SUMMARY.md) for detailed architecture
2. Check [WORKFLOW_CALCULATIONS.md](./WORKFLOW_CALCULATIONS.md) for business logic
3. Check component source code for inline comments
4. Check [PHASE_B_IMPLEMENTATION_CHECKLIST.md](./PHASE_B_IMPLEMENTATION_CHECKLIST.md) for progress

---

**Last Updated**: 2026-06-12  
**Version**: 1.0  
**Status**: Ready for testing
