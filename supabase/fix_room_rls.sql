-- ==============================================================================
-- FIX: Missing Room Data for Tenants
-- Issue: The original RLS policy only allowed viewing rooms with status='available'.
--        This caused tenants not to see their own room info because it is 'occupied'.
-- Solution: Allow all authenticated users (tenants, admins) to view ALL rooms.
-- ==============================================================================

-- 1. (Optional) Check existing policies on rooms table
-- SELECT * FROM pg_policies WHERE tablename = 'rooms';

-- 2. Add new policy for authenticated users
CREATE POLICY "Authenticated users can view all rooms" 
ON "public"."rooms" 
FOR SELECT 
TO authenticated 
USING (true);

-- Note: Policies are additive (OR logic). 
-- This will work alongside the existing "Anyone can view available rooms" policy.
