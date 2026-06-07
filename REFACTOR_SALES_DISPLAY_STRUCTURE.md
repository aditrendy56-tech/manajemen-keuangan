# REFACTOR: Sales Display Structure - Hierarchical Report Format

**Date:** 2026-06-07  
**Status:** Planning (Ready for Execution)  
**Component Affected:** `src/components/tables/SalesTable.tsx`, `src/app/dashboard/sessions/[id]/page.tsx`  
**Related Changes:** Split Payment Implementation (Completed), Sales Consolidation Refactor (Completed)

---

## **1. PROBLEM STATEMENT**

### Current State (❌ Not Acceptable)
The current sales list displays transactions in a **flat table format** that is:
- Unprofessional and lacks structure
- Shows redundant **tanggal (date)** column (already shown in session header)
- Presents all transactions without logical grouping
- Does not differentiate between **offline** vs **online** channels
- Does not show **fee calculations** clearly for online platforms
- Does not force user to review all transactions (lazy reviewing)

**Example Current Display:**
```
Tanggal | Channel | Metode | Kotor | Fee | Bersih | Aksi
7/6/26  | offline | Cash   | 20k   | 0   | 20k    | Refund
7/6/26  | offline | QRIS   | 15k   | 0   | 15k    | Refund
7/6/26  | online  | QRIS   | 30k   | 7.5k| 22.5k  | Refund
```
→ Confusing, hard to analyze, not audit-friendly

---

## **2. DESIRED STATE**

### New Format (✅ Professional Report)
Display sales transactions in a **hierarchical report structure** grouped by:
1. **OFFLINE section** (Cash + QRIS combined - same pricing, no fees)
2. **GOFOOD section** (Online platform - with fee breakdown 25%)
3. **SHOPEEFOOD section** (Online platform - with fee breakdown 20%)
4. **Refund section** (Dedicated, below all sales)
5. **Grand Total** (Summary of all)

**Example Desired Display:**

```
📦 OFFLINE (Cash + QRIS)                                [▼ Expanded]
  
  💵 CASH
  ├─ [Txn 001] Roti Bakar Coklat × 1 = Rp 15.000
  ├─ [Txn 002] Nanas × 2 = Rp 26.000
  └─ Subtotal Cash: Rp 41.000
  
  📱 QRIS
  ├─ [Txn 003] Roti Bakar Standar × 1 = Rp 5.000
  └─ Subtotal QRIS: Rp 5.000
  
  TOTAL OFFLINE: Rp 46.000 ━━━━━━━━━━━━━━━━━━━━━━━━

---

🚚 GOFOOD                                               [▼ Expanded]

  [Txn 004] Roti Bakar Coklat × 2
           Kotor: Rp 30.000 | Fee 25%: -Rp 7.500 | Bersih: Rp 22.500
  
  [Txn 005] Nanas × 1
           Kotor: Rp 13.000 | Fee 25%: -Rp 3.250 | Bersih: Rp 9.750
  
  TOTAL GOFOOD:
  Kotor: Rp 43.000 | Total Fee: -Rp 10.750 | Bersih: Rp 32.250 ━━━━━━━━━━

---

🛍️ SHOPEEFOOD                                          [▼ Expanded]

  [Txn 006] Nanas × 3
           Kotor: Rp 39.000 | Fee 20%: -Rp 7.800 | Bersih: Rp 31.200
  
  TOTAL SHOPEEFOOD:
  Kotor: Rp 39.000 | Total Fee: -Rp 7.800 | Bersih: Rp 31.200 ━━━━━━━━━━

---

💰 RINGKASAN TOTAL

  ├─ Offline (Cash + QRIS):  Rp 46.000
  ├─ GoFood (Net):           Rp 32.250
  ├─ ShopeeFood (Net):       Rp 31.200
  └─ TOTAL PENJUALAN:        Rp 109.450

---

🔄 REFUND                                              [Button: Proses Refund]

  Pilih item untuk direfund:
  ☐ [Txn 001] Roti Bakar Coklat - Rp 15.000
  ☐ [Txn 002] Nanas - Rp 26.000
  ☐ [Txn 003] Roti Bakar Standar - Rp 5.000
  ☐ [Txn 004] Roti Bakar Coklat - Rp 22.500
  ☐ [Txn 005] Nanas - Rp 9.750
  ☐ [Txn 006] Nanas - Rp 31.200
  
  [Proses Refund Terpilih]
```

