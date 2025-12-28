-- Complete Reset Database Script
-- This script will delete ALL data including rooms and settings
-- USE WITH EXTREME CAUTION! This will delete EVERYTHING except table structures.

-- Delete in order of dependencies (child tables first)

-- 1. Delete payment transactions
TRUNCATE TABLE payments CASCADE;

-- 2. Delete invoices
TRUNCATE TABLE invoices CASCADE;

-- 3. Delete maintenance requests
TRUNCATE TABLE maintenance_requests CASCADE;

-- 4. Delete meter history
TRUNCATE TABLE history_meter CASCADE;

-- 5. Delete contracts
TRUNCATE TABLE contracts CASCADE;

-- 6. Delete tenants
TRUNCATE TABLE tenants CASCADE;

-- 7. Delete rooms
TRUNCATE TABLE rooms CASCADE;

-- 8. Delete rent rates
TRUNCATE TABLE rent_rates CASCADE;

-- 9. Delete profiles (keeps auth users, but removes profile data)
TRUNCATE TABLE profiles CASCADE;

-- Note: This will NOT delete auth.users table (managed by Supabase Auth)
-- To delete auth users, you need to do it through Supabase Dashboard or Auth Admin API

-- Success message
SELECT 'Complete database reset successful! All data deleted.' as message;
