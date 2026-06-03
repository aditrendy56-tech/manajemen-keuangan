# 🔥 Smoke Test Roadmap — Alokasi Laba & Stakeholder Management

**Tujuan:** Verifikasi end-to-end functionality dari allocation engine, stakeholder management, dan cash ledger integration.

**Prioritas:** Urut seperti di bawah ini.

---

## Phase 1: Stakeholder Management

### Test 1.1 — Add Stakeholder (UI)
**Path:** Funding → Alokasi Laba → "Daftar Stakeholder" section

**Steps:**
1. Click "+ Tambah Stakeholder"
2. Fill form:
   - Nama: `Test Stakeholder`
   - Role: `founder`
   - Share %: `50`
   - Notes: `Smoke test entry`
   - Click "Simpan"
3. **Verify:** Stakeholder muncul di list dengan data yang benar

**DB Confirmation:**
```sql
SELECT * FROM stakeholders 
WHERE outlet_id='660e8400-e29b-41d4-a716-446655440000' 
ORDER BY created_at DESC LIMIT 1;
```
**Expected:** 1 row dengan name = "Test Stakeholder", default_share_percent = 50

---

### Test 1.2 — Edit Stakeholder (UI)
**Steps:**
1. Di list stakeholder, click tombol "Edit" pada stakeholder yang baru dibuat
2. Change Share % dari 50 → 60
3. Click "Update"
4. **Verify:** Modal close, list updated

**DB Confirmation:**
```sql
SELECT default_share_percent FROM stakeholders 
WHERE name='Test Stakeholder' AND outlet_id='660e8400-e29b-41d4-a716-446655440000';
```
**Expected:** 60

---

### Test 1.3 — Delete Stakeholder (UI)
**Steps:**
1. Click tombol "Hapus" pada Test Stakeholder
2. Confirm "Hapus stakeholder ini?"
3. **Verify:** Stakeholder hilang dari list

**DB Confirmation:**
```sql
SELECT COUNT(*) FROM stakeholders 
WHERE name='Test Stakeholder' AND outlet_id='660e8400-e29b-41d4-a716-446655440000';
```
**Expected:** 0

---

## Phase 2: Allocation Rule Management

### Test 2.1 — Add Allocation Rule (UI)
**Path:** Funding → Alokasi Laba → "Daftar Rule" section

**Steps:**
1. Click "+ Tambah Rule"
2. Fill form:
   - Nama: `Smoke Test Rule`
   - Recover First: checked (default)
   - Reserve %: 15
   - Allow Overdraft: unchecked
   - Notes: `Test allocation rule`
   - Click "Simpan"
3. **Verify:** Rule muncul di list

**DB Confirmation:**
```sql
SELECT * FROM allocation_rules 
WHERE outlet_id='660e8400-e29b-41d4-a716-446655440000' 
AND name='Smoke Test Rule' LIMIT 1;
```
**Expected:** 1 row dengan cash_reserve_percent = 15, recover_first = true

---

### Test 2.2 — Edit Allocation Rule (UI)
**Steps:**
1. Click "Edit" pada "Smoke Test Rule"
2. Change Reserve % dari 15 → 20
3. Click "Update"
4. **Verify:** Modal close, list updated

**DB Confirmation:**
```sql
SELECT cash_reserve_percent FROM allocation_rules 
WHERE name='Smoke Test Rule' AND outlet_id='660e8400-e29b-41d4-a716-446655440000';
```
**Expected:** 20

---

## Phase 3: Allocation Preview & Execute

### Test 3.1 — Preview (Dry-Run)

#### Option A: UI Approach

**Path:** Funding → Alokasi Laba → "Preview / Eksekusi" section

**Setup:**
- Ensure "Smoke Test Rule" selected in dropdown
- Ensure "Founder" stakeholder exists with some share % (e.g., 50%, 75%, etc.)

**Steps:**
1. Fill allocation form:
   - Tanggal: Today's date (2025-01-XX)
   - Periode Label: `Januari 2025`
   - Total Profit: `10000000` (Rp10 juta)
   - Click "Preview (Dry-run)"
2. **Verify:** Modal/panel shows:
   - Total Profit: Rp10,000,000
   - Kas Muter / Reserve (20% of Rp10M): Rp2,000,000
   - Bagi Hasil / Distributable: Rp8,000,000
   - Breakdown per stakeholder (e.g., "Founder: Rp4,000,000" if 50% share)

**Expected Output Structure:**
```
Total Profit: Rp 10.000.000
Kas Muter (Reserve 20%): Rp 2.000.000
Bagi Hasil: Rp 8.000.000

Allocations:
- Founder: Rp 4.000.000 (50%)
```

---

#### Option B: SQL+API Approach

**Prerequisites:**
- Dev server running (`npm run dev`)
- Get rule_id from DB or API:
  ```bash
  curl -s "http://localhost:3000/api/allocation-rules?outlet_id=660e8400-e29b-41d4-a716-446655440000" | jq '.[] | select(.name=="Smoke Test Rule") | .id'
  ```
  Save output as `$RULE_ID`

