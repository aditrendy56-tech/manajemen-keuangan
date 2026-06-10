# Dashboard Structure - New Implementation (2026-06-10)

> Dokumentasi lengkap untuk refactor dashboard dengan struktur baru & toggle global Hari Ini/Total

---

## 📋 Overview

Dashboard akan diubah dengan:
1. **Global Toggle Button** (Hari Ini / Total) → Control semua section sekaligus
2. **Section 1:** Replace "Top Product" → "Jumlah Item Terjual" (toggle-aware)
3. **Section 3:** Penjualan per Channel dengan expandable detail (Collapsed by default)
4. **Section 4:** Cash Flow Tracking (toggle-aware)
5. **Section 5:** Pengeluaran per Kategori dengan expandable detail Hari Ini only

---

## 🎯 Architecture

```
┌────────────────────────────────────────────────────────────┐
│ HEADER                                                     │
│ Dashboard          [📊 Hari Ini | 📈 Total] ← GLOBAL TOGGLE│
│ Subtitle                                                   │
└────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────┐
│ SECTION 1: Key Metrics (4 cards)                           │
│ ├─ Pendapatan Kotor       (toggle-aware)                   │
│ ├─ Pendapatan Bersih      (toggle-aware)                   │
│ ├─ Keuntungan             (toggle-aware)                   │
│ └─ Jumlah Item Terjual    (toggle-aware) ← CHANGED         │
└────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────┐
│ SECTION 2: 💰 Financial Buckets (4 cards + context)        │
│ (UNCHANGED - kept from before)                            │
└────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────┐
│ SECTION 3: Penjualan per Channel (toggle-aware)            │
│                                                            │
│ Hari Ini Mode:                                             │
│ ┌─ Offline: Rp XXX [▼ Detail]      ← Collapsed default    │
│ │  ├─ Cash: Rp YYY (qty items)                            │
│ │  ├─ QRIS: Rp ZZZ (qty items)                            │
│ │  └─ Item List: (combined)                              │
│ │     ├─ Roti Bakar: 15 item                              │
│ │     ├─ Teh: 20 item                                     │
│ │     └─ ...                                              │
│ │  └─ [▲ Hide Detail] ← When expanded                     │
│ │                                                         │
│ ├─ ShopeeFood: Rp XXX [▼ Detail]   ← Collapsed default    │
│ │  ├─ Item List:                                          │
│ │  │  ├─ Roti Bakar: 8 item                               │
│ │  │  ├─ Teh: 10 item                                     │
│ │  │  └─ ...                                              │
│ │  ├─ Platform Fee: -Rp FFF                               │
│ │  └─ Net Amount: Rp NNN                                  │
│ │  └─ [▲ Hide Detail]                                     │
│ │                                                         │
│ └─ GoFood: Rp XXX [▼ Detail]       ← Collapsed default    │
│    ├─ Item List:                                          │
│    │  ├─ Roti Bakar: 12 item                              │
│    │  ├─ Teh: 18 item                                     │
│    │  └─ ...                                              │
│    ├─ Platform Fee: -Rp GGG                               │
│    └─ Net Amount: Rp NNN                                  │
│    └─ [▲ Hide Detail]                                     │
│                                                            │
│ Total Mode:                                                │
│ ├─ Offline: Rp XXX (NO detail)                             │
│ ├─ ShopeeFood: Rp YYY (NO detail)                          │
│ └─ GoFood: Rp ZZZ (NO detail)                              │
└────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────┐
│ SECTION 4: Cash Flow Tracking (toggle-aware)               │
│ ├─ Cash Masuk Total         (toggle-aware)                │
│ ├─ Cash Keluar Total        (toggle-aware)                │
│ ├─ Pending Penjualan        (toggle-aware)                │
│ └─ Pending Pengeluaran      (toggle-aware)                │
└────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────┐
│ SECTION 5: Pengeluaran per Kategori (toggle-aware)         │
│                                                            │
│ Hari Ini Mode:                                             │
│ ┌─ Bahan: Rp XXX [▼ Detail]         ← Collapsed default   │
│ │  ├─ Telur (10kg): Rp 50k   [10 Juni 2024]              │
│ │  ├─ Roti (5kg): Rp 100k    [10 Juni 2024]              │
│ │  └─ Mentega: Rp 150k       [10 Juni 2024]              │
│ │  └─ [▲ Hide Detail]                                     │
│ │                                                         │
│ ├─ Operasional: Rp YYY [▼ Detail]   ← Collapsed default   │
│ │  ├─ Gaji: Rp 200k          [10 Juni 2024]              │
│ │  ├─ Listrik: Rp 150k       [10 Juni 2024]              │
│ │  ├─ Gas: Rp 100k           [10 Juni 2024]              │
│ │  └─ Misc: Rp 50k           [10 Juni 2024]              │
│ │  └─ [▲ Hide Detail]                                     │
│ │                                                         │
│ └─ Peralatan: Rp ZZZ [▼ Detail]     ← Collapsed default   │
│    ├─ Kompor: Rp 1.5juta     [10 Juni 2024]              │
│    └─ Mixer: Rp 500k         [10 Juni 2024]              │
│    └─ [▲ Hide Detail]                                     │
│                                                            │
│ Total Mode:                                                │
│ ├─ Bahan: Rp XXX (NO detail, just amount)                 │
│ ├─ Operasional: Rp YYY (NO detail)                        │
│ └─ Peralatan: Rp ZZZ (NO detail)                          │
└────────────────────────────────────────────────────────────┘
        ↓
┌────────────────────────────────────────────────────────────┐
│ SECTION 6: Charts & Insights (UNCHANGED)                   │
│ ├─ Weekly Profit Chart                                    │
│ ├─ Revenue By Channel Chart                               │
│ └─ Payment Methods Chart                                  │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 Global Toggle Behavior

### **Toggle Button State Management**

```typescript
// Global state (at page level)
const [timeFilter, setTimeFilter] = useState<'today' | 'cumulative'>('today');

