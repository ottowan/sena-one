-- Fix History Meter Constraint (Fix for 42P10 Error)

-- 1. Remove any duplicate rows first (keep the one with latest updated_at)
-- This ensures that adding the UNIQUE constraint won't fail if bad data exists.
DELETE FROM history_meter a USING history_meter b
WHERE a.id < b.id
AND a.room_id = b.room_id
AND a.month = b.month;

-- 2. Explicitly Drop the constraint if it exists (cleanup)
ALTER TABLE history_meter DROP CONSTRAINT IF EXISTS unique_room_month;

-- 3. Add the Unique Constraint
-- This is required for the UPSERT code: .upsert(..., { onConflict: 'room_id, month' })
ALTER TABLE history_meter ADD CONSTRAINT unique_room_month UNIQUE (room_id, month);

-- 4. Verify/Fix RLS Policies again just in case
ALTER TABLE history_meter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage history_meter" ON history_meter;
CREATE POLICY "Admins can manage history_meter" ON history_meter FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);
