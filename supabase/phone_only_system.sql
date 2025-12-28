-- Migration: Update profiles table for phone-only system
-- Date: 2025-12-16

-- เพิ่มฟิลด์สำหรับระบบที่ไม่ใช้ email
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE;

-- ทำให้ phone เป็น NOT NULL และ UNIQUE
ALTER TABLE profiles 
ALTER COLUMN phone SET NOT NULL;

-- เพิ่ม constraint ให้ phone เป็น unique (ถ้ายังไม่มี)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_phone' 
        AND table_name = 'profiles'
    ) THEN
        ALTER TABLE profiles ADD CONSTRAINT unique_phone UNIQUE (phone);
    END IF;
END $$;

-- สร้าง index สำหรับ phone (ถ้ายังไม่มี)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Update existing profiles ที่ไม่มี phone ให้มีค่า dummy
UPDATE profiles 
SET phone = '000000000' || id::text 
WHERE phone IS NULL OR phone = '';

-- สร้าง function สำหรับ validate phone format
CREATE OR REPLACE FUNCTION validate_phone_format(phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- ตรวจสอบว่าเป็นเบอร์โทรไทย (เริ่มด้วย 0 และมี 10 หลัก)
    RETURN phone_number ~ '^0[0-9]{9}$';
END;
$$ LANGUAGE plpgsql;

-- Auto-confirm ผู้ใช้ที่มีอยู่แล้วทั้งหมด
-- หมายเหตุ: ต้องรันด้วย service role key เท่านั้น
UPDATE auth.users SET email_confirmed_at = NOW() WHERE email_confirmed_at IS NULL;

-- สร้าง trigger function เพื่อ auto-confirm user ใหม่
CREATE OR REPLACE FUNCTION public.handle_new_user_auto_confirm()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto confirm email สำหรับ user ใหม่ที่ email ลงท้ายด้วย @senaone.local
    IF NEW.email LIKE '%@senaone.local' AND NEW.email_confirmed_at IS NULL THEN
        UPDATE auth.users 
        SET email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- สร้าง trigger เพื่อเรียกใช้ function
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_auto_confirm
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user_auto_confirm();