// Toggle button component
<ToggleButtons
  value={timeFilter}
  onChange={setTimeFilter}
  options={[
    { value: 'today', label: '📊 Hari Ini' },
    { value: 'cumulative', label: '📈 Total' }
  ]}
/>

// All sections subscribe to this state
useEffect(() => {
  // When toggle changes, all sections re-render with appropriate data
}, [timeFilter]);
```

### **Data Selection Pattern**

Every section follows same pattern:
```typescript
// Example for Section 1 metrics
const kotor = timeFilter === 'today' 
  ? metrics.today_gross_revenue 
  : metrics.cumulative_gross_revenue;

const bersih = timeFilter === 'today' 
  ? metrics.today_pendapatan_bersih 
  : metrics.cumulative_pendapatan_bersih;

const profit = timeFilter === 'today' 
  ? metrics.today_profit 
  : metrics.cumulative_profit;

const totalItems = timeFilter === 'today'
  ? metrics.today_total_items_sold
  : metrics.cumulative_total_items_sold;
```

---

## 📊 SECTION 1: Key Metrics (4 Cards)

### **Data Source**

```
From API (/api/dashboard):
├─ today_gross_revenue
├─ cumulative_gross_revenue
├─ today_pendapatan_bersih
├─ cumulative_pendapatan_bersih
├─ today_profit
├─ cumulative_profit
├─ today_total_items_sold ← NEW (SUM of today's sale_items.quantity)
└─ cumulative_total_items_sold ← NEW (SUM of all sale_items.quantity)
```

### **Cards Layout**

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Pendapatan Kotor │ Pendapatan Bersih│   Keuntungan    │ Jumlah Item     │
│                  │                  │                  │ Terjual         │
│ Rp XXX           │ Rp XXX           │ Rp XXX           │ YYY items       │
│ (toggle-aware)   │ (toggle-aware)   │ (toggle-aware)   │ (toggle-aware)  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

### **Card 4 Calculation**

```typescript
// Jumlah Item Terjual
const totalItems = timeFilter === 'today'
  ? metrics.today_total_items_sold
  : metrics.cumulative_total_items_sold;

// Display
<span className="text-2xl font-bold">{totalItems} items</span>
```

---

## 📊 SECTION 3: Penjualan per Channel

### **Data Source**

```
From API (/api/dashboard):

TODAY:
├─ today_cash_inflow_by_channel
│  ├─ offline: net amount dari cash + qris
│  ├─ shopeefood: net amount setelah fee
│  └─ gofood: net amount setelah fee
├─ today_payment_methods (for offline breakdown)
│  ├─ cash: amount
│  └─ qris: amount
├─ today_revenue_by_channel (gross sebelum fee)
├─ today_fee_shopeefood
├─ today_fee_gofood
└─ top_products (for item list) ← dari sale_items query

CUMULATIVE:
├─ cumulative_cash_inflow_by_channel
├─ cumulative_revenue_by_channel
└─ (NO detail - just show total)
```

### **Detail Structure - Hari Ini Mode**

**Offline Detail (when expanded):**
```
Offline: Rp 500,000 [▼ Detail]
├─ Cash: Rp 300,000 (15 items)
├─ QRIS: Rp 200,000 (10 items)
└─ Item List: (combined, sorted by qty desc)
   ├─ Roti Bakar: 15 item
   ├─ Teh Hangat: 10 item
   └─ ...
```

**ShopeeFood Detail (when expanded):**
```
ShopeeFood: Rp 450,000 [▼ Detail]
├─ Item List:
│  ├─ Roti Bakar: 8 item
│  ├─ Teh Hangat: 10 item
│  └─ ...
├─ Platform Fee: -Rp 36,000 (8%)
└─ Net Amount: Rp 414,000
```

**GoFood Detail (when expanded):**
```
GoFood: Rp 600,000 [▼ Detail]
├─ Item List:
│  ├─ Roti Bakar: 12 item
│  ├─ Teh Hangat: 18 item
│  └─ ...
├─ Platform Fee: -Rp 60,000 (10%)
└─ Net Amount: Rp 540,000
```

### **Calculation Logic**

```typescript
// Offline payment breakdown
const offlineCash = metrics.today_payment_methods?.cash || 0;
const offlineQris = metrics.today_payment_methods?.qris || 0;
const offlineItems = calculateItemsForPaymentMethod('cash') + calculateItemsForPaymentMethod('qris');

// ShopeeFood net after fee
const shopeeGross = metrics.today_revenue_by_channel?.shopeefood || 0;
const shopeeFee = metrics.today_fee_shopeefood || 0;
const shopeeNet = shopeeGross - shopeeFee;

// Items from top_products filtered by channel
const shopeeItems = metrics.top_products?.filter(p => p.channel === 'shopeefood');
```

---

## 💸 SECTION 4: Cash Flow Tracking

### **Data Source**

```
From API (/api/dashboard):

TODAY:
├─ today_cash_inflow
├─ today_cash_outflow
├─ today_pending_sales
└─ today_pending_expenses

CUMULATIVE:
├─ (Need to add to API if not exist)
├─ cumulative_cash_inflow
├─ cumulative_cash_outflow
└─ (pending tidak ada cumulative, reset per period)
```

### **Cards Layout**

```
Hari Ini Mode:
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Cash Masuk     │ Cash Keluar     │ Pending Jual   │ Pending Exp    │
│ Rp XXX (today) │ Rp XXX (today)  │ Rp XXX (today) │ Rp XXX (today) │
└────────────────┴────────────────┴────────────────┴────────────────┘

Total Mode:
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Cash Masuk     │ Cash Keluar     │ Pending Jual   │ Pending Exp    │
│ Rp XXX (total) │ Rp XXX (total)  │ Rp XXX (today) │ Rp XXX (today) │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

---

## 📋 SECTION 5: Pengeluaran per Kategori

### **Data Source**

```
From API (/api/dashboard):

TODAY:
├─ today_expense_by_category
│  ├─ bahan: amount
│  ├─ operasional: amount
│  └─ peralatan: amount
└─ expenses table query (for detail list) ← Include description, amount, date
   Filtered by: outlet_id, date = today, category

CUMULATIVE:
├─ cumulative_expense_by_category
│  ├─ bahan: amount
│  ├─ operasional: amount
│  └─ peralatan: amount
└─ (NO detail list for cumulative)
```

### **Detail Structure - Hari Ini Mode ONLY**

**Bahan Detail (when expanded):**
```
Bahan: Rp 300,000 [▼ Detail]
├─ Telur (10kg): Rp 50,000     [10 Juni 2024]
├─ Roti (5kg): Rp 100,000      [10 Juni 2024]
├─ Mentega: Rp 150,000         [10 Juni 2024]
└─ [▲ Hide Detail]
```

**Operasional Detail (when expanded):**
```
Operasional: Rp 500,000 [▼ Detail]
├─ Gaji Karyawan: Rp 200,000   [10 Juni 2024]
├─ Listrik: Rp 150,000         [10 Juni 2024]
├─ Gas: Rp 100,000             [10 Juni 2024]
├─ Misc: Rp 50,000             [10 Juni 2024]
└─ [▲ Hide Detail]
```

**Peralatan Detail (when expanded):**
```
Peralatan: Rp 2,000,000 [▼ Detail]
├─ Kompor 2 Burner: Rp 1,500,000  [10 Juni 2024]
├─ Mixer: Rp 500,000              [10 Juni 2024]
└─ [▲ Hide Detail]
```

**Total Mode - NO Detail:**
```
Bahan: Rp 50,000,000 (NO expandable)
Operasional: Rp 100,000,000 (NO expandable)
Peralatan: Rp 20,000,000 (NO expandable)
```

### **Detail Data Retrieval**

```typescript
// For Hari Ini mode - query expenses for today
const { data: todayExpenses } = await supabase.from('expenses')
  .select('description, amount, date, category')
  .eq('outlet_id', outletId)
  .eq('date', today)
  .order('created_at', { ascending: false });

// Format for display
const expensesByCategory = {
  bahan: todayExpenses.filter(e => e.category === 'bahan'),
  operasional: todayExpenses.filter(e => e.category === 'operasional'),
  peralatan: todayExpenses.filter(e => e.category === 'peralatan')
};
```

---

## 🔧 Implementation Details

### **Toggle Button Component**

```typescript
// Location: Right side of "Dashboard" header
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">Dashboard</h1>
    <p className="text-gray-600">Selamat datang kembali!</p>
  </div>
  
  <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
    <button
      onClick={() => setTimeFilter('today')}
      className={`px-4 py-2 rounded ${
        timeFilter === 'today'
          ? 'bg-blue-600 text-white'
          : 'bg-transparent text-gray-600'
      }`}
    >
      📊 Hari Ini
    </button>
    <button
      onClick={() => setTimeFilter('cumulative')}
      className={`px-4 py-2 rounded ${
        timeFilter === 'cumulative'
          ? 'bg-blue-600 text-white'
          : 'bg-transparent text-gray-600'
      }`}
    >
      📈 Total
    </button>
  </div>
</div>
```

### **Collapse/Expand Toggle**

```typescript
// Per section component
const [expanded, setExpanded] = useState(false); // Default collapsed

<Card
  className="cursor-pointer hover:shadow-md"
  onClick={() => setExpanded(!expanded)}
>
  <CardHeader>
    <div className="flex justify-between items-center">
      <CardTitle>Offline: Rp {amount.toLocaleString()}</CardTitle>
      <span>{expanded ? '▲' : '▼'} Detail</span>
    </div>
  </CardHeader>
  
  {expanded && (
    <CardContent>
      {/* Detail content */}
    </CardContent>
  )}
</Card>
```

### **Timestamp Format**

```typescript
// Using date formatter
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
};

// Display
<span className="text-xs text-gray-500">[{formatDate('2024-06-10')}]</span>
// Output: [10 Juni 2024]
```

---

## 📝 Files to Modify

1. **src/app/api/dashboard/route.ts**
   - Add: `today_total_items_sold`, `cumulative_total_items_sold`
   - Add: `cumulative_cash_inflow`, `cumulative_cash_outflow` (if missing)
   - Already has: expense detail data, payment methods breakdown

2. **src/app/dashboard/dashboard/page.tsx**
   - Add global `timeFilter` state
   - Add toggle button component
   - Update Section 1 (replace Top Product)
   - Update Section 3 (add expandable details)
   - Update Section 4 (use toggle)
   - Update Section 5 (add expandable details for Hari Ini)

3. **src/components/dashboard/** (create new if needed)
   - ChannelDetailCard (expandable channel breakdown)
   - ExpenseDetailCard (expandable expense breakdown)

---

## ✅ Checklist

- [ ] Global toggle state management
- [ ] Toggle button UI (sebelah judul)
- [ ] Section 1: Add Jumlah Item Terjual card
- [ ] Section 3: Add expandable details (Offline, ShopeeFood, GoFood)
- [ ] Section 3: Payment method breakdown for Offline
- [ ] Section 4: Make toggle-aware
- [ ] Section 5: Add expandable details for Hari Ini only
- [ ] API: Add total_items_sold fields (if missing)
- [ ] API: Add cumulative cash flow fields (if missing)
- [ ] Timestamp formatting: [10 Juni 2024]
- [ ] Default state: All details collapsed
- [ ] Test toggle functionality across all sections

---

## 🚀 Ready for Implementation

Semua requirement sudah didocument. Siap untuk mulai coding! ✅
