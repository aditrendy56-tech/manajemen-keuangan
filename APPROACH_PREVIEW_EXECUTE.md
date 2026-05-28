u# A — Preview / Execute: UI vs SQL+API Approach

---

## 📌 Phase 2: Allocation Rule Management (PENDING)

**Tujuan:** Sebelum test Preview & Execute (Phase 3), kita butuh allocation rules yang valid.

### Phase 2 Scope
- **Test 2.1** — Add Rule: Buat "Smoke Test Rule" dengan Reserve 15%
- **Test 2.2** — Edit Rule: Update Reserve dari 15% → 20%  
- **Test 2.3** — Delete Rule: Hapus rule (optional)

### Mengapa Penting
1. **Foundation untuk Phase 3** → Phase 3 butuh rule yang sudah ada
2. **Verify rule engine** → Pastikan allocation_rules table & API OK
3. **Similar pattern ke Phase 1** → Follow consistency: Stakeholders → Rules → Allocations

### Status
⏸️ **ON HOLD** — akan dijalankan setelah Phase 3 planning selesai

---

**Konteks:** Step 3.1 & 3.2 dalam SMOKE_TEST_ROADMAP.md — testing allocation preview dan execute.

**2 Pilihan:**

---

## Pilihan 1: UI Approach (Direkomendasikan saat ini)

### ✅ Pros
- **Paling user-friendly** → Click button → lihat hasil
- **Tidak perlu manual DB setup** → Semua lewat UI
- **Lihat visual preview** → Breakdown di screen langsung
- **Form validation built-in** → Tidak ada error kocokok-kokoan
- **Testing flow natural** → Mirip end-user workflow

### ⚠️ Cons
- Perlu buka browser, navigate, isi form
- Lebih lambat kalau banyak test iterations
- Kalau UI ada bug, sulit di-debug (perlu inspect network)

### Steps (dari SMOKE_TEST_ROADMAP.md):
```
1. Fill form di UI (Tanggal, Periode, Total Profit, Rule)
2. Click "Preview (Dry-run)" → lihat breakdown
3. Click "Eksekusi Alokasi" → confirm → execute
4. Verify DB via SQL queries (confirm data written)
```

### Timeline Estimate
- Setup: 2 min (navigate, fill form)
- Execute: 30 sec
- Verification: 2 min (4 SQL queries)
- **Total per test:** ~5 min

---

## Pilihan 2: SQL + curl/API Approach (Advanced)

### ✅ Pros
- **Automated** → Bisa loop multiple scenarios
- **Repeatable** → Shell script bisa di-save
- **Fast** → Langsung API call, tidak perlu UI render
- **Scriptable** → Cocok untuk regression testing nanti
- **Debug friendly** → Lihat raw JSON response

### ⚠️ Cons
- Perlu tahu endpoint URLs & body format
- Perlu allocation_rule_id → harus query DB dulu
- Tidak ada visual preview → Hanya raw JSON numbers
- Error handling manual (curl response codes)
- Setup lebih rumit

### Steps:

**Step A1: Query allocation_rule_id**
```bash
# Get rule_id (Smoke Test Rule yang kita buat di Test 2.1)
curl -s "http://localhost:3000/api/allocation-rules?outlet_id=660e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | select(.name=="Smoke Test Rule") | .id'

# Save as: $RULE_ID = "xxx-xxx-xxx"
```

**Step A2: Preview (Dry-run)**
```bash
curl -X POST "http://localhost:3000/api/allocations?dry_run=true" \
  -H "Content-Type: application/json" \
  -d '{
    "outlet_id": "660e8400-e29b-41d4-a716-446655440000",
    "month": 1,
    "year": 2025,
    "rule_id": "'$RULE_ID'"
  }'
```

**Expected response:**
```json
{
  "total_profit": 10000000,
  "reserve_amount": 2000000,
  "distributable": 8000000,
  "allocations": [
    { "stakeholder_id": "...", "name": "Founder", "amount": 4000000 }
  ]
}
```

**Step A3: Execute (Persist)**
```bash
curl -X POST "http://localhost:3000/api/allocations?dry_run=false" \
  -H "Content-Type: application/json" \
  -d '{
    "outlet_id": "660e8400-e29b-41d4-a716-446655440000",
    "month": 1,
    "year": 2025,
    "rule_id": "'$RULE_ID'"
  }'
```

**Expected response:**
```json
{
  "run_id": "yyy-yyy-yyy",
  "status": "executed",
  "items_created": 2,
  "transactions_created": 5
}
```

**Step A4: DB Verification (same SQL queries as UI approach)**

### Timeline Estimate
- Setup: 5 min (write curl script)
- Execute: 30 sec (run script)
- Verification: 2 min (SQL queries)
- **Total per test:** ~8 min (tapi reusable untuk many tests)

---

---

## 🎯 Decision Made: Option B (Both Approaches)

**Status:** ✅ IMPLEMENTED

Both **UI (Option A)** and **SQL+API (Option B)** approaches are now fully documented in [SMOKE_TEST_ROADMAP.md](./SMOKE_TEST_ROADMAP.md).

### Implementation Summary

| Test | Option A (UI) | Option B (SQL+API) |
|------|---------------|-------------------|
| **Test 3.1** (Preview) | ✅ Click button | ✅ curl preview API |
| **Test 3.2** (Execute) | ✅ Click confirm | ✅ curl execute API |
| **Test 3.3** (Idempotency) | ✅ Re-click test | ✅ Re-run curl test |

### How to Use SMOKE_TEST_ROADMAP.md

1. **Start with Option A (UI)** for initial smoke test
   - Easier to follow
   - Visual confirmation
   - Quick first validation

2. **Optionally use Option B (SQL+API)** for:
   - Scripting / automation
   - Regression testing
   - Unattended testing

3. **Mix both approaches** as needed:
   - Preview via UI, execute via API
   - Or vice versa

---

## Quick Command Reference (SQL+API)

**Get rule_id:**
```bash
curl -s "http://localhost:3000/api/allocation-rules?outlet_id=660e8400-e29b-41d4-a716-446655440000" | jq '.[] | select(.name=="Smoke Test Rule") | .id'
```

**Preview:**
```bash
curl -X POST "http://localhost:3000/api/allocations?dry_run=true" \
  -H "Content-Type: application/json" \
  -d '{"outlet_id":"660e8400-e29b-41d4-a716-446655440000","month":1,"year":2025,"rule_id":"'$RULE_ID'"}'
```

**Execute:**
```bash
curl -X POST "http://localhost:3000/api/allocations?dry_run=false" \
  -H "Content-Type: application/json" \
  -d '{"outlet_id":"660e8400-e29b-41d4-a716-446655440000","month":1,"year":2025,"rule_id":"'$RULE_ID'"}'
```

---

## 📍 References

- **Full roadmap:** [SMOKE_TEST_ROADMAP.md](./SMOKE_TEST_ROADMAP.md)
- **Implementation:** Allocation engine at `src/lib/allocation/engine.ts`
- **API endpoints:** `src/app/api/allocations/route.ts`
