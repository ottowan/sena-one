-- Reset Database Script
-- This script will delete all transactional data but keep structure and settings
-- USE WITH CAUTION! This will delete all data.

-- Delete in order of dependencies (child tables first)

-- 1. Delete payment transactions
DELETE FROM payments;

-- 2. Delete invoices
DELETE FROM invoices;

-- 3. Delete maintenance requests
DELETE FROM maintenance_requests;

-- 4. Delete meter history
DELETE FROM history_meter;

-- 5. Delete contracts
DELETE FROM contracts;

-- 6. Delete tenants
DELETE FROM tenants;

-- 7. Delete rooms (optional - uncomment if you want to reset rooms too)
-- DELETE FROM rooms;

-- 8. Delete profiles (optional - uncomment if you want to reset all users)
-- DELETE FROM profiles WHERE role != 'admin'; -- Keep admin users
-- Or delete all profiles:
-- DELETE FROM profiles;

-- 9. Reset rent rates (optional - uncomment if you want to reset settings)
-- DELETE FROM rent_rates;

-- Success message
SELECT 'Database reset completed successfully!' as message;
