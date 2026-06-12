# 🚀 Phase A Migration - 2 Step Execution Guide

**Status**: ✅ READY TO EXECUTE

---

## 📋 Why 2 Separate Files?

**Problem**: Race condition saat transaction execution di Supabase
- Migration + seed data dalam 1 file → PostgreSQL conflict pada table creation vs data insertion

**Solution**: Split into 2 files
- File 1: Schema only (tables, columns, indexes, RLS)
- File 2: Data only (seed periods, allocation rules)

---

## 🎯 STEP-BY-STEP EXECUTION

### **STEP 1: Run Schema Migration** ✅ (First)
**File**: `migrations/migration-period-close-system.sql`

**Action**:
1. Go to [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Create new query
3. Copy-paste **entire** content from `migration-period-close-system.sql`
4. Click "Run"
5. Wait for completion (should be ~10-30 seconds)

**Expected Result**: ✅ No errors
```
TABLES CREATED:
- periods
- allocation_rules  
- buku_closings

COLUMNS ADDED TO daily_sessions:
- period_id
- is_locked
- locked_at
- locked_by
- period_end_date

INDEXES CREATED: 6 indexes

RLS POLICIES CREATED: 3 policies
```

**Verify**:
- Go to Supabase Dashboard → Database → Tables
- Check: `periods`, `allocation_rules`, `buku_closings` appear in list
- Click `daily_sessions` → Columns tab → Check: `period_id`, `is_locked` exist

---

### **STEP 2: Run Seed Data** ✅ (Second - After Step 1 Complete)
**File**: `migrations/seed-period-close-system.sql`

**Action**:
1. Go to [Supabase Dashboard](https://app.supabase.com) → SQL Editor
2. Create **NEW** query
3. Copy-paste **entire** content from `seed-period-close-system.sql`
4. Click "Run"
5. Wait for completion (should be ~5-10 seconds)

**Expected Result**: ✅ No errors
```
Seed 1: 1 row inserted into periods
Seed 2: 1 row inserted into allocation_rules
Seed 3: X rows updated in daily_sessions (linked to periods)

Verification Queries Show:
- Periods created: 1
- Allocation rules created: 1
- Daily sessions linked: X
```

**Verify**:
- Go to Supabase Dashboard → Editor
- Run this check query:
```sql
SELECT * FROM periods LIMIT 1;
SELECT * FROM allocation_rules LIMIT 1;
SELECT COUNT(*) FROM daily_sessions WHERE period_id IS NOT NULL;
```

---

## 🎪 WHAT HAPPENS AFTER BOTH STEPS

### After Step 1 (Schema):
- ✅ Database ready for data
- ❌ No data yet (tables empty)
- ❌ APIs might return 404 (no period found)

### After Step 2 (Seed):
- ✅ Database has initial data
- ✅ APIs return valid data
- ✅ Period locking system operational
- ✅ Allocation rules initialized (60-40 baseline)

---

## ⚠️ IMPORTANT NOTES

1. **Order Matters**: Must run Step 1 BEFORE Step 2
2. **Wait Between Steps**: Let Supabase complete Step 1 fully before starting Step 2
3. **One Query at a Time**: Don't run both files in same SQL editor query
4. **If Error on Step 1**: Check error message, fix migration file, retry
5. **If Error on Step 2**: Step 1 data stays safe; fix seed file, retry Step 2

---

## 🆘 TROUBLESHOOTING

### Error: "table 'periods' does not exist"
❌ Problem: Ran Step 2 before Step 1
✅ Solution: Run Step 1 first, wait 30s, then run Step 2

### Error: "column 'is_current' does not exist"  
❌ Problem: Transaction conflict (old issue - should be fixed now)
✅ Solution: Try again with split files

### Error: "duplicate key value violates unique constraint"
❌ Problem: Seed data already exists from previous run
✅ Solution: Data already seeded - this is OK, skip re-running

### Error: "FOREIGN KEY constraint violation"
❌ Problem: outlets table empty or wrong reference
✅ Solution: Check if outlets data exists: `SELECT COUNT(*) FROM outlets;`

---

## 📊 Timeline

| Step | File | Time | Action |
|------|------|------|--------|
| 1 | migration-period-close-system.sql | 10-30s | Run in SQL Editor |
| 2 | seed-period-close-system.sql | 5-10s | Run in SQL Editor (separate query) |
| **Total** | - | **20-50s** | Entire schema + seed complete |

---

## ✅ SUCCESS CHECKLIST

After both steps complete:

- [ ] Step 1 ran without errors
- [ ] Step 2 ran without errors
- [ ] Can see `periods` table in Supabase Dashboard
- [ ] Can see `allocation_rules` table in Supabase Dashboard
- [ ] Can see `buku_closings` table in Supabase Dashboard
- [ ] `daily_sessions` has 5 new columns
- [ ] API endpoint `/api/periods?outlet_id=<id>` returns data
- [ ] Initial period status = "active"
- [ ] Initial allocation_rules shows 60-40 split

---

**Status**: 🟢 READY TO EXECUTE

Next: After both steps succeed, run Phase A API tests:
- Test `GET /api/periods`
- Test `POST /api/periods/close`
- Test session locking behavior
