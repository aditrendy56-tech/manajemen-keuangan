# 🔧 Setup Instructions - No Outlets Available

If you see the error **"Tidak ada outlet tersedia. Jalankan seed atau pilih outlet yang valid di database."**, follow these steps:

## ✅ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"+ New query"**

### Step 2: Run Setup Script
1. Open file: `database/seed-complete-setup.sql`
2. Copy ALL the content
3. Paste into Supabase SQL Editor
4. Click **"Run"** button

### Step 3: Verify Success
You should see output showing:
- ✅ Businesses: 1
- ✅ Outlets: 1  
- ✅ Outlet Settings: 1
- ✅ Setup complete!

### Step 4: Reload App
1. Go back to your app
2. Press `F5` or `Cmd+R` to refresh
3. Done! 🎉

---

## 📋 What This Script Does

The script automatically:
1. ✅ Creates `businesses` table (if missing)
2. ✅ Creates `outlets` table (if missing)
3. ✅ Creates `outlet_settings` table (if missing)
4. ✅ Inserts a default Business: "Roti Bakar Business"
5. ✅ Inserts a default Outlet: "Outlet Utama" in Jakarta
6. ✅ Links outlet settings automatically

## 🔄 Safe to Run Multiple Times
The script uses `INSERT ... WHERE NOT EXISTS` so it won't create duplicates if you run it again.

---

## ❓ Still Getting Error?

### Check Browser Console
1. Press `F12` to open DevTools
2. Go to **Console** tab
3. Look for error messages about outlets

### Common Issues

**Issue: "Table 'outlets' doesn't exist"**
- Solution: You might be missing database migrations
- Run all migration files first: `migrations/*.sql`

**Issue: "Permission denied"**
- Solution: Check your Supabase RLS policies
- Run: `ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;`

### Need Help?
1. Check app logs in browser Console (`F12`)
2. Check Supabase server logs
3. Verify outlet_id is returned from `/api/outlets` endpoint

---

## 📝 Manual Alternative (if script fails)

If the script doesn't work, run these individually in Supabase SQL Editor:

```sql
-- 1. Create business
INSERT INTO businesses (name) VALUES ('Roti Bakar Business');

-- 2. Get business ID
SELECT id FROM businesses WHERE name = 'Roti Bakar Business' LIMIT 1;

-- 3. Use the ID from step 2 and create outlet (replace BUSINESS_ID):
INSERT INTO outlets (business_id, name, location, is_active) 
VALUES ('BUSINESS_ID', 'Outlet Utama', 'Jakarta', true);
```

Then reload the app.
