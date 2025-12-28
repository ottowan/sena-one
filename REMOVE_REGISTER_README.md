# การปรับแก้ระบบผู้ใช้งาน - ลบหน้าสมัครสมาชิก

## สิ่งที่เปลี่ยนแปลง

### 1. ลบหน้าสมัครสมาชิก (RegisterPage)
- ลบไฟล์ `src/pages/auth/RegisterPage.tsx`
- ลบ route `/register` จาก `App.tsx`
- ลบลิงก์สมัครสมาชิกจากหน้า login

### 2. ปรับแก้หน้า LoginPage
- เปลี่ยนข้อความจาก "ยังไม่มีบัญชี? สมัครสมาชิก" 
- เป็น "ติดต่อผู้ดูแลระบบเพื่อสร้างบัญชีผู้ใช้"

### 3. ระบบจัดการผู้ใช้ใน Admin
- ใช้หน้า `UserManagementPage` สำหรับเพิ่มผู้ใช้ใหม่
- Admin สามารถสร้าง/แก้ไข/ลบผู้ใช้ได้
- รองรับการสร้างผู้ใช้พร้อมกำหนด role ได้เลย

### 4. Database Policies
- เพิ่ม RLS policies ให้ admin สามารถจัดการ profiles ของผู้อื่นได้
- รองรับการ insert, update, delete profiles โดย admin

### 5. ปรับแก้ AuthContext
- ลบฟังก์ชัน `signUp` (ไม่จำเป็นแล้ว)
- คงฟังก์ชัน `signIn` ที่รองรับ login ด้วยเบอร์โทร

### 6. Types
- ลบ `RegisterFormData` interface
- ปรับ `LoginFormData` ให้ใช้ `emailOrPhone`

## การติดตั้ง

### 1. รัน Database Migrations
```sql
-- 1. รันไฟล์นี้ก่อน (ถ้ายังไม่ได้รัน)
supabase/add_email_and_unique_phone.sql

-- 2. รันไฟล์นี้เพื่อเพิ่ม policies สำหรับ admin
supabase/admin_user_management_policies.sql
```

### 2. ตรวจสอบ Admin User
ให้แน่ใจว่ามีผู้ใช้ที่มี role = 'admin' อยู่ในระบบ:
```sql
-- ตรวจสอบ admin users
SELECT * FROM profiles WHERE role = 'admin';

-- สร้าง admin user ถ้าไม่มี (แทนที่ด้วยข้อมูลจริง)
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
```

## วิธีการใช้งาน

### สำหรับ Admin:
1. เข้าสู่ระบบด้วยบัญชี admin
2. ไปที่เมนู "จัดการสิทธิ์ผู้ใช้"
3. คลิก "เพิ่มผู้ใช้ใหม่"
4. กรอกข้อมูล: อีเมล, รหัสผ่าน, ชื่อ, เบอร์โทร, บทบาท
5. บันทึกข้อมูล

### สำหรับผู้ใช้ใหม่:
1. รอให้ admin สร้างบัญชีให้
2. ใช้อีเมลหรือเบอร์โทรที่ admin ให้มา login
3. ใช้รหัสผ่านที่ admin กำหนดให้

## ข้อดี
- ความปลอดภัยสูงขึ้น (ไม่มีการสมัครสมาชิกสาธารณะ)
- Admin ควบคุมผู้ใช้ได้ทั้งหมด
- สามารถกำหนด role ได้ตั้งแต่เริ่มต้น
- ลดข้อมูลขยะจากการสมัครสมาชิกผิด

## หมายเหตุ
- ผู้ใช้ไม่สามารถสมัครสมาชิกเองได้อีกต่อไป
- ต้องมี admin อย่างน้อย 1 คนในระบบ
- การรีเซ็ตรหัสผ่านยังคงทำได้ผ่าน email