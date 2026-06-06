# 🧪 SMOKE TESTING GUIDE - Phase 4

## Setup Before Testing

### Option 1: Via UI (Manual but Verifiable)
1. Go to **Funding** → **"📥 Modal Masuk"** tab
2. Create 3 test investors:
   - Name: `TEST_Rendy`, source: Owner, phone: 081234567890
   - Name: `TEST_Arya`, source: Owner, phone: 082345678901
   - Name: `TEST_Damim`, source: Owner, phone: 083456789012
3. Then come back here and continue with Test 1

### Option 2: Via SQL (Faster)
1. Go to Supabase SQL Editor
2. Run the INSERT statements from `database/test-data-setup.sql` (STEP 1)
3. Copy the investor IDs from the SELECT results
4. Continue with Test 1

---

## 🧪 SMOKE TEST 1: Expense Modal Funding
**Goal:** Test that expenses with modal funding source work correctly

**Steps:**
1. Go to **Dashboard** → **Expenses** tab
2. Click **"Simpan Pengeluaran"** form
3. Fill form:
   - **Tanggal**: Today (2026-06-07)
   - **Kategori**: `Bahan`
   - **Deskripsi**: `TEST: Beli tepung 25kg` (min 3 chars ✓)
   - **Jumlah (Rp)**: `250000`
   - **Sumber Dana**: `Dari Kas (Penjualan)`
   - **Metode Bayar**: `Cash`
   - **Status Bayar**: `Paid`
4. Click **"Simpan Pengeluaran"**

**Expected:**
- ✅ Expense saved successfully
- ✅ No error about investor requirement (since Dari Kas)
- ✅ Expense appears in table below

**Check Database:**
```sql
SELECT category, description, amount, funding_source FROM expenses 
WHERE description LIKE 'TEST:%' LIMIT 1;
-- Expected: bahan | TEST: Beli tepung 25kg | 250000 | kas
```

---

## 🧪 SMOKE TEST 2: Expense Modal Funding (with Investor)
**Goal:** Test modal funding with investor selection

**Steps:**
1. Stay in **Dashboard** → **Expenses** tab
2. Click form again
3. Fill form:
   - **Tanggal**: Today
   - **Kategori**: `Peralatan`
   - **Deskripsi**: `TEST: Beli kompor baru`
   - **Jumlah (Rp)**: `500000`
   - **Sumber Dana**: `Dari Modal (Investor)` ← CHANGE THIS
   - ⚠️ **Investor** dropdown should appear immediately
   - **Investor**: Select `TEST_Damim` (or whichever is available)
4. Fill rest:
   - **Metode Bayar**: `Cash`
   - **Status Bayar**: `Paid`
5. Click **"Simpan Pengeluaran"**

**Expected:**
- ✅ Investor dropdown appears when "Dari Modal" selected
- ✅ Investor shows in dropdown (if TEST_Damim created)
- ✅ Expense saved with funding_source='modal'
- ✅ Error if investor NOT selected

**Check Database:**
```sql
SELECT category, description, funding_source, funded_by_investor_id FROM expenses 
WHERE description LIKE 'TEST: Beli kompor%';
-- Expected: peralatan | TEST: Beli kompor baru | modal | [investor_uuid]
```

---

## 🧪 SMOKE TEST 3: Dashboard Display (3 Categories Only)
**Goal:** Verify dashboard only shows 3 expense categories

**Steps:**
1. Go to **Dashboard** → **Dashboard** tab
2. Scroll down to **"💸 Pengeluaran per Kategori"** section
3. Count the cards

**Expected:**
- ✅ Exactly 3 cards: **Bahan | Operasional | Peralatan**
- ✅ NO "Gabungan" card
- ✅ NO "Lain-lain" card
- ✅ If you input `Operasional` expense earlier, check that card updates

---

## 🧪 SMOKE TEST 4: Alokasi Laba Profit Calculation
**Goal:** Verify profit auto-calculated from metrics with OPSI A formula

**Steps:**
1. Go to **Funding** → **"💰 Alokasi Laba"** tab
2. Look at top section: **"💡 Profit Calculation (OPSI A)"**

**Expected:**
- ✅ Shows formula breakdown with 5 boxes:
  - **Penjualan Bersih** (green)
  - **−** (minus)
  - **Operasional** (orange)
  - **=** (equals)
  - **🎯 Profit** (blue)
- ✅ All fields populated with correct values
- ✅ Note: "Bahan & Peralatan = ASSETS (tidak mengurangi profit)"
- ✅ **Settlement Priority Guide** visible below with 4 steps

**Check:** If you entered expenses, numbers should match:
- Penjualan Bersih = today sales
- Operasional = TEST operasional expenses
- Profit = Penjualan - Operasional

---

## 🧪 SMOKE TEST 5: Pembayaran Investor Dropdown
**Goal:** Verify investor dropdown shows only those with capital entries

**Steps:**
1. Go to **Funding** → **"📤 Pembayaran"** tab
2. Look at **"📥 Investor/Owner dengan Modal Masuk"** label ← NEW!
3. Click dropdown

**Expected:**
- ✅ Label changed from "Pilih Role" to **"Investor/Owner dengan Modal Masuk"**
- ✅ Dropdown shows format: **👤 Name - Modal: Rp X**
  - Example: `👤 TEST_Rendy - Modal: Rp 1,500,000`
- ✅ Capital amount calculated correctly
- ✅ Helpful note below: "Hanya menampilkan yang sudah input modal"
- ✅ If NO investors with capital: Shows message "Belum ada investor/owner..."

---