---

## **3. DETAILED SPECIFICATIONS**

### **3.1 Data Grouping Rules**

| Group | Criteria | Combine? | Fee Applied |
|-------|----------|----------|-------------|
| **OFFLINE-CASH** | channel='offline' AND payment_method='cash' | With QRIS | ❌ No |
| **OFFLINE-QRIS** | channel='offline' AND payment_method='qris' | With CASH | ❌ No |
| **GOFOOD** | channel='online' AND platform='gofood' | Solo | ✅ Yes (25%) |
| **SHOPEEFOOD** | channel='online' AND platform='shopeefood' | Solo | ✅ Yes (20%) |

### **3.2 Display Rules - Per Transaction**

**Offline Transactions:**
```
[Txn ID] Product × Qty = Rp Amount
```
- Show product name
- Show quantity
- Show total for this transaction
- Simple format (no fee calculation)

**Online Transactions:**
```
[Txn ID] Product × Qty
        Kotor: Rp Amount | Fee XX%: -Rp FeeAmount | Bersih: Rp NetAmount
```
- Show product name
- Show quantity
- Show gross amount
- Show fee percentage & amount
- Show net amount

### **3.3 Subtotal Display**

**For Offline Subsections (Cash/QRIS):**
```
Subtotal [CASH|QRIS]: Rp XXX.XXX
```

**For Online Sections (GoFood/ShopeeFood):**
```
TOTAL [GOFOOD|SHOPEEFOOD]:
Kotor: Rp XXX.XXX | Total Fee: -Rp XX.XXX | Bersih: Rp XXX.XXX
```

### **3.4 Grand Total Display**

```
💰 RINGKASAN TOTAL

  ├─ Offline (Cash + QRIS):  Rp XXX.XXX
  ├─ GoFood (Net):           Rp XXX.XXX
  ├─ ShopeeFood (Net):       Rp XXX.XXX
  └─ TOTAL PENJUALAN:        Rp XXX.XXX
```

### **3.5 Expand/Collapse Behavior**

**Initial State (on page load/refresh):**
- All sections: **EXPANDED** (all items visible)
- User MUST review all transactions before taking action
- Purpose: Force careful audit, prevent lazy reviewing

**After Initial Load:**
- User can click section header to **collapse/expand**
- Click arrow icon (▼/▶) to toggle
- State persists during session (optional: can be reset on refresh)

**Interaction:**
```
Click on: 📦 OFFLINE (Cash + QRIS)                     [▼ Click to collapse]

→ Collapses to:
  📦 OFFLINE (Cash + QRIS)                             [▶ Click to expand]
     TOTAL OFFLINE: Rp 46.000

  (All transaction details hidden)
```

---

## **4. REFUND SECTION SPECIFICATIONS**

### **4.1 Current Issue**
- Refund button on each transaction row
- User refunds one transaction at a time
- No batch refund capability
- No centralized refund list

### **4.2 Desired Implementation**

**Dedicated Refund Section (Below All Sales):**

```
🔄 REFUND
═══════════════════════════════════════════════════════

Pilih item yang akan direfund:

☐ [Txn 001] Roti Bakar Coklat (Offline-Cash)       - Rp 15.000
☐ [Txn 002] Nanas (Offline-Cash)                   - Rp 26.000
☐ [Txn 003] Roti Bakar Standar (Offline-QRIS)      - Rp 5.000
☐ [Txn 004] Roti Bakar Coklat (GoFood)             - Rp 22.500
☐ [Txn 005] Nanas (GoFood)                         - Rp 9.750
☐ [Txn 006] Nanas (ShopeeFood)                     - Rp 31.200

Dipilih: 0 item | Total Refund: Rp 0

[Proses Refund Terpilih] (disabled jika 0 dipilih)
```

