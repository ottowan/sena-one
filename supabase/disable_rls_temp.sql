-- ============================================
-- Fix RLS for Custom Authentication
-- ============================================

-- Create function to temporarily disable RLS for admin queries
-- This is a workaround since we can't set session variables from client

-- Option 1: Create views that bypass RLS for common queries
CREATE OR REPLACE VIEW admin_tenants_view AS
SELECT * FROM tenants;

CREATE OR REPLACE VIEW admin_rooms_view AS
SELECT * FROM rooms;

-- Grant access to views
GRANT SELECT ON admin_tenants_view TO anon, authenticated;
GRANT SELECT ON admin_rooms_view TO anon, authenticated;

-- Option 2: Temporarily disable RLS on tenants table
-- WARNING: This makes data accessible to everyone
-- Only use if you trust your anon key is not exposed
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE deposits DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;

-- Note: This is a temporary fix. For production, you should:
-- 1. Use Supabase Edge Functions to handle auth
-- 2. Or implement proper JWT-based authentication
-- 3. Or use service role key on backend
