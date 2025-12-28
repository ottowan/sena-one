-- ============================================
-- Add Username Login (Room Number Format)
-- ============================================

-- Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for faster username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Drop old verify_password function before recreating with new parameters
DROP FUNCTION IF EXISTS verify_password(text, text);

-- Update verify_password function to support both phone and username
CREATE OR REPLACE FUNCTION verify_password(login_input TEXT, password_input TEXT)
RETURNS TABLE(user_id UUID, user_phone TEXT, user_name TEXT, user_role user_role) AS $$
BEGIN
    RETURN QUERY
    SELECT id, phone, full_name, role
    FROM users
    WHERE (username = login_input OR phone = login_input)
    AND password_hash = crypt(password_input, password_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_user function to include username
CREATE OR REPLACE FUNCTION create_user(
    username_input TEXT,
    password_input TEXT,
    full_name_input TEXT,
    role_input user_role DEFAULT 'tenant',
    phone_input TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    INSERT INTO users (username, phone, password_hash, full_name, role)
    VALUES (
        username_input,
        phone_input,
        crypt(password_input, gen_salt('bf')),
        full_name_input,
        role_input
    )
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Generate usernames from room numbers
-- ============================================

-- Update existing users with username based on their room
-- Format: sena + room_number (e.g., sena301)
UPDATE users u
SET username = 'sena' || r.room_number
FROM tenants t
JOIN contracts c ON c.tenant_id = t.id AND c.status = 'active'
JOIN rooms r ON r.id = c.room_id
WHERE u.id = t.user_id
AND u.username IS NULL;

-- Set default password 'sena1@soi14' for all users who still have phone as password
UPDATE users
SET password_hash = crypt('sena1@soi14', gen_salt('bf'))
WHERE username IS NOT NULL;

-- Update admin username
UPDATE users
SET username = 'admin'
WHERE phone = '0000000000' AND username IS NULL;

-- Note: After running this migration:
-- 1. Users can login with: username (e.g., sena301) / password (sena1@soi14)
-- 2. Admin can login with: admin / admin123
-- 3. Users should change their password after first login