**Steps:**
1. **Make preview API call:**
   ```bash
   curl -X POST "http://localhost:3000/api/allocations?dry_run=true" \
     -H "Content-Type: application/json" \
     -d '{
       "outlet_id": "660e8400-e29b-41d4-a716-446655440000",
       "month": 1,
       "year": 2025,
       "rule_id": "'$RULE_ID'"
     }' | jq '.'
   ```

2. **Verify response contains:**
   ```json
   {
     "total_profit": 10000000,
     "reserve_amount": 2000000,
     "distributable": 8000000,
     "allocations": [
       {
         "stakeholder_id": "...",
         "name": "Founder",
         "amount": 4000000
       }
     ]
   }
   ```
   - `total_profit` = 10000000 ✓
   - `reserve_amount` = 2000000 (20%) ✓
   - `distributable` = 8000000 ✓
   - Founder allocation ≈ 4000000 (50% of distributable) ✓

---

## Phase 4: Deferred Edge Case Smoke Tests

> Status: ditunda dulu. Bagian ini dipakai setelah smoke test normal stabil, untuk cek kasus yang lebih ekstrem dan memastikan laporan tetap konsisten.

### Test 4.1 — Historical Ledger Cleanup Regression
**Goal:** Pastikan row historis yang pernah salah tanggal tidak lagi mempengaruhi laporan harian.

**Steps:**
1. Buka reports untuk tanggal historis yang sebelumnya bermasalah.
2. Verify semua angka menjadi nol jika memang tidak ada transaksi di tanggal itu.
3. Buka range 2 hari yang mencakup tanggal aktif dan tanggal kosong.
4. Verify total range tetap konsisten dengan transaksi aktual.

**Expected:**
- `cash_basis_profit` tidak lagi negatif karena row historis lama.
- Tidak ada transaksi refund historis yang muncul di tanggal yang salah.

---

### Test 4.2 — Split Payment and Partial Refund Regression
**Goal:** Uji kombinasi split payment lalu partial refund untuk memastikan cash ledger dan agregat tidak double count.

**Steps:**
1. Buat sale split payment dengan 2 entry settled.
2. Refund sebagian dari sale itu dengan nominal lebih kecil dari gross amount.
3. Buka session detail, dashboard, dan reports.
4. Verify nilai penjualan turun sesuai nominal refund, bukan full sale hilang.

**Expected:**
- Session summary turun sesuai nominal refund.
- Dashboard dan reports memakai angka bersih setelah refund parsial.

---

### Test 4.3 — Duplicate Submit Guard
**Goal:** Pastikan aksi simpan/refund ganda tidak membuat cash transaction dobel.

**Steps:**
1. Trigger submit refund dua kali cepat berurutan.
2. Trigger simpan sale dua kali dari UI yang sama.
3. Cek cash_transactions untuk source yang sama.

**Expected:**
- Hanya ada 1 row ledger per source/aksi bisnis.
- Tidak ada double count di dashboard atau reports.

---

### Test 3.2 — Execute (Persist)

#### Option A: UI Approach

**Steps (continuing from 3.1):**
1. Click "Eksekusi Alokasi" (Execute button)
2. Confirm modal: "Simpan alokasi ini?"
3. **Verify:** Success message displayed

**DB Confirmations:**

**A. Check allocation_runs table:**
```sql
SELECT id, outlet_id, allocation_month, total_profit, reserve_amount, 
       distributable_profit, status, created_at 
FROM allocation_runs 
WHERE outlet_id='660e8400-e29b-41d4-a716-446655440000' 
ORDER BY created_at DESC LIMIT 1;
```
**Expected:**
- 1 row created
- total_profit = 10000000
- reserve_amount = 2000000
- distributable_profit = 8000000
- status = 'executed'

**B. Check allocation_items table:**
```sql
SELECT allocation_run_id, stakeholder_id, allocated_amount, created_at 
FROM allocation_items 
WHERE allocation_run_id = '<run_id_from_above>' 
ORDER BY created_at;
```
**Expected:**
- 1+ rows (one per stakeholder)
- allocated_amount for Founder ≈ 4000000

**C. Check cash_transactions table:**
```sql
SELECT id, outlet_id, transaction_type, amount, source_type, source_id, notes, created_at 
FROM cash_transactions 
WHERE outlet_id='660e8400-e29b-41d4-a716-446655440000' 
AND source_type='allocation' 
AND source_id = '<run_id>' 
ORDER BY created_at;
```
**Expected:**
- Multiple rows (reserve + distribution entries)
- Types: likely 'debit' (distribution out), 'credit' (reserve in), or similar
- Source_type = 'allocation'
- Source_id = allocation_run.id

---

#### Option B: SQL+API Approach

**Steps:**
1. **Make execute API call** (use same `$RULE_ID` from Test 3.1):
   ```bash
   curl -X POST "http://localhost:3000/api/allocations?dry_run=false" \
     -H "Content-Type: application/json" \
     -d '{
       "outlet_id": "660e8400-e29b-41d4-a716-446655440000",
       "month": 1,
       "year": 2025,
       "rule_id": "'$RULE_ID'"
     }' | jq '.'
   ```

