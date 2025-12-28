-- Test data สำหรับทดสอบ login ด้วยเบอร์โทรศัพท์

-- ตัวอย่างข้อมูลสำหรับทดสอบ (ใส่ใน profiles table)
-- หลังจากรัน migration แล้ว

-- ตัวอย่างการสร้าง user ใหม่ที่สามารถ login ด้วยเบอร์โทรได้
INSERT INTO profiles (id, email, full_name, phone, role) VALUES 
(gen_random_uuid(), 'test@example.com', 'ผู้ใช้ทดสอบ', '0812345678', 'tenant')
ON CONFLICT (phone) DO NOTHING;

-- หมายเหตุ:
-- 1. ต้องรัน migration ใน add_email_and_unique_phone.sql ก่อน
-- 2. ผู้ใช้ต้องสมัครผ่านหน้า Register ปกติก่อน เพื่อให้มี auth.users record
-- 3. หลังจากนั้นจึงจะสามารถ login ด้วยเบอร์โทรได้

-- วิธีการทดสอบ:
-- 1. สมัครสมาชิกใหม่ผ่านหน้า Register
-- 2. ใส่ email, password, ชื่อ, และเบอร์โทร
-- 3. หลังจากสมัครแล้ว ให้ออกจากระบบ
-- 4. ทดสอบ login ด้วยเบอร์โทรที่สมัครไว้