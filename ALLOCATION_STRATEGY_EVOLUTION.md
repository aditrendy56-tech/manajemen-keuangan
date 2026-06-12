# 📊 Alokasi Dana Strategy Evolution Plan

**Status:** Strategic Planning Document  
**Created:** 2026-06-12  
**Owner:** Product & Finance Team  
**Last Updated:** 2026-06-12

---

## 📋 Executive Summary

Sistem **Phase 1-4** yang kami bangun menggunakan **60-40 percentage split** untuk alokasi dana. Ini cocok untuk **MVP & early stage** (0-3 bulan), tapi **tidak sustainable** untuk long-term scalable business.

**Dokumen ini** outline evolusi strategy dari percentage-based menuju **actual costing system** yang professional dan tax-compliant.

---

## 🔴 Current State: Phase 1-4 (Percentage-Based)

### What We Have
```
Monthly Revenue Split:
├── 60% → Kas Utama (operational fund)
│   ├── Bahan baku
│   ├── Utilities (listrik, air, gas)
│   ├── Packaging
│   ├── Transport
│   └── Maintenance
│
└── 40% → Alokasi Laba (profit allocation)
    ├── Balik Modal (cicilan investor)
    ├── Ekspansi Fund
    └── Bagi Hasil (keuntungan)
```

### Why It Works for MVP
✅ Simple & easy to understand  
✅ Fast to implement  
✅ Provides initial structure  
✅ Learning phase untuk team  

### Why It's Not Sustainable

**Problem 1: Static Allocation ≠ Actual Reality**
- HPP per produk 40-50% dari harga jual
- Allocation 60% kas → **over-allocation**
- Excess kas idle, tidak efisien

**Problem 2: Margin Distortion**
```
Example: Blueberry Roti Bakar
Harga jual:     Rp 18,000
HPP:             Rp 7,000 (39%)
Margin actual:   Rp 11,000 (61%)

Sistem 60-40:
├── Operational 60% = Rp 10,800 ❌ Over-allocated
└── Profit 40% = Rp 7,200 ❌ Under-allocated (actual: 61%)
```

**Problem 3: Accounting & Tax Issues**
- Laporan keuangan tidak match dengan realitas
- Audit susah untuk reconcile
- Tax reporting jadi kompleks & problematic
- Not professional for scaling business

**Problem 4: As Business Grows, Problem Gets Worse**
- Alat & maintenance cost = ONE TIME purchase
- Operating cost (bahan) = stable, predictable
- 60% allocation for "operational" menjadi buffer besar yang ga terpakai
- Cash flow jadi inefficient

---

## ✅ Future State: Phase 5+ (Activity-Based Costing)

### Timeline & Phases

#### **Phase 1-4: MVP Validation** ✅ NOW
- Duration: 0-3 bulan
- System: 60-40 percentage split
- Focus: Learn, validate, stabilize
- Output: Real business data

#### **Phase 5: Data Collection & Analysis** (Month 3)
- Duration: 3-6 bulan
- System: Actual cost tracking (Excel + simple logging)
- Focus: Collect real expenditure data
- Output: Identify cost patterns

#### **Phase 6: Hybrid Costing** (Month 6)
- Duration: 6-9 bulan
- System: Blend percentage + actual tracking
- Focus: Monitor variance, optimize
- Output: Optimal allocation % (45-55? 50-50?)

#### **Phase 7: Full Actual Costing** (Month 9+)
- Duration: 9+ bulan (ongoing)
- System: Activity-based costing framework
- Focus: Professional accounting, tax compliance
- Output: Professional financial reporting

---

## 📊 Phase 5: Detailed Actual Costing Strategy

### Cost Categories Tracking

