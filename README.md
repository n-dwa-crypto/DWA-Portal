# DWA Admin Portal

A professional-grade dashboard for managing crypto market intelligence and global sanction lists.

## 🚀 Supabase Integration Setup

To enable the Global Cloud Feed and Unified Audit Log, you must set up a Supabase project:

### 1. Create the Master Table
Run this SQL in your Supabase SQL Editor:
```sql
CREATE TABLE dwa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- 'NEWS' or 'SANCTION'
  content text NOT NULL,
  intelligence jsonb,
  created_at timestamptz DEFAULT now()
);

-- Master Access Policies
ALTER TABLE dwa_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON dwa_records FOR SELECT USING (true);
CREATE POLICY "Allow admin write" ON dwa_records FOR INSERT WITH CHECK (true);
```

### 2. Configure API Keys
Update `services/supabase.ts`:
- Set `DEFAULT_URL` to your project URL.
- Set `DEFAULT_ANON_KEY` to your **Publishable Key**.

### 3. Admin Access
To publish intelligence to the cloud, go to the Admin Portal in the app and:
1. Input your **Secret Key** (Service Role) to link your node.
2. Input your **Gemini API Key** to enable neural analysis.

## 🔒 Security Note
This portal uses a dual-key architecture. The **Publishable Key** allows global read-only access. The **Secret Key** grants write permissions. **Never** hardcode your Secret Key in the source code.