2. **Verify response contains:**
   ```json
   {
     "run_id": "yyy-yyy-yyy",
     "status": "executed",
     "items_created": 1,
     "transactions_created": 2
   }
   ```
   Save `$RUN_ID` from response

3. **DB Confirmation A — allocation_runs:**
   ```bash
   curl -s "http://localhost:3000/api/allocations?outlet_id=660e8400-e29b-41d4-a716-446655440000" | jq '.[] | select(.id=="'$RUN_ID'")'
   ```
   Or via SQL:
   ```sql
   SELECT id, total_profit, reserve_amount, distributable_profit, status 
   FROM allocation_runs WHERE id='$RUN_ID';
   ```
   **Expected:**
   - total_profit = 10000000
   - reserve_amount = 2000000
   - distributable_profit = 8000000
   - status = 'executed'

4. **DB Confirmation B — allocation_items:**
   ```sql
   SELECT allocation_run_id, stakeholder_id, allocated_amount 
   FROM allocation_items WHERE allocation_run_id='$RUN_ID' 
   ORDER BY created_at;
   ```
   **Expected:** 1+ rows, amounts sum to 8000000

5. **DB Confirmation C — cash_transactions:**
   ```sql
   SELECT transaction_type, amount, source_type, source_id 
   FROM cash_transactions 
   WHERE source_type='allocation' AND source_id='$RUN_ID' 
   ORDER BY created_at;
   ```
   **Expected:** 2+ rows (reserve + distribution)

---

### Test 3.3 — Idempotency Check (Optional)
**Steps:**
1. Re-run same allocation (same month/year/outlet_id) with same rule
2. **Verify:** UI shows "Already executed for this period" or similar warning (no duplicate)

**DB Check:**
```sql
SELECT COUNT(*) FROM allocation_runs 
WHERE outlet_id='660e8400-e29b-41d4-a716-446655440000' 
AND allocation_month = 1 AND allocation_year = 2025 AND status='executed';
```
**Expected:** 1 (not 2)

**Or via API (SQL+API approach):**
```bash
curl -X POST "http://localhost:3000/api/allocations?dry_run=false" \
  -H "Content-Type: application/json" \
  -d '{
    "outlet_id": "660e8400-e29b-41d4-a716-446655440000",
    "month": 1,
    "year": 2025,
    "rule_id": "'$RULE_ID'"
  }' | jq '.'
```
**Expected:** Error or "Already executed" message (no new run_id created)

---

## Phase 4: Integration Validation

### Test 4.1 — Dashboard Cash Summary Update
**Path:** Dashboard → Main page

**Steps:**
1. Go back to main Dashboard
2. Look for "Kas Summary" or "Cash" widget
3. **Verify:** Shows allocation reserve amount added to kas muter balance

---

## ✅ Success Criteria

- [x] All stakeholder CRUD ops complete without errors
- [x] All rule CRUD ops complete without errors
- [x] Allocation preview shows correct calculations
- [x] Allocation execute creates DB records (runs, items, transactions)
- [x] Idempotency check passes (no duplicates on re-run)
- [x] Dashboard reflects cash ledger updates

---

## 🚨 Known Issues / Blockers

*None yet — add as discovered*

---

## 🎯 Approach Selection (Phase 3)

**Decision:** Both UI (Option A) and SQL+API (Option B) approaches are documented.

### Quick Reference

| Aspect | UI (Option A) | SQL+API (Option B) |
|--------|---|---|
| **Ease of Use** | Click button, see results | Write curl commands |
| **Visual Feedback** | ✅ Live UI preview | ❌ Raw JSON only |
| **Setup Time** | ~2 min (navigate) | ~5 min (get rule_id, write curl) |
| **Execution Time** | 30 sec | 30 sec |
| **Verification** | UI + SQL queries | SQL queries only |
| **Repeatability** | Manual each time | Scriptable (save as .sh) |
| **Best For** | First-time test, debugging | Regression, automation |

### Recommendation for Initial Smoke Test

**Start with UI (Option A):**
- Easier to see what's happening
- Visual confirmation of calculations
- Less error-prone (form validation built-in)
- **Then optionally use SQL+API (Option B)** for verification

---

## Notes

- **Test outlet_id:** `660e8400-e29b-41d4-a716-446655440000` (fixed for smoke test)
- **Approach options:** Both UI and SQL+API provided for flexibility
- **Suggested flow:**
  1. Tests 1.1–1.3: UI (stakeholder CRUD)
  2. Tests 2.1–2.2: UI (rule CRUD)
  3. Tests 3.1–3.3: **Choose UI or SQL+API or both**
  4. Test 4.1: UI (dashboard check)
- **Test data cleanup:** DELETE FROM tables after smoke test if needed
- **Next steps:** After passing, move to regression testing with SQL+API variant