```
Monthly Actual Operational Costs:

1. BAHAN BAKU (Raw Materials)
   ├── Blueberry
   ├── Coklat
   ├── Custom orders
   └── Sub-total: ?

2. UTILITIES
   ├── Listrik
   ├── Air
   ├── Gas
   └── Sub-total: ?

3. PACKAGING & SUPPLIES
   ├── Box/wrapper
   ├── Label
   ├── Tape/string
   └── Sub-total: ?

4. MAINTENANCE & REPAIRS
   ├── Kompor service
   ├── Wadah replacement
   ├── Tools
   └── Sub-total: ?

5. TRANSPORT & DELIVERY
   ├── Pickup bahan
   ├── Delivery order
   └── Sub-total: ?

6. CONTINGENCY (5-10%)
   ├── Unexpected costs
   └── Safety buffer: ?

TOTAL ACTUAL OPERATIONAL: Rp X per bulan
```

### Expected Pattern (Hypothesis)

Based on current business model:
- **Actual operational**: Rp 6-7 juta/bulan
- **Current 60% allocation**: Rp 12-14 juta/bulan ← Over by 40-50%
- **Actual profit margin**: 50-60% (not 40%)

### Data Collection (Start Now!)

**Week 1: Create Simple Tracking**
```
Create spreadsheet with columns:
- Date
- Category (bahan/utilities/maintenance/etc)
- Item
- Qty/Amount
- Cost
- Notes

Daily log (minimal 5 min/hari)
```

**Month 1-3: Build Pattern**
- Log every expense
- Categorize carefully
- Keep receipts/photos
- Ask supplier for pricing

**Month 3: Analyze**
- Sum per category
- Find trends
- Identify outliers
- Calculate actual operational cost

---

## 🔧 Phase 6: Hybrid Costing System

### Algorithm Change

**Current (Phase 1-4):**
```typescript
operationalAllocation = revenue * 0.60
profitAllocation = revenue * 0.40
```

**Hybrid (Phase 6):**
```typescript
actualOperationalCost = {
  bahanBaku: tracked_value,
  utilities: tracked_value,
  packaging: tracked_value,
  maintenance: tracked_value,
  transport: tracked_value,
  contingency: tracked_value * 1.05  // 5% buffer
}

allocatedToOperational = GREATEST(
  actualOperationalCost,
  revenue * 0.50  // minimum 50% if costs spike
)

allocatedToProfit = revenue - allocatedToOperational
```

### Benefits
✅ Uses real data, not assumptions  
✅ Adapts to actual cost changes  
✅ Maintains safety buffer  
✅ More accurate profit prediction  

---

## 📈 Phase 7: Full Professional Accounting

### Structure

```
PROFIT & LOSS STATEMENT (Monthly)

Revenue:
├── Sales Offline: Rp X
├── Sales Online: Rp X
└── Total Revenue: Rp Y

Cost of Goods Sold (COGS):
├── Bahan Baku: Rp X
├── Packaging: Rp Y
└── Direct Labor: Rp Z
└── Sub-total COGS: Rp (X+Y+Z)

Gross Profit = Revenue - COGS

Operating Expenses:
├── Utilities: Rp X
├── Transport: Rp Y
├── Maintenance: Rp Z
└── Rent (if any): Rp A
└── Sub-total OpEx: Rp (X+Y+Z+A)

Operating Income = Gross Profit - OpEx

Other Items:
├── Interest Expense (hutang cicilan)
├── Depreciation (alat)
└── Sub-total: Rp X

NET PROFIT = Operating Income - Other Items
```

### Cost Centers
```
Cost Center Analysis:
├── Product Line
│   ├── Blueberry: margin %, cost structure
│   ├── Coklat: margin %, cost structure
│   └── Custom: margin %, cost structure
│
├── Outlet Performance
│   ├── Outlet A: revenue, cost, profit
│   └── Outlet B: revenue, cost, profit
│
└── Expense Tracking
    ├── Variance Analysis (actual vs budget)
    └── Trend Analysis
```

---

## 🎯 Implementation Roadmap

| Phase | Timeline | System | Key Actions | Deliverable |
|-------|----------|--------|------------|-------------|
| **1-4** | 0-3mo | 60-40 % | Execute Phase 1-4 to Supabase, Train team | MVP system live |
| **5** | 3-6mo | Tracking | Daily cost logging, Pattern analysis | Actual cost baseline |
| **6** | 6-9mo | Hybrid | Adjust allocation %, Monitor variance | Optimized allocation |
| **7** | 9+mo | Costing | Professional P&L, Cost centers | Tax-ready reporting |

