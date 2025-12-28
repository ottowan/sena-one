-- Reset Meter History Only
-- This script deletes only water/electricity meter history data
-- Keeps: All other data intact (users, rooms, contracts, invoices, etc.)

-- Delete all meter history records
DELETE FROM history_meter;

-- Or use TRUNCATE for faster deletion
-- TRUNCATE TABLE history_meter;

-- Success message
SELECT 'Meter history reset completed! (history_meter table cleared)' as message;
