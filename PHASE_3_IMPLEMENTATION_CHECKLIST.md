# Phase 3: Add Karyawan Role to Alokasi Laba - Implementation Checklist

**Objective:** Enable users to allocate profit to employees (karyawan) in addition to investor cicilan payments during Alokasi Laba flow.

**Current State:**
- Alokasi Laba hanya support: Investor Cicilan → Kas Top-up → Simpan Uang → Investor Profit Share
- Tidak ada flow untuk allocate ke karyawan (gaji/bonus)
- Employee table exists tapi tidak terintegrasi dengan Alokasi Laba

**Goal:** Multi-path allocation:
- Path A: Investor-only (current)
- Path B: Investor + Karyawan (new)
- Path C: Karyawan-only (no investor hutang)

---

## Task 1: Update Database Schema

**Location:** `migrations/phase3-karyawan-allocation.sql`

**Changes Required:**

```sql
-- 1. Add columns to profit_allocations untuk track karyawan allocation
ALTER TABLE profit_allocations 
ADD COLUMN employee_mode VARCHAR(50) DEFAULT 'exclude' CHECK (employee_mode IN ('exclude', 'include')),
ADD COLUMN karyawan_allocations JSONB,
ADD COLUMN total_employee_allocation DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN employee_allocation_notes TEXT;

-- 2. Create employee_allocations table untuk detail tracking
CREATE TABLE IF NOT EXISTS employee_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profit_allocation_id UUID NOT NULL REFERENCES profit_allocations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  allocation_amount DECIMAL(15, 2) NOT NULL,
  allocation_type VARCHAR(50) DEFAULT 'gaji' CHECK (allocation_type IN ('gaji', 'bonus', 'thr', 'bonus_produksi')),
  allocation_month VARCHAR(10) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create index for fast queries
CREATE INDEX idx_employee_allocations_outlet ON employee_allocations(outlet_id, allocation_month);
CREATE INDEX idx_employee_allocations_employee ON employee_allocations(employee_id);
```

**File:**
- Create: `migrations/phase3-karyawan-allocation.sql`
- Status: **To Do**

---

## Task 2: Update Alokasi Laba API

**Location:** `/api/profit-allocations` (POST endpoint)

**Updates:**

1. **Accept new fields in request body:**
```json
{
  "employee_mode": "include" | "exclude",
  "employee_allocations": [
    {
      "employee_id": "xxx",
      "allocation_amount": 500000,
      "allocation_type": "gaji" | "bonus" | "thr"
    }
  ]
}
```

2. **Validation logic:**
   - If employee_mode = 'include': validate employee_allocations not empty
   - If employee_mode = 'exclude': ignore employee_allocations
   - Validate total employee allocation ≤ remaining profit after investor cicilan
   - Validate each employee_id exists in employees table

3. **Processing logic:**
   - Save profit_allocations record with employee_mode + total_employee_allocation
   - Create employee_allocations records for each employee
   - Calculate: remaining_profit = profit - investor_cicilan - employee_allocation - simpan_uang

**Code File:**
- Update: `src/app/api/profit-allocations/route.ts` (POST handler)
- Status: **To Do**

---

## Task 3: Create Employees Endpoint

**Location:** `/api/employees`

**Request:**
```
GET /api/employees?outlet_id=xxx&status=active
```

**Response:**
```json
{
  "employees": [
    {
      "id": "emp-1",
      "name": "Budi",
      "role": "Kepala Toko",
      "salary": 3000000,
      "status": "active"
    },
    {
      "id": "emp-2",
      "name": "Siti",
      "role": "Kasir",
      "salary": 2000000,
      "status": "active"
    }
  ]
}
```

**Code File:**
- Create: `src/app/api/employees/route.ts`
- Status: **To Do**

---

## Task 4: Update Alokasi Laba UI - Add Employee Step

**Location:** `src/app/dashboard/funding/page.tsx` - TabAlokasiLaba component

**New Step: Step 2.5 - Choose Employee Mode**

**Form Logic:**

```typescript
// State additions
const [employeeMode, setEmployeeMode] = useState<'exclude' | 'include'>('exclude');
const [employees, setEmployees] = useState<any[]>([]);
const [employeeAllocations, setEmployeeAllocations] = useState<{
  [employeeId: string]: { amount: number; type: string }
}>({});

// When employee_mode changes to 'include'
useEffect(() => {
  if (employeeMode === 'include') {
    fetchEmployees();
  }
}, [employeeMode]);

// Fetch employees
async function fetchEmployees() {
  const res = await fetch(`/api/employees?outlet_id=${outletId}&status=active`);
  const data = await res.json();
  setEmployees(data.employees);
}
```

**UI Components:**