---

## 💼 Success Criteria per Phase

### Phase 1-4
- ✅ System deployed & stable
- ✅ Team trained on usage
- ✅ 0 TypeScript errors
- ✅ Data flowing correctly

### Phase 5
- ✅ 90% expense tracking accuracy
- ✅ Monthly cost patterns identified
- ✅ Actual operational cost baseline established
- ✅ Variance from 60% allocation documented

### Phase 6
- ✅ Allocation % optimized (target: 45-55% operational)
- ✅ Hybrid algorithm tested & verified
- ✅ Profit forecast improved by 20%+
- ✅ System adjusts automatically per month

### Phase 7
- ✅ Monthly P&L generated automatically
- ✅ Cost center analysis available
- ✅ Tax reporting-ready format
- ✅ Audit trail complete

---

## 📋 Action Items (NOW)

### This Week
- [ ] Execute Phase 3 migration (karyawan) to Supabase
- [ ] Execute Phase 4 migration (repayment) to Supabase
- [ ] Test flow: Modal → Alokasi → Pembayaran
- [ ] Train team on system usage

### This Week (Parallel)
- [ ] Create expense tracking spreadsheet (Excel template)
- [ ] Start daily cost logging
- [ ] Keep receipts/photos of purchases
- [ ] Ask suppliers for standard pricing

### Month 1-3
- [ ] Log all expenses consistently
- [ ] Weekly review for data quality
- [ ] Build confidence with team
- [ ] Document any anomalies

### Month 3
- [ ] Analyze 3-month data
- [ ] Calculate actual operational cost
- [ ] Identify cost patterns per product
- [ ] Present findings to stakeholders

### Month 6
- [ ] Design Phase 6 hybrid system
- [ ] Adjust allocation logic
- [ ] Deploy to Supabase
- [ ] Test & validate

### Month 9+
- [ ] Build Phase 7 accounting system
- [ ] Generate professional reports
- [ ] Prepare for tax filing
- [ ] Continuous optimization

---

## 🤝 Stakeholder Agreement

**This document represents agreement that:**

1. ✅ Phase 1-4 (60-40) is **temporary MVP approach**, not permanent
2. ✅ We will track **actual costs** starting immediately
3. ✅ After 3-6 months, we will **optimize allocation** based on real data
4. ✅ Goal is to reach **professional, scalable system** by month 9+
5. ✅ System is designed for **long-term sustainable growth**

---

## 📞 Questions & Clarifications

**Q: Why not optimize allocation now?**  
A: We don't have enough real data yet. Optimizing blind could be worse.

**Q: Will Phase 5 require expensive tools?**  
A: No. Excel + discipline is sufficient for 3-6 months.

**Q: Can we skip Phase 6 and go straight to Phase 7?**  
A: Possible but risky. Phase 6 validates assumptions before building Phase 7.

**Q: What if actual cost is less than 60%?**  
A: Good news! More profit to allocate. System adapts automatically in Phase 6.

**Q: What about tax implications?**  
A: Phase 7 addresses this. Until then, track correctly for later reconciliation.

---

## 📄 Document History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-06-12 | 1.0 | Initial draft | System |
| TBD | 1.1 | Post-Month 3 review | TBD |
| TBD | 2.0 | Phase 6 design | TBD |

---

## 🎯 Vision

```
Phase 1-4 (MVP)
     ↓
    Learn & Validate
     ↓
Phase 5-6 (Optimize)
     ↓
    Data-Driven Decisions
     ↓
Phase 7+ (Professional)
     ↓
    Scalable, Tax-Ready, Enterprise-Grade
```

**Timeline: 9-12 months dari hari ini (2026-06-12)** untuk mencapai professional system.

**By end of 2026:** Sistem siap untuk scaling & tax compliance.

---

**Status: APPROVED & ACTIVE**

Dokumen ini menjadi **strategic north star** untuk semua keputusan alokasi dana ke depan.