### **4.3 Refund Mechanics**

1. **Selection:** User checks checkbox(es) for transaction(s) to refund
2. **Display:** Show count of selected items + total refund amount
3. **Action:** Single "Proses Refund" button for all selected
4. **Flow:** Clicking button opens refund dialog (similar to current, but can handle batch)
5. **Restrictions:**
   - Only show transactions with `payment_status != 'refunded'`
   - Cannot refund already-refunded transactions
   - Show reason/notes input for batch refund

---

## **5. IMPLEMENTATION DETAILS**

### **5.1 Component Changes**

**File:** `src/components/tables/SalesTable.tsx`

**Changes:**
- Replace current flat table structure with hierarchical grouping
- Add state for expand/collapse per section
- Implement nested rendering (sections → subsections → transactions)
- Add refund checkbox selection logic
- Implement batch refund button

**New Props:**
```typescript
interface SalesTableProps {
  sales: Sale[];
  onRefund?: (sale: Sale | Sale[]) => void;  // Now supports array
  onDelete?: (saleId: string) => void;
  withCard?: boolean;
}
```

### **5.2 Data Processing Logic**

```typescript
// Pseudocode
const groupedSales = {
  offline: {
    cash: Sale[],
    qris: Sale[]
  },
  gofood: Sale[],
  shopeefood: Sale[]
}

// Group transactions by channel/method
function groupSalesByChannel(sales: Sale[]): GroupedSales {
  return {
    offline: {
      cash: sales.filter(s => s.channel === 'offline' && s.payment_method === 'cash'),
      qris: sales.filter(s => s.channel === 'offline' && s.payment_method === 'qris')
    },
    gofood: sales.filter(s => s.platform === 'gofood'),
    shopeefood: sales.filter(s => s.platform === 'shopeefood')
  }
}

// Calculate totals per section
function calculateSectionTotals(groupedSales: GroupedSales) {
  return {
    offlineCashSubtotal: sum(groupedSales.offline.cash),
    offlineQrisSubtotal: sum(groupedSales.offline.qris),
    offlineTotal: offlineCashSubtotal + offlineQrisSubtotal,
    gofoodTotal: calculateOnlineTotal(groupedSales.gofood, 0.25),
    shopeefoodTotal: calculateOnlineTotal(groupedSales.shopeefood, 0.20),
    grandTotal: offlineTotal + gofoodTotal + shopeefoodTotal
  }
}
```

### **5.3 UI Structure**

```tsx
<div className="sales-report">
  {/* Offline Section */}
  <SalesSection title="OFFLINE" isExpanded={offlineExpanded}>
    {/* Cash Subsection */}
    <SalesSubsection title="CASH">
      {offlineCash.map(txn => <TransactionRow txn={txn} />)}
      <Subtotal amount={offlineCashTotal} />
    </SalesSubsection>
    
    {/* QRIS Subsection */}
    <SalesSubsection title="QRIS">
      {offlineQris.map(txn => <TransactionRow txn={txn} />)}
      <Subtotal amount={offlineQrisTotal} />
    </SalesSubsection>
    
    <SectionTotal amount={offlineTotal} />
  </SalesSection>
  
  {/* Online Sections */}
  <SalesSection title="GOFOOD" isExpanded={gofoodExpanded}>
    {gofood.map(txn => <OnlineTransactionRow txn={txn} fee={0.25} />)}
    <SectionTotal gross={gofoodGross} fee={gofoodFee} net={gofoodNet} />
  </SalesSection>
  
  <SalesSection title="SHOPEEFOOD" isExpanded={shopeefoodExpanded}>
    {shopeefood.map(txn => <OnlineTransactionRow txn={txn} fee={0.20} />)}
    <SectionTotal gross={shopeefoodGross} fee={shopeefoodFee} net={shopeefoodNet} />
  </SalesSection>
  
  {/* Grand Total */}
  <GrandTotal
    offlineTotal={offlineTotal}
    gofoodNet={gofoodNet}
    shopeefoodNet={shopeefoodNet}
    grandTotal={grandTotal}
  />
  
  {/* Refund Section */}
  <RefundSection
    availableSales={nonRefundedSales}
    onSelectChange={handleRefundSelection}
    onProcessRefund={handleProcessRefund}
  />
</div>
```

