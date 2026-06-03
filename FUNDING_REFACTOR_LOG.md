# Unified Funding Source System - Implementation Log

## Overview
Refactored funding/investor system to unify management of both owner (internal) and investor (external) capital sources. All capital contributions now flow through a single "Sumber Dana" (Funding Source) interface.

## Changes Made

### 1. Database Schema (`database/migration-unified-funding-source.sql`)
**Added columns to `investors` table:**
- `source_type` (VARCHAR 50, DEFAULT 'investor'): Distinguishes 'owner' from 'investor' sources
- `notes` (TEXT): Optional notes for each funding source
- Created index on `(outlet_id, source_type)` for faster filtering

**Data migration:**
- All existing investor entries automatically set to `source_type = 'investor'`
- New entries can use 'owner' for internal owner contributions

### 2. Type Definitions (`src/types/index.ts`)
**Updated `Investor` interface:**
```typescript
export interface Investor {
  id: string;
  outlet_id: string;
  name: string;
  phone?: string;
  initial_contribution: number;
  remaining_balance: number;
  status: 'active' | 'settled' | 'partial';
  source_type?: 'owner' | 'investor';      // NEW
  priority_order?: number;
  notes?: string;                           // NEW
  created_at: string;
}
```

### 3. API Updates (`src/app/api/investors/route.ts`)
**POST endpoint:**
- Now accepts `source_type` and `notes` fields
- Defaults `source_type` to 'investor' if not provided

**PUT endpoint:**
- Now accepts `source_type` and `notes` for updates

### 4. UI Components

#### Halaman Sumber Dana (`src/app/(dashboard)/investors/page.tsx`)
**Renamed from:** Manajemen Investor  
**Purpose:** Unified management of funding sources

**Features:**
- **Type Picker:** Select between 👤 Owner (internal) and 🤝 Investor (external)
- **Input Fields:** Name, phone, initial contribution, notes
- **Summary Cards:**
  - Total funding sources count
  - Total owner contribution (blue)
  - Total investor contribution (purple)
  - Grand total
- **List View:**
  - Each source shows type badge
  - Progress bar for repayment status
  - Edit/delete buttons
  - Shows phone and notes if available

#### Funding/Modal Tab (`src/app/(dashboard)/funding/page.tsx` - Tab1)
**Before:** Hardcoded choice between owner_personal vs investor  
**After:** Dynamic dropdown from Sumber Dana list

**Features:**
- **Dropdown Selection:** All sources (owner + investor) in one list
- **Info Card:** Shows selected source details (type, name, phone, notes)
- **Auto-fill:** Form auto-populates source_type and investor_id
- **Enhanced Table:** Added notes column to capital entry history
- **Badges:** Type badges (👤 Owner vs 🤝 Investor) in table

#### Sumber Dana Tab (Tab2)
**Before:** Had separate form to add investors  
**After:** Referral/info tab

**Features:**
- Blue info card directing users to Sumber Dana page
- Read-only view of registered sources
- Shows invested amount vs remaining balance per source

#### Repayment Tab (`Tab4`)
**Enhancement:**
- Dropdown now shows source type badges (👤 Owner vs 🤝 Investor)
- Better visual distinction between internal and external sources
- Info card shows source type clearly

### 5. Data Flow

```
Sumber Dana Page (investors)
    ↓ User inputs owner/investor data
    ↓ API POST /api/investors
    ↓ Stores in investors table (with source_type, notes)
    ↓
Modal Tab (Tab1)
    ↓ User selects sumber dana from dropdown
    ↓ Selects amount to invest
    ↓ API POST /api/capital
    ↓ Creates capital_entries with investor_id, source_type
    ↓
Repayment Tab (Tab4)
    ↓ User selects sumber dana from dropdown
    ↓ Records pembayaran balik
    ↓ API POST /api/capital-repayments
    ↓ Updates remaining_balance, status
    ↓ Links back to same source_id (no data split)
```

## Database Setup Required

Run this migration in Supabase SQL Editor:
```sql
-- File: database/migration-unified-funding-source.sql
ALTER TABLE investors ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'investor';
ALTER TABLE investors ADD COLUMN IF NOT EXISTS notes TEXT;
UPDATE investors SET source_type = 'investor' WHERE source_type IS NULL;
CREATE INDEX IF NOT EXISTS idx_investors_source_type ON investors(outlet_id, source_type);
```

## Testing Checklist

- [ ] Sumber Dana page loads without errors
- [ ] Can add owner type source
- [ ] Can add investor type source
- [ ] Can edit source details
- [ ] Can delete source (button works)
- [ ] Modal tab dropdown shows all sources with badges
- [ ] Modal entry auto-fills source_type correctly
- [ ] Modal entry history shows type badges
- [ ] Repayment tab dropdown shows all sources
- [ ] Repayment records correctly update balance
- [ ] End-to-end: owner → modal → repayment flow works

## Files Modified

1. `database/migration-unified-funding-source.sql` - NEW
2. `src/types/index.ts` - Updated Investor interface
3. `src/app/api/investors/route.ts` - POST/PUT handlers updated
4. `src/app/(dashboard)/investors/page.tsx` - Complete rewrite (→ Sumber Dana)
5. `src/app/(dashboard)/funding/page.tsx` - Tab1, Tab2, Tab4 updated

## Files Not Modified (Already Complete)

- `src/app/api/investors/[id]/route.ts` - DELETE endpoint exists
- `src/app/api/capital-repayments/route.ts` - All fields supported
- `src/app/api/capital/route.ts` - Already handles investor_id, source_type

## Known Limitations / Future Work

- Delete endpoint works but no cascade delete for related capital_entries
- No validation to prevent deleting source if active entries exist
- No edit history/audit trail for source changes
- Could add: source status history, linked capital entries view per source

## Backward Compatibility

- Existing investor records continue to work (defaulted to source_type='investor')
- No breaking changes to capital_entries or capital_repayments tables
- All existing APIs continue to function
