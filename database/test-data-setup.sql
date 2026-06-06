-- ========================================
-- TEST DATA SETUP for Smoke Testing
-- Date: 2026-06-07
-- Note: Data marked with "TEST_" prefix untuk mudah dihapus nanti
-- ========================================

-- STEP 0: Verify outlet exists (use demo outlet)
-- Expected outlet_id: 660e8400-e29b-41d4-a716-446655440000

-- ========================================
-- STEP 1: Create test investors (3 owners: Rendy, Arya, Damim)
-- ========================================

INSERT INTO investors (outlet_id, source_type, name, phone, status, total_balance, remaining_balance, priority_order, notes)
VALUES 
  ('660e8400-e29b-41d4-a716-446655440000', 'owner', 'TEST_Rendy', '081234567890', 'partial', 1500000, 750000, 1, 'Test owner 1 untuk smoke testing'),
  ('660e8400-e29b-41d4-a716-446655440000', 'owner', 'TEST_Arya', '082345678901', 'partial', 1000000, 500000, 2, 'Test owner 2 untuk smoke testing'),
  ('660e8400-e29b-41d4-a716-446655440000', 'owner', 'TEST_Damim', '083456789012', 'active', 800000, 800000, 3, 'Test owner 3 untuk smoke testing')
ON CONFLICT DO NOTHING;

-- Verify investors created
SELECT id, name, total_balance FROM investors WHERE name LIKE 'TEST_%' AND outlet_id = '660e8400-e29b-41d4-a716-446655440000';

-- ========================================
-- STEP 2: Create test capital entries (Modal Masuk from each investor)
-- ========================================

-- Get investor IDs
-- Use these IDs from previous SELECT results to populate capital_entries

-- Example (replace UUIDs with actual from previous SELECT):
-- INSERT INTO capital_entries (outlet_id, investor_id, date, amount, notes)
-- VALUES 
--   ('660e8400-e29b-41d4-a716-446655440000', 'RENDY_ID', '2026-06-07', 1500000, 'TEST: Rendy inject modal'),
--   ('660e8400-e29b-41d4-a716-446655440000', 'ARYA_ID', '2026-06-07', 1000000, 'TEST: Arya inject modal'),
--   ('660e8400-e29b-41d4-a716-446655440000', 'DAMIM_ID', '2026-06-07', 800000, 'TEST: Damim inject modal');

-- ========================================
-- STEP 3: Create test expenses with funding source
-- ========================================

-- First, get session for today
-- INSERT INTO expenses (session_id, outlet_id, date, category, description, amount, funding_source, funded_by_investor_id, payment_method, payment_status)
-- VALUES 
--   ('SESSION_ID', '660e8400-e29b-41d4-a716-446655440000', '2026-06-07', 'operasional', 'TEST: Bayar listrik dari kas', 150000, 'kas', NULL, 'cash', 'paid'),
--   ('SESSION_ID', '660e8400-e29b-41d4-a716-446655440000', '2026-06-07', 'bahan', 'TEST: Beli tepung dari modal Rendy', 250000, 'modal', 'RENDY_ID', 'cash', 'paid'),
--   ('SESSION_ID', '660e8400-e29b-41d4-a716-446655440000', '2026-06-07', 'peralatan', 'TEST: Beli kompor dari modal Damim', 500000, 'modal', 'DAMIM_ID', 'cash', 'paid');

-- ========================================
-- STEP 4: Verify test data
-- ========================================

SELECT 
  name as "Investor", 
  total_balance as "Total Modal", 
  remaining_balance as "Sisa Modal"
FROM investors 
WHERE name LIKE 'TEST_%' 
  AND outlet_id = '660e8400-e29b-41d4-a716-446655440000'
ORDER BY priority_order;

SELECT 
  date,
  category,
  description,
  amount,
  funding_source,
  payment_status
FROM expenses
WHERE description LIKE 'TEST:%'
  AND outlet_id = '660e8400-e29b-41d4-a716-446655440000'
ORDER BY date DESC;

-- ========================================
-- NOTES FOR MANUAL INSERTION
-- ========================================
/*
UNTUK SMOKE TESTING, LAKUKAN DENGAN UI:

1. Go to Funding → "📥 Modal Masuk" tab
   - Buat 3 investor: TEST_Rendy, TEST_Arya, TEST_Damim
   - (atau jalankan INSERT di STEP 1 terlebih dahulu)

2. Go to Dashboard → Expenses
   - Input 3 expenses dengan kombinasi:
     a) Operasional dari Kas (listrik, air, dll)
     b) Bahan dari Modal Investor 1
     c) Peralatan dari Modal Investor 2
   - Lihat form menampilkan funding_source dropdown & investor selector

3. Go to Dashboard → Dashboard
   - Check: "💸 Pengeluaran per Kategori" = 3 cards (Bahan, Operasional, Peralatan)
   - Check metrics: cash_from_modal, cash_from_sales, expense_from_kas, expense_from_modal

4. Go to Funding → "💰 Alokasi Laba"
   - Check: Profit auto-calculated dari metrics
   - Formula visible: Penjualan - Operasional = Profit
   - Settlement priority guide visible

5. Go to Funding → "📤 Pembayaran"
   - Dropdown shows investors dengan capital
   - Smart guidance works (green for lunas, yellow for cicil)
   - Cicil: sisa modal field appears
   - Data saved with repayment_type & remaining_modal

6. After smoke testing → RUN CLEANUP SCRIPT
*/

-- ========================================
-- CLEANUP SCRIPT (run after testing)
-- ========================================

/*
-- Delete test data (in order to respect FKs)
DELETE FROM capital_repayments 
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE name LIKE 'TEST_%' 
    AND outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);

DELETE FROM capital_entries
WHERE investor_id IN (
  SELECT id FROM investors 
  WHERE name LIKE 'TEST_%' 
    AND outlet_id = '660e8400-e29b-41d4-a716-446655440000'
);

DELETE FROM expenses
WHERE (description LIKE 'TEST:%' OR description LIKE 'TEST_%')
  AND outlet_id = '660e8400-e29b-41d4-a716-446655440000';

DELETE FROM investors 
WHERE name LIKE 'TEST_%' 
  AND outlet_id = '660e8400-e29b-41d4-a716-446655440000';

-- Verify cleanup
SELECT COUNT(*) as remaining_test_investors FROM investors WHERE name LIKE 'TEST_%';
SELECT COUNT(*) as remaining_test_expenses FROM expenses WHERE description LIKE 'TEST:%' OR description LIKE 'TEST_%';

-- Expected: all 0
*/