### **5.4 CSS/Styling**

- Use clear visual hierarchy (colors, indentation, borders)
- Distinguish offline vs online sections (different background colors)
- Make expand/collapse arrows obvious (chevron icons)
- Highlight totals (bold, slightly larger font)
- Gray out refunded transactions

---

## **6. NOT INCLUDED - SPLIT PAYMENT ONLINE**

**Decision:** Split payment is **OFFLINE ONLY**

**Reason:**
- Online payments (ShopeeFood/GoFood) are processed through their payment gateways (ShopeePay/GoPay)
- Cannot do split payment on online platform (GA-compliant payment flow)
- Split payment only makes sense for offline (manual cash + QRIS combination)

**Implementation:**
- BatchSaleForm: Only show split payment option when `channelType === 'offline'` ✓ (Already done)
- SalesTable: Never show split payment in report (all splits are offline anyway)

---

## **7. SPLIT PAYMENT ALREADY COMPLETED**

This refactor builds upon already-completed split payment work:
- ✅ BatchSaleForm enhanced with per-transaction split payment logic
- ✅ Payload structure supports `payment_entries` array
- ✅ API correctly creates multiple cash_transactions per sale
- ✅ Split payment UI panel working correctly

This refactor does NOT change split payment logic - only improves display.

---

## **8. TESTING CHECKLIST**

- [ ] Offline Cash transactions display correctly
- [ ] Offline QRIS transactions display correctly
- [ ] Offline Cash + QRIS subtotals correct
- [ ] GoFood transactions show 25% fee breakdown
- [ ] ShopeeFood transactions show 20% fee breakdown
- [ ] Online fee calculations accurate
- [ ] Grand total matches sum of all sections
- [ ] Expand/collapse works for each section
- [ ] Initial load: all sections expanded
- [ ] Collapse state doesn't persist after refresh (or persists if localStorage used)
- [ ] Refund section shows only non-refunded transactions
- [ ] Refund checkboxes work correctly
- [ ] Batch refund button disabled when 0 selected
- [ ] Batch refund processes correctly
- [ ] No tanggal (date) column in new display
- [ ] Mobile responsive (if applicable)
- [ ] **[NEW] Custom pricing tab loads correctly**
- [ ] **[NEW] Can select product from dropdown**
- [ ] **[NEW] Original price calculated correctly (qty × product price)**
- [ ] **[NEW] Custom price input accepts custom amount**
- [ ] **[NEW] Description field accepts free text**
- [ ] **[NEW] Add Custom Pricing button saves to session**
- [ ] **[NEW] Edit custom pricing item**
- [ ] **[NEW] Delete custom pricing item**
- [ ] **[NEW] Custom pricing section appears in sales report**
- [ ] **[NEW] Custom section shows original → custom price**
- [ ] **[NEW] Discount amount calculated (original - custom)**
- [ ] **[NEW] Discount percentage shown**
- [ ] **[NEW] Custom section total in grand summary**
- [ ] **[NEW] Batch custom pricing submission works**

---

## **9. MIGRATION NOTES**

- SalesTable component replaced (breaking change)
- No database schema changes needed **[UPDATED]** - CUSTOM PRICING REQUIRES schema change
- No API changes needed **[UPDATED]** - CUSTOM PRICING needs new endpoint
- Only frontend display restructured
- Existing refund logic can be reused (adapt for batch)

### **Custom Pricing Migration:**
- **Schema:** Add 4 new columns to `sales` table (is_custom_price, custom_original_price, custom_final_price, custom_description)
- **API:** New POST endpoint `/api/sales/custom`
- **Component:** New CustomPricingTab component for session page
- **Types:** Update `Sale` type to include custom pricing fields

