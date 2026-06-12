#!/usr/bin/env python3
import os
from supabase import create_client, Client

url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
key = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

supabase = create_client(url, key)

# Get investors
inv_res = supabase.table('investors').select('id, name, source_type').execute()
print('=== INVESTORS ===')
for inv in inv_res.data:
    print(f"{inv['id']}: {inv['name']} ({inv['source_type']})")

# Get capital_entries
cap_res = supabase.table('capital_entries').select('*').execute()
print('\n=== CAPITAL ENTRIES ===')
for cap in cap_res.data:
    print(f"investor: {cap['investor_id']}, amount: {cap['amount']}")

# Get financial_accounts
fin_res = supabase.table('financial_accounts').select('outlet_id, kas_utama_balance').execute()
print('\n=== FINANCIAL ACCOUNTS ===')
for fin in fin_res.data:
    print(f"outlet: {fin['outlet_id']}, kas_utama: {fin['kas_utama_balance']}")