1. **Step 2.5 Card: "Alokasi Karyawan"**
   ```
   ┌─ Alokasi Karyawan ──────────────────────┐
   │                                         │
   │ 📋 Apakah ingin alokasi ke karyawan?   │
   │                                         │
   │ ○ Tidak (skip karyawan)                 │
   │ ● Ya (alokasi gaji/bonus ke karyawan)  │
   │                                         │
   │ [Jika dipilih "Ya", tampilkan form]    │
   │                                         │
   │ Karyawan yang akan dialokasi:           │
   │ ┌─ Budi (Kepala Toko)           ────┐ │
   │ │ Alokasi: [500,000]              Rp │ │
   │ │ Tipe:    [Gaji ▼]                  │ │
   │ └────────────────────────────────────┘ │
   │ ┌─ Siti (Kasir)                 ────┐ │
   │ │ Alokasi: [250,000]              Rp │ │
   │ │ Tipe:    [Bonus ▼]                 │ │
   │ └────────────────────────────────────┘ │
   │                                         │
   │ Total Alokasi Karyawan: Rp 750,000    │
   │                                         │
   │ [Kembali]  [Lanjut ke Step 3]         │
   └─────────────────────────────────────────┘
   ```

2. **Validation:**
   - If employee_mode = 'include', at least 1 employee must have allocation > 0
   - Total employee allocation must not exceed available profit
   - Each employee allocation must be > 0

**Code File:**
- Update: `src/app/dashboard/funding/page.tsx` - TabAlokasiLaba
- Status: **To Do**

---

## Task 5: Update Alokasi Laba Calculation Logic

**Location:** `src/app/dashboard/funding/page.tsx` - `handleSaveAllocation()` function

**Updated Calculation:**

```typescript
// Previous flow (Step 1-4)
profit = profitPending
profit -= investorCicilanTotal       // Step 3: Auto-deduct hutang
// profit is now "profitAfterHutang"

// NEW flow (Step 2.5)
if (employeeMode === 'include') {
  profit -= totalEmployeeAllocation   // Step 2.5: Deduct employee allocation
}
// profit is now "profitAfterHutang&Karyawan"

// Continue with existing logic
profit -= kasTopup                    // Step 6
profit -= simpanUang                  // Step 7
// Remaining = profit share untuk investor

// Build allocation record with employee data
const allocationRecord = {
  ...existing_fields,
  employee_mode: employeeMode,
  karyawan_allocations: employeeAllocations,
  total_employee_allocation: totalEmployeeAllocation,
  employee_allocation_notes: reason
}

// Save to API with employee data
POST /api/profit-allocations
```

**Code File:**
- Update: `src/app/dashboard/funding/page.tsx` - `calculateAndSaveAllocation()` function
- Status: **To Do**

---

## Task 6: Update Dashboard Display

**Location:** `src/app/dashboard/dashboard/page.tsx` (if showing allocation summary)

**Display Changes:**
- Show employee allocations in profit allocation summary
- Display employee count + total allocation amount
- Link to employee allocation details

**Code File:**
- Update: `src/app/dashboard/dashboard/page.tsx`
- Status: **To Do**

---

## Implementation Order

1. ✅ **Done:** Understand Phase 3 requirements
2. ⏳ **Next:** Create migration SQL (`phase3-karyawan-allocation.sql`)
3. ⏳ **Then:** Create `/api/employees` endpoint
4. ⏳ **Then:** Update `/api/profit-allocations` POST handler
5. ⏳ **Then:** Add employee mode step to Alokasi Laba UI
6. ⏳ **Then:** Update calculation logic
7. ⏳ **Then:** Test end-to-end

---

## Key Business Rules

**Rule 1: Employee Allocation Priority**
```
Profit Pending
├─ Step 1: Investor Cicilan Repayment (auto-deduct)
├─ Step 2.5: Employee Allocation (optional, NEW)
├─ Step 5: Kas Top-up
├─ Step 7: Simpan Uang
└─ Sisa: Profit Share ke Investor
```

**Rule 2: Employee Mode Options**
- `exclude`: No employee allocation (current behavior)
- `include`: Allocate to selected employees with custom amounts

**Rule 3: Allocation Types**
- `gaji`: Salary (monthly, recurring)
- `bonus`: Performance bonus (one-time)
- `thr`: Holiday bonus (seasonal)
- `bonus_produksi`: Production-based bonus

**Rule 4: Constraints**
- Employee allocation cannot exceed available profit
- If employee_mode = 'include', must allocate to at least 1 employee
- Allocation per employee must be ≥ 0

---

## Database Tables After Phase 3

| Table | New Columns | Purpose |
|-------|-------------|---------|
| `profit_allocations` | employee_mode, karyawan_allocations, total_employee_allocation | Track employee allocations per period |
| `employee_allocations` | (NEW) | Detailed employee allocation records |

---

## Success Criteria

✅ Migration runs without errors
✅ `/api/employees` returns active employees
✅ `/api/profit-allocations` accepts and saves employee data
✅ Alokasi Laba form shows employee selection step
✅ Calculation correctly deducts investor + employee allocations
✅ No TypeScript errors
✅ Dashboard shows allocation summary with employee data

---

## Notes for Implementation

- Employees table already exists (from earlier schema)
- Use same decimal precision (Decimal.js) for calculations
- Consider caching employee list (fetch once per session)
- Error messages should be clear for invalid employee selection
- Future: Support bulk employee allocation (template)
- Future: Role-based access (only manager can approve)

