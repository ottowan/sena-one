# การปรับแก้ระบบ Login ให้รองรับเบอร์โทรศัพท์

## สิ่งที่เปลี่ยนแปลง

### 1. Database Schema
- เพิ่มฟิลด์ `email` ใน `profiles` table
- เพิ่ม unique constraint สำหรับฟิลด์ `phone`
- เพิ่ม indexes สำหรับ `email` และ `phone`
- เพิ่ม trigger เพื่ออัพเดท email อัตโนมัติเมื่อสร้าง user ใหม่

### 2. AuthContext (`src/contexts/AuthContext.tsx`)
- ปรับแก้ `signIn` function ให้รองรับทั้ง email และเบอร์โทรศัพท์
- เปลี่ยนพารามิเตอร์จาก `email` เป็น `emailOrPhone`
- เพิ่มการตรวจสอบและค้นหา email จากเบอร์โทรศัพท์
- อัพเดท `signUp` function ให้บันทึก email ใน profiles table

### 3. LoginPage (`src/pages/auth/LoginPage.tsx`)
- เปลี่ยน label จาก "อีเมล" เป็น "อีเมลหรือเบอร์โทรศัพท์"
- อัพเดท placeholder ให้แสดงตัวอย่างทั้ง email และเบอร์โทร
- เปลี่ยน input type จาก "email" เป็น "text"

### 4. Types (`src/types/index.ts`)
- เพิ่มฟิลด์ `email` ใน Profile interface

## วิธีการติดตั้ง

### 1. รัน Migration
```bash
# เข้าไปใน Supabase SQL Editor และรันไฟล์นี้
supabase/add_email_and_unique_phone.sql
```

### 2. ทดสอบระบบ
1. สร้างผู้ใช้ใหม่ผ่านหน้า Register
2. ใส่ข้อมูลครบถ้วน รวมถึงเบอร์โทรศัพท์
3. ออกจากระบบ
4. ทดสอบ login ด้วยเบอร์โทรศัพท์

## วิธีการใช้งาน

### การ Login
ผู้ใช้สามารถ login ได้ 2 วิธี:
1. **ด้วย Email**: `user@example.com`
2. **ด้วยเบอร์โทร**: `0812345678`

### ตัวอย่าง
- Email: `john@example.com` + password
- เบอร์โทร: `0812345678` + password

## หมายเหตุ
- เบอร์โทรศัพท์ต้องไม่ซ้ำกันในระบบ (unique)
- ระบบจะตรวจสอบว่าเป็น email หรือเบอร์โทรจากการมี @ หรือไม่
- ผู้ใช้เก่าที่มีอยู่แล้วจะถูกอัพเดท email อัตโนมัติ
- การสมัครสมาชิกยังคงใช้ email เป็นหลัก แต่จะเก็บเบอร์โทรด้วย

## Error Handling
- ถ้าไม่พบเบอร์โทรในระบบ จะแสดง "ไม่พบเบอร์โทรศัพท์นี้ในระบบ"
- ถ้า password ไม่ถูกต้อง จะแสดงข้อผิดพลาดตามปกติ
- ถ้ามีปัญหาในการเข้าถึงข้อมูล จะแสดงข้อผิดพลาดที่เหมาะสม