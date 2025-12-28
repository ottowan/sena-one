-- Migration: Add email field to profiles and make phone unique
-- Date: 2025-12-16

-- เพิ่มฟิลด์ email ใน profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- สร้าง unique constraint สำหรับ phone (ถ้ายังไม่มี)
ALTER TABLE profiles ADD CONSTRAINT unique_phone UNIQUE (phone);

-- สร้าง index สำหรับ email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- สร้าง index สำหรับ phone
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- Function เพื่ออัพเดท email ใน profiles เมื่อมีการสร้าง user ใหม่
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'tenant');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger เพื่อเรียกใช้ function เมื่อมี user ใหม่
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- อัพเดท email ที่มีอยู่แล้วจาก auth.users (ถ้ามี)
UPDATE profiles 
SET email = auth_users.email
FROM auth.users auth_users
WHERE profiles.id = auth_users.id 
AND profiles.email IS NULL;