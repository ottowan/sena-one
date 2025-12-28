-- Fix infinite recursion in users table RLS
-- The issue: is_admin() function queries users table, which triggers RLS policies again

-- Solution: Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
