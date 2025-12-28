-- ============================================
-- Custom Users Table (Replace Supabase Auth)
-- ============================================

-- Create custom users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'tenant',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster phone lookup
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view own data" ON users 
    FOR SELECT USING (id = (current_setting('app.current_user_id', true))::uuid);

CREATE POLICY "Admins can view all users" ON users 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (current_setting('app.current_user_id', true))::uuid 
            AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can manage users" ON users 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = (current_setting('app.current_user_id', true))::uuid 
            AND role IN ('admin', 'owner')
        )
    );

-- Function to hash password (using pgcrypto extension)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to verify password
CREATE OR REPLACE FUNCTION verify_password(phone_input TEXT, password_input TEXT)
RETURNS TABLE(user_id UUID, user_phone TEXT, user_name TEXT, user_role user_role) AS $$
BEGIN
    RETURN QUERY
    SELECT id, phone, full_name, role
    FROM users
    WHERE phone = phone_input 
    AND password_hash = crypt(password_input, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user with hashed password
CREATE OR REPLACE FUNCTION create_user(
    phone_input TEXT,
    password_input TEXT,
    full_name_input TEXT,
    role_input user_role DEFAULT 'tenant'
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO users (phone, password_hash, full_name, role)
    VALUES (
        phone_input,
        crypt(password_input, gen_salt('bf')),
        full_name_input,
        role_input
    )
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO users (phone, password_hash, full_name, role)
VALUES (
    '0000000000',
    crypt('admin123', gen_salt('bf')),
    'ผู้ดูแลระบบ',
    'admin'
)
ON CONFLICT (phone) DO NOTHING;

-- ============================================
-- DATA MIGRATION from profiles table
-- ============================================

-- Migrate existing users from profiles to users table
-- Default password will be set to phone number (user can change later)
INSERT INTO users (id, phone, password_hash, full_name, role, created_at, updated_at)
SELECT 
    id,
    COALESCE(phone, '0000000000') as phone,
    crypt(COALESCE(phone, '0000000000'), gen_salt('bf')) as password_hash,
    full_name,
    role,
    created_at,
    updated_at
FROM profiles
WHERE phone IS NOT NULL
ON CONFLICT (phone) DO NOTHING;

-- Note: After running this migration:
-- 1. All existing users can login with their phone number as both username and password
-- 2. Users should change their password after first login
-- 3. Update all RLS policies that use auth.uid() to use current_setting('app.current_user_id')
-- 4. Update frontend to set user_id in session after login
