-- Fix History Meter Table and Policies

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS history_meter (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Format: YYYY-MM
    water_meter NUMERIC(10, 2) DEFAULT 0,
    electricity_meter NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_room_month UNIQUE (room_id, month)
);

-- 2. Ensure Indexes Exist
CREATE INDEX IF NOT EXISTS idx_history_meter_room_id ON history_meter(room_id);
CREATE INDEX IF NOT EXISTS idx_history_meter_month ON history_meter(month);

-- 3. Enable RLS
ALTER TABLE history_meter ENABLE ROW LEVEL SECURITY;

-- 4. Drop Existing Policies (to avoid "policy already exists" error)
DROP POLICY IF EXISTS "Admins can manage history_meter" ON history_meter;
DROP POLICY IF EXISTS "Tenants can view own room history" ON history_meter;

-- 5. Re-create Policies
CREATE POLICY "Admins can manage history_meter" ON history_meter FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

CREATE POLICY "Tenants can view own room history" ON history_meter FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM contracts 
        WHERE contracts.room_id = history_meter.room_id 
        AND contracts.tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
        AND contracts.status = 'active'
    )
);

-- 6. Trigger for updated_at (Drop and Recreate to be safe)
DROP TRIGGER IF EXISTS update_history_meter_updated_at ON history_meter;
CREATE TRIGGER update_history_meter_updated_at BEFORE UPDATE ON history_meter
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
