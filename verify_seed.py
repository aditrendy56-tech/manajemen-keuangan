#!/usr/bin/env python3
import os
import sys
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("❌ SUPABASE_URL or SUPABASE_KEY not set")
    sys.exit(1)

client = create_client(url, key)

print("=" * 80)
print("PHASE B SEED DATA VERIFICATION")
print("=" * 80)

# Check 1: periods
try:
    result = client.table("periods").select("*").execute()
    print(f"\n✅ periods: {len(result.data)} records")
    if result.data:
        for period in result.data:
            print(f"   - Period {period['period_month']}: {period['period_start_date']} to {period['period_end_date']} (locked={period['is_locked']})")
except Exception as e:
    print(f"❌ periods: {str(e)}")

# Check 2: allocation_rules
try:
    result = client.table("allocation_rules").select("*").execute()
    print(f"\n✅ allocation_rules: {len(result.data)} records")
    if result.data:
        for rule in result.data:
            print(f"   - Outlet {rule['outlet_id']}: {rule['kas_utama_percent']}% / {rule['profit_pending_percent']}% (current={rule['is_current']})")
except Exception as e:
    print(f"❌ allocation_rules: {str(e)}")

# Check 3: daily_sessions with period_id
try:
    result = client.table("daily_sessions").select("*").eq("period_id", "is.not.null").execute()
    print(f"\n✅ daily_sessions with period_id: {len(result.data)} records")
    if result.data:
        for session in result.data[:3]:
            print(f"   - Session {session['id']}: outlet={session['outlet_id']}, period_id={session['period_id']}")
except Exception as e:
    print(f"❌ daily_sessions with period_id: {str(e)}")

# Check 4: Get outlet ID
try:
    result = client.table("daily_sessions").select("outlet_id").limit(1).execute()
    if result.data:
        outlet_id = result.data[0]['outlet_id']
        print(f"\n✅ Sample outlet_id: {outlet_id}")
except Exception as e:
    print(f"❌ outlets: {str(e)}")

print("\n" + "=" * 80)
