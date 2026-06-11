-- Seed financial_accounts dengan data dari capital_entries yang sudah ada
-- Run ini setelah migration-dual-bucket-system-v2.sql

-- Insert financial_accounts untuk setiap outlet yang punya capital_entries tapi belum ada financial_accounts
INSERT INTO financial_accounts (
  outlet_id,
  kas_utama_balance,
  profit_pending_balance,
  simpan_uang_balance,
  created_at,
  updated_at
)
SELECT 
  ce.outlet_id,
  COALESCE(SUM(ce.amount), 0) as kas_utama_balance,
  0 as profit_pending_balance,
  0 as simpan_uang_balance,
  NOW() as created_at,
  NOW() as updated_at
FROM capital_entries ce
WHERE NOT EXISTS (
  SELECT 1 FROM financial_accounts fa 
  WHERE fa.outlet_id = ce.outlet_id
)
GROUP BY ce.outlet_id
ON CONFLICT (outlet_id) DO NOTHING;

-- Verify hasilnya
SELECT 
  fa.outlet_id,
  fa.kas_utama_balance,
  fa.profit_pending_balance,
  fa.simpan_uang_balance,
  fa.created_at,
  fa.updated_at
FROM financial_accounts fa
ORDER BY fa.created_at DESC;
