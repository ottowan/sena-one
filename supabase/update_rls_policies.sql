-- ============================================
-- Update RLS Policies to use custom users table
-- ============================================

-- This script updates all RLS policies to work with custom users table
-- instead of auth.uid()

-- Drop old policies that depend on auth.uid()
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage rooms" ON rooms;
DROP POLICY IF EXISTS "Tenants can view own data" ON tenants;
DROP POLICY IF EXISTS "Admins can manage tenants" ON tenants;
DROP POLICY IF EXISTS "Tenants can view own contracts" ON contracts;
DROP POLICY IF EXISTS "Admins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Tenants can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Tenants can view own deposits" ON deposits;
DROP POLICY IF EXISTS "Admins can manage deposits" ON deposits;
DROP POLICY IF EXISTS "Tenants can view own requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Admins can manage requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage bookings" ON bookings;
DROP POLICY IF EXISTS "Anyone can view available rooms" ON rooms;
DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;

-- Helper function to get current user ID from session
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        (current_setting('app.current_user_id', true))::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = get_current_user_id() 
        AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Profiles policies (keep for backward compatibility)
CREATE POLICY "Users can view own profile" ON profiles 
    FOR SELECT USING (id = get_current_user_id());
    
CREATE POLICY "Users can update own profile" ON profiles 
    FOR UPDATE USING (id = get_current_user_id());
    
CREATE POLICY "Admins can view all profiles" ON profiles 
    FOR SELECT USING (is_admin());

-- Rooms policies
CREATE POLICY "Anyone can view available rooms" ON rooms 
    FOR SELECT USING (status = 'available');
    
CREATE POLICY "Admins can manage rooms" ON rooms 
    FOR ALL USING (is_admin());

-- Tenants policies
CREATE POLICY "Tenants can view own data" ON tenants 
    FOR SELECT USING (user_id = get_current_user_id());
    
CREATE POLICY "Admins can manage tenants" ON tenants 
    FOR ALL USING (is_admin());

-- Contracts policies
CREATE POLICY "Tenants can view own contracts" ON contracts 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = contracts.tenant_id 
            AND user_id = get_current_user_id()
        )
    );
    
CREATE POLICY "Admins can manage contracts" ON contracts 
    FOR ALL USING (is_admin());

-- Invoices policies
CREATE POLICY "Tenants can view own invoices" ON invoices 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = invoices.tenant_id 
            AND user_id = get_current_user_id()
        )
    );
    
CREATE POLICY "Admins can manage invoices" ON invoices 
    FOR ALL USING (is_admin());

-- Payments policies
CREATE POLICY "Admins can manage payments" ON payments 
    FOR ALL USING (is_admin());

-- Deposits policies
CREATE POLICY "Tenants can view own deposits" ON deposits 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = deposits.tenant_id 
            AND user_id = get_current_user_id()
        )
    );
    
CREATE POLICY "Admins can manage deposits" ON deposits 
    FOR ALL USING (is_admin());

-- Maintenance requests policies
CREATE POLICY "Tenants can view own requests" ON maintenance_requests 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = maintenance_requests.tenant_id 
            AND user_id = get_current_user_id()
        )
    );
    
CREATE POLICY "Tenants can create requests" ON maintenance_requests 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenants 
            WHERE id = tenant_id 
            AND user_id = get_current_user_id()
        )
    );
    
CREATE POLICY "Admins can manage requests" ON maintenance_requests 
    FOR ALL USING (is_admin());

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications 
    FOR SELECT USING (user_id = get_current_user_id());
    
CREATE POLICY "Users can update own notifications" ON notifications 
    FOR UPDATE USING (user_id = get_current_user_id());

-- Bookings policies
CREATE POLICY "Anyone can create bookings" ON bookings 
    FOR INSERT WITH CHECK (true);
    
CREATE POLICY "Admins can manage bookings" ON bookings 
    FOR ALL USING (is_admin());