## 🧪 SMOKE TEST 6: Cicil/Lunas Smart Guidance
**Goal:** Test smart guidance system for repayment type

**Steps:**
1. Stay in **Pembayaran** tab
2. Select investor with capital: `TEST_Damim`
3. Check breakdown box shows:
   - **Modal Masuk**: Rp X
   - **Sudah Dibayar**: Rp 0 (first time)
   - **Sisa**: Rp X
4. Fill **"Jumlah (Rp)"**: `300000` (less than sisa)
5. Check **Smart Guidance** box that appears

**Expected:**
- ✅ Yellow box appears (must cicil warning)
- ✅ Text: "⚠️ Pembayaran kurang dari sisa modal..."
- ✅ Jenis Pembayaran dropdown shows both options:
  - **Lunas** (Selesai)
  - **Cicil** (Bertahap)
- ✅ If select **Cicil**:
  - Field appears: **"Sisa Modal yang Masih Cicil (Rp)"**
  - Note explains: "Pembayaran sekarang Rp 250rb, sisa Rp 250rb → masukkan '250000'"
- ✅ If select **Lunas** (amount < remaining):
  - No field needed
  - But validation error might show on submit (expected)

---

## 🧪 SMOKE TEST 7: Cicil Payment Complete Flow
**Goal:** Successfully save cicil repayment

**Steps:**
1. Still in **Pembayaran** tab
2. Fill form:
   - **Investor**: `TEST_Damim` (or any)
   - **Tanggal Pembayaran**: Today
   - **Jumlah (Rp)**: `300000` (partial)
   - **Jenis Pembayaran**: `📊 Cicil (Bertahap)`
   - **Sisa Modal yang Masih Cicil**: `500000` (if total modal 800k)
   - **Metode**: `Tunai`
   - **Catatan**: `TEST: Cicil tahap 1`
3. Click **"Simpan Pembayaran"**

**Expected:**
- ✅ Repayment saved successfully
- ✅ Form clears
- ✅ History section below shows new entry with:
  - Investor name
  - Date
  - Amount
  - **📊 Cicil** badge
  - **Sisa: Rp 500,000** note
  - Catatan shown

**Check Database:**
```sql
SELECT amount, repayment_type, remaining_modal FROM capital_repayments 
WHERE investor_id = (SELECT id FROM investors WHERE name = 'TEST_Damim' LIMIT 1)
ORDER BY repayment_date DESC LIMIT 1;
-- Expected: 300000 | cicil | 500000
```

---

## 🧪 SMOKE TEST 8: Cross-Tab Correlation
**Goal:** Verify data flows correctly between all tabs

**Steps:**
1. **Funding** → **"📥 Modal Masuk"** tab
   - ✅ Capital entry from TEST_Damim visible in history
2. **Dashboard** → **Expenses**
   - ✅ TEST expenses visible
   - ✅ Funding source column shows `kas` or `modal`
3. **Dashboard** → **Dashboard**
   - ✅ Metrics show correct totals
   - ✅ `cash_from_modal` = sum of modal capital entries
   - ✅ `expense_from_modal` = sum of modal expenses
4. **Funding** → **"💰 Alokasi Laba"**
   - ✅ Profit updated based on expenses entered
5. **Funding** → **"📤 Pembayaran"**
   - ✅ After saving repayment, "Sudah Dibayar" updates

---

## 📋 Summary Checklist

### ✅ Must Pass
- [ ] Test 1: Kas expense saves (funding_source='kas')
- [ ] Test 2: Modal expense with investor (funding_source='modal', funded_by_investor_id populated)
- [ ] Test 3: Dashboard shows only 3 categories
- [ ] Test 4: Alokasi Laba shows profit formula (Penjualan - Operasional)
- [ ] Test 5: Pembayaran dropdown shows investors with capital amounts
- [ ] Test 6: Cicil/Lunas smart guidance works (color + text changes)
- [ ] Test 7: Cicil repayment saved with repayment_type='cicil', remaining_modal populated
- [ ] Test 8: Data correlates across all tabs

### 🐛 If Any Test Fails
1. Check browser console for errors (F12)
2. Check Supabase logs for API errors
3. Verify columns exist: `funding_source`, `funded_by_investor_id`, `repayment_type`, `remaining_modal`
4. Check migration executed: `migration-funding-source-tracking.sql`

---

## 🧹 Cleanup After Testing

**Run in Supabase SQL Editor:**

```sql
-- Delete test repayments
DELETE FROM capital_repayments 
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE name LIKE 'TEST_%' 
    AND outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);

-- Delete test capital entries
DELETE FROM capital_entries
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE name LIKE 'TEST_%' 
    AND outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);

-- Delete test expenses
DELETE FROM expenses
WHERE (description LIKE 'TEST:%' OR description LIKE 'TEST_%')
  AND outlet_id = '660e8400-e29b-41d4-a716-446655440000';

-- Delete test investors
DELETE FROM investors 
WHERE name LIKE 'TEST_%' 
  AND outlet_id = '660e8400-e29b-41d4-a716-446655440000';

-- Verify all deleted
SELECT COUNT(*) as test_data_remaining FROM (
  SELECT 1 FROM investors WHERE name LIKE 'TEST_%'
  UNION
  SELECT 1 FROM expenses WHERE description LIKE 'TEST:%'
) t;
-- Expected: 0
```

---

## 📌 Notes
- Test data marked with `TEST_` or `TEST:` prefix for easy identification
- All test data can be deleted without affecting production
- After cleanup, system returns to clean state
- If you want to test again, just re-run setup steps

---

## 🎯 Success Criteria
After all 8 tests pass → **System is ready for production use!**

Next step: `git push origin dev:main`
