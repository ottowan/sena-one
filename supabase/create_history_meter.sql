-- Create History Meter Table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_history_meter_room_id ON history_meter(room_id);
CREATE INDEX IF NOT EXISTS idx_history_meter_month ON history_meter(month);

-- Enable RLS
ALTER TABLE history_meter ENABLE ROW LEVEL SECURITY;

-- Policies

-- Admins can do everything
CREATE POLICY "Admins can manage history_meter" ON history_meter FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Tenants can view their own room's history (optional, but good for transparency)
-- Complex because we need to check if they had a contract for that room at that time, or currently.
-- For now, let's just allow reading if they currently rent the room.
CREATE POLICY "Tenants can view own room history" ON history_meter FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM contracts 
        WHERE contracts.room_id = history_meter.room_id 
        AND contracts.tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
        AND contracts.status = 'active'
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_history_meter_updated_at BEFORE UPDATE ON history_meter
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
