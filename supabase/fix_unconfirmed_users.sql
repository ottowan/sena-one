-- Fix existing unconfirmed users - แก้ไขปัญหา "Email not confirmed"
-- รันไฟล์นี้ใน Supabase SQL Editor ทันที

-- *** รันคำสั่งนี้เพื่อแก้ปัญหาทันที ***
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL;

-- หรือแก้ไขเฉพาะ users ที่มี @senaone.local
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW(),
--     updated_at = NOW()
-- WHERE email LIKE '%@senaone.local' 
-- AND email_confirmed_at IS NULL;

-- 3. ตรวจสอบผลลัพธ์
SELECT 
    id,
    email,
    phone,
    email_confirmed_at,
    created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;