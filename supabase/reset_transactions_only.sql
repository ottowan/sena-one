-- Reset Transactions Only
-- This script deletes only transactional data (invoices, payments, maintenance, meters)
-- Keeps: Users, Profiles, Tenants, Rooms, Contracts, Settings

-- Delete in order of dependencies

-- 1. Delete payment transactions
DELETE FROM payments;

-- 2. Delete invoices
DELETE FROM invoices;

-- 3. Delete maintenance requests
DELETE FROM maintenance_requests;

-- 4. Delete meter history
DELETE FROM history_meter;

-- Success message
SELECT 'Transactional data reset completed! (Invoices, Payments, Maintenance, Meters deleted)' as message;
