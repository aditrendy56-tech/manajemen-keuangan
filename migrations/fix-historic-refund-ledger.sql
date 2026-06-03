-- Migration: Fix stale historical refund ledger row
-- Date: 2026-05-29

-- One historical sale_refund row was recorded one day early and skews the 2026-05-28 report.
-- Keep this correction narrow and idempotent so it only affects the known bad row.
UPDATE cash_transactions
SET transaction_date = '2026-05-29'
WHERE source_type = 'sale_refund'
  AND source_id = '39e7946d-23d2-4f14-b3ab-65dbe8aa2f85'
  AND transaction_date = '2026-05-28';