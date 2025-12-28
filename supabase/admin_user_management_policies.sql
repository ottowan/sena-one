-- เพิ่ม RLS policies สำหรับให้ admin จัดการผู้ใช้ได้
-- Date: 2025-12-16

-- Policy สำหรับให้ admin สามารถ insert profiles ของผู้อื่นได้
CREATE POLICY "Admins can insert profiles" ON profiles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy สำหรับให้ admin สามารถ update profiles ของผู้อื่นได้
CREATE POLICY "Admins can update all profiles" ON profiles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Policy สำหรับให้ admin สามารถ delete profiles ของผู้อื่นได้
CREATE POLICY "Admins can delete profiles" ON profiles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- ตรวจสอบ policies ที่มีอยู่
SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'profiles';