---

## **10. CUSTOM PRICING FEATURE** (NEW - Flexible Special Customer Pricing)

### **10.1 Purpose**
Enable flexible special pricing for:
- Close/special customers
- Bulk orders
- Friend/family discounts
- Owner discretionary pricing

**Key:** Owner decides price on-the-fly, NOT fixed rules. Fully tracked with description.

### **10.2 Use Case Example**
**Scenario:** Owner meets customer X (tetangga/teman dekat) who wants 5 roti bakar. Normally Rp 5k each = Rp 25k. Owner decides: "Let's do Rp 4k each = Rp 20k for them."

**Current Problem:** No easy way to record this without creating fake products or manual adjustments
**Solution:** Custom Pricing entry - select item, enter custom price, add description

### **10.3 Data Structure**

**New Field in `sales` table:**
```sql
ALTER TABLE sales ADD COLUMN (
  is_custom_price BOOLEAN DEFAULT false,
  custom_original_price DECIMAL(10,2),  -- normal/reference price
  custom_final_price DECIMAL(10,2),     -- price owner set
  custom_description TEXT                -- why custom price (for audit)
);
```

**Example Sales Record:**
```json
{
  "id": "sale_007",
  "product_id": "prod_roti_bakar",
  "product_name": "Roti Bakar Standar",
  "quantity": 5,
  "original_price": 5000,
  "is_custom_price": true,
  "custom_original_price": 25000,    // 5k × 5
  "custom_final_price": 20000,       // What owner set
  "custom_description": "Tetangga - diskusi dengan owner",
  "channel": "offline",
  "payment_method": "cash",
  "gross_amount": 20000,
  "net_amount": 20000,
  "type": "custom"
}
```

### **10.4 UI/UX - Custom Pricing Input**

**Location:** Session page, new tab "💳 CUSTOM" (beside Split Payment tab)

