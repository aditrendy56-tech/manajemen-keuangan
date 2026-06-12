import os
from supabase import create_client
import json

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ SUPABASE_URL or SUPABASE_KEY not set")
    exit(1)

client = create_client(url, key)

# Check 1: capital_repayments table
print("=" * 80)
print("1️⃣  CEK TABEL capital_repayments")
print("=" * 80)
try:
    result = client.table("capital_repayments").select("*").limit(1).execute()
    print("✅ Tabel capital_repayments EXIST")
    print(f"   Jumlah record: {len(result.data)}")
    if result.data:
        print(f"   Sample record: {json.dumps(result.data[0], indent=2, default=str)}")
except Exception as e:
    print(f"❌ Tabel capital_repayments TIDAK ADA")
    print(f"   Error: {str(e)}")

# Check 2: Check outlet_id di semua table
print("\n" + "=" * 80)
print("2️⃣  CEK outlet_id DI SEMUA TABLE")
print("=" * 80)

tables = [
    "capital_entries",
    "financial_accounts",
    "cash_transactions",
    "profit_allocations",
    "capital_repayments"
]

for table_name in tables:
    try:
        result = client.table(table_name).select("*").limit(1).execute()
        if result.data:
            record = result.data[0]
            has_outlet_id = "outlet_id" in record
            status = "✅" if has_outlet_id else "❌"
            print(f"{status} {table_name:30} - outlet_id: {has_outlet_id}")
            if has_outlet_id:
                print(f"     Sample outlet_id: {record.get('outlet_id')}")
        else:
            print(f"⚠️  {table_name:30} - No data (empty table)")
    except Exception as e:
        print(f"❌ {table_name:30} - {str(e)}")

# Check 3: Check columns untuk Phase 2
print("\n" + "=" * 80)
print("3️⃣  CEK KOLOM UNTUK PHASE 2")
print("=" * 80)

# capital_entries: perlu outlet_id, investor_id, amount, date
print("\n📋 capital_entries columns:")
try:
    result = client.table("capital_entries").select("*").limit(1).execute()
    if result.data:
        cols = list(result.data[0].keys())
        needed = ["outlet_id", "investor_id", "amount", "date"]
        for col in needed:
            status = "✅" if col in cols else "❌"
            print(f"  {status} {col}")
except Exception as e:
    print(f"  Error: {e}")

# financial_accounts: perlu outlet_id, account_type, balance
print("\n📋 financial_accounts columns:")
try:
    result = client.table("financial_accounts").select("*").limit(1).execute()
    if result.data:
        cols = list(result.data[0].keys())
        needed = ["outlet_id", "account_type"]
        for col in needed:
            status = "✅" if col in cols else "❌"
            print(f"  {status} {col}")
        balance_cols = [c for c in cols if 'balance' in c]
        print(f"  📊 Balance columns found: {balance_cols}")
except Exception as e:
    print(f"  Error: {e}")

# cash_transactions: perlu outlet_id, source, purpose, amount, date
print("\n📋 cash_transactions columns:")
try:
    result = client.table("cash_transactions").select("*").limit(1).execute()
    if result.data:
        cols = list(result.data[0].keys())
        needed = ["outlet_id", "source", "purpose", "amount", "date", "type"]
        for col in needed:
            status = "✅" if col in cols else "⚠️"
            print(f"  {status} {col}")
except Exception as e:
    print(f"  Error: {e}")

# profit_allocations: perlu outlet_id, investor_id, amount, allocation_month
print("\n📋 profit_allocations columns:")
try:
    result = client.table("profit_allocations").select("*").limit(1).execute()
    if result.data:
        cols = list(result.data[0].keys())
        needed = ["outlet_id", "investor_id", "amount", "allocation_month"]
        for col in needed:
            status = "✅" if col in cols else "❌"
            print(f"  {status} {col}")
except Exception as e:
    print(f"  Error: {e}")

# Check 4: Data summary
print("\n" + "=" * 80)
print("4️⃣  DATA SUMMARY")
print("=" * 80)

try:
    ce = client.table("capital_entries").select("count", count="exact").execute()
    print(f"📊 capital_entries:     {ce.count} records")
except:
    print(f"📊 capital_entries:     ? records")

try:
    fa = client.table("financial_accounts").select("count", count="exact").execute()
    print(f"📊 financial_accounts:  {fa.count} records")
except:
    print(f"📊 financial_accounts:  ? records")

try:
    ct = client.table("cash_transactions").select("count", count="exact").execute()
    print(f"📊 cash_transactions:   {ct.count} records")
except:
    print(f"📊 cash_transactions:   ? records")

try:
    pa = client.table("profit_allocations").select("count", count="exact").execute()
    print(f"📊 profit_allocations:  {pa.count} records")
except:
    print(f"📊 profit_allocations:  ? records")

try:
    cr = client.table("capital_repayments").select("count", count="exact").execute()
    print(f"📊 capital_repayments:  {cr.count} records")
except:
    print(f"📊 capital_repayments:  ? records (TABLE MIGHT NOT EXIST)")
