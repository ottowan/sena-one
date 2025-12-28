# แก้ไขปัญหา Email Confirmation ในระบบไม่ใช้ Email

## ปัญหา
ผู้ใช้ login ไม่สำเร็จเนื่องจาก email ไม่ได้รับการ confirm แต่ระบบไม่ใช้ email แล้ว

## วิธีแก้ไข

### 1. รัน Migration Files
```sql
-- 1. รันไฟล์นี้ก่อน (ถ้ายังไม่ได้รัน)
supabase/phone_only_system.sql

-- 2. รันไฟล์นี้เพื่อแก้ไข users ที่มีอยู่
supabase/fix_unconfirmed_users.sql
```

### 2. ตรวจสอบ Supabase Auth Settings
ไปที่ Supabase Dashboard > Authentication > Settings:
- **Confirm email**: ปิด (disable) หรือเปิดแต่ใช้กับ domain จริงเท่านั้น
- **Enable email confirmations**: ปิด

### 3. ตรวจสอบผู้ใช้ที่มีปัญหา
```sql
-- ดู users ที่ยังไม่ confirmed
SELECT 
    u.id, u.email, u.email_confirmed_at, 
    p.phone, p.full_name 
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email_confirmed_at IS NULL;
```

### 4. แก้ไขผู้ใช้เฉพาะรายที่มีปัญหา
```sql
-- แก้ไขผู้ใช้รายเดียว (แทนที่ user_id)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE id = 'user_id_here';
```

## การป้องกันในอนาคต
- ระบบใหม่จะ auto-confirm users ที่มี email ลงท้ายด้วย `@senaone.local`
- Trigger จะทำงานอัตโนมัติเมื่อสร้าง user ใหม่
- ไม่ต้องกังวลเรื่อง email confirmation อีกต่อไป

## หมายเหตุ
- ไฟล์ SQL บางส่วนต้องรันด้วย service role key
- ถ้ายังมีปัญหาให้ตรวจสอบ Supabase Auth settings
- ระบบใหม่จะไม่มีปัญหานี้อีก