**Form Layout:**
```
╔════════════════════════════════════════════════════════════════╗
║                    CUSTOM PRICING                              ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  Pilih Produk:                                                 ║
║  [Dropdown ▼] Select Product...                               ║
║    └─ Roti Bakar Standar                                      ║
║    └─ Roti Bakar Coklat                                       ║
║    └─ Nanas                                                   ║
║    └─ etc...                                                  ║
║                                                                ║
║  Jumlah (Qty):                                                 ║
║  [Input] 5                                                     ║
║                                                                ║
║  Harga Normal (Reference):                                     ║
║  Rp 5.000 × 5 = Rp 25.000  [Read-only]                       ║
║                                                                ║
║  Harga Custom yang Diberikan:                                  ║
║  Rp [Input] 20000                                              ║
║                                                                ║
║  Deskripsi / Alasan Harga Custom:                              ║
║  [Text Area]                                                   ║
║  "Tetangga dekat, diskusi harga dengan owner. Special price"  ║
║                                                                ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ [Tambah Custom Pricing] [Clear]                           │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  ────────────────────────────────────────────────────────────  ║
║                                                                ║
║  CUSTOM PRICING DAFTAR (dalam session ini):                    ║
║                                                                ║
║  ✓ Custom #1: Roti Bakar Standar × 5 = Rp 20.000              ║
║    Deskripsi: Tetangga dekat, diskusi harga dengan owner      ║
║    [Edit] [Delete]                                             ║
║                                                                ║
║  ✓ Custom #2: Nanas × 3 = Rp 12.000                            ║
║    Deskripsi: Bulk order, promo khusus                        ║
║    [Edit] [Delete]                                             ║
║                                                                ║
║  Subtotal Custom: Rp 32.000                                    ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### **10.5 Display in Sales Report**

**New Section - CUSTOM (grouped with offline but distinct):**

```
🎯 CUSTOM PRICING                                      [▼ Expanded]

  [Custom #1] Roti Bakar Standar × 5
             Harga Normal: Rp 25.000 → Custom: Rp 20.000
             Alasan: Tetangga dekat, diskusi harga dengan owner
  
  [Custom #2] Nanas × 3
             Harga Normal: Rp 15.000 → Custom: Rp 12.000
             Alasan: Bulk order, promo khusus
  
  TOTAL CUSTOM: Rp 32.000 ━━━━━━━━━━━━━━━━━━━━━━━━

---

💰 RINGKASAN TOTAL

  ├─ Offline (Cash + QRIS):  Rp 46.000
  ├─ Custom Pricing:         Rp 32.000
  ├─ GoFood (Net):           Rp 32.250
  ├─ ShopeeFood (Net):       Rp 31.200
  └─ TOTAL PENJUALAN:        Rp 141.450
```

### **10.6 API Endpoint**

**POST `/api/sales/custom`**
```json
{
  "session_id": "session_001",
  "product_id": "prod_roti_bakar_standar",
  "quantity": 5,
  "custom_price": 20000,
  "custom_description": "Tetangga dekat, diskusi harga dengan owner"
}
```

**Response:**
```json
{
  "id": "sale_007",
  "success": true,
  "message": "Custom pricing added",
  "data": {
    "product_name": "Roti Bakar Standar",
    "quantity": 5,
    "original_price": 25000,
    "custom_price": 20000,
    "discount_amount": 5000,
    "discount_percentage": "20%"
  }
}
```

### **10.7 Backend Changes**

**Database:**
- Add new columns to `sales` table (custom_original_price, custom_final_price, custom_description, is_custom_price)
- Add indexes on `is_custom_price` for reports

**API Handler (`POST /api/sales/custom`):**
```typescript
// Validate product exists & get original price
// Validate quantity
// Calculate discount (original vs custom)
// Create sales record with type='custom'
// Return success with discount info
```

**Sales Grouping Logic:**
- When fetching sales for session, filter by type
- Group: offline_cash, offline_qris, **custom**, gofood, shopeefood

### **10.8 Audit & Transparency**

**Why This Matters:**
- Every custom price has a description (accountability)
- Reports show original price → custom price (transparency)
- Discount amount calculated automatically
- Owner's decisions documented

**Example Report Entry:**
```
Custom Sales Summary:
  Total Items: 2
  Total Original Value: Rp 40.000
  Total Custom Value: Rp 32.000
  Total Discount Given: Rp 8.000 (20%)
  Descriptions Logged: ✓ All custom prices have reasons
```

---

## **11. FUTURE ENHANCEMENTS** (Not in this refactor)

- [ ] Export sales report to PDF/Excel
- [ ] Filter by date range
- [ ] Search/filter transactions
- [ ] Batch operations (void multiple, mark as suspicious)
- [ ] Audit log for refunds
- [ ] Admin approval for refunds
- [ ] Custom pricing approval workflow (if needed)
- [ ] Custom pricing analytics (track total discounts given)

---

## **EXECUTION PHASE**

Ready to execute when user confirms. Implementation will:
1. ✅ Modify `SalesTable.tsx` with hierarchical grouping & refund section
2. ✅ Create CustomPricingTab component for session page
3. ✅ Update session detail page layout (add custom tab)
4. ✅ Add database schema migration (custom pricing columns)
5. ✅ Create API endpoint `/api/sales/custom`
6. ✅ Update Sales type definitions
7. ✅ Test with sample data (all types: offline, online, custom)
8. ✅ Verify all calculations (fees, subtotals, grand total)
9. ✅ Test refund workflow (single & batch)
10. ✅ Commit to git with clear messages

**Scope:**
- SalesTable display refactor
- Refund batch processing
- Custom pricing feature (input, storage, display)
- All supporting API endpoints
- Database migrations

**Affected Files:**
- `src/components/tables/SalesTable.tsx` (major refactor)
- `src/components/forms/CustomPricingTab.tsx` (new)
- `src/app/dashboard/sessions/[id]/page.tsx` (add tab)
- `src/types/index.ts` (update Sale type)
- `src/lib/calculations/` (update for custom pricing)
- `src/app/api/sales/custom.ts` (new endpoint)
- `database/migrations/` (add custom pricing columns)


