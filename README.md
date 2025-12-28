# Sena-One - ระบบจัดการหอพัก

ระบบจัดการหอพักแบบครบวงจร สร้างด้วย React + TypeScript + Chakra UI v3 + Supabase

## ✨ Features

### 🔐 ระบบผู้ใช้

- ระบบ Authentication (Login/Register)
- จัดการ Role: Admin, Owner, Tenant
- Protected Routes ตาม Role

### 👨‍💼 ฟีเจอร์สำหรับ Admin/Owner

- **Dashboard**: ภาพรวมสถิติห้องพัก, รายได้, ค้างชำระ
- **จัดการห้องพัก**: เพิ่ม/ลบ/แก้ไข ห้องพัก, อัปโหลดรูปภาพ
- **จัดการผู้เช่า**: ลงทะเบียนผู้เช่า, ประวัติการชำระเงิน
- **สัญญาเช่า**: สร้าง/ต่อ/ยกเลิก สัญญา
- **จัดการมิเตอร์**: บันทึกมิเตอร์น้ำ-ไฟ ย้อนหลังและตรวจสอบความผิดปกติ
- **การเงิน**: ออกบิล, บันทึกการชำระเงิน, จัดการเงินประกัน, พิมพ์ใบเสร็จ/ใบแจ้งหนี้
- **แจ้งซ่อม**: รับแจ้งซ่อม, อัปเดตสถานะ, แนบรูปภาพ
- **รายงาน**: รายงานรายได้, ห้องว่าง, การใช้น้ำ-ไฟ, Export Excel

### 🏠 ฟีเจอร์สำหรับผู้เช่า (Tenant Portal)

- ดูประวัติบิลและการชำระเงิน
- ดาวน์โหลดใบเสร็จ
- แจ้งซ่อมและติดตามสถานะ
- จองห้องออนไลน์
- ดูข้อมูลสัญญาเช่า

## 🚀 การติดตั้ง

### 1. Clone โปรเจค

```bash
cd d:\workspace\sena1
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Supabase

#### 3.1 สร้าง Supabase Project

1. ไปที่ [https://supabase.com](https://supabase.com)
2. สร้าง Project ใหม่
3. คัดลอก `Project URL` และ `anon public key`

#### 3.2 ตั้งค่า Environment Variables

สร้างไฟล์ `.env` และใส่ค่าดังนี้:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### 3.3 สร้าง Database Schema

1. ไปที่ Supabase Dashboard > SQL Editor
2. คัดลอกเนื้อหาจากไฟล์ `supabase/schema.sql`
3. รัน SQL script

#### 3.4 สร้าง Storage Buckets

ไปที่ Supabase Dashboard > Storage และสร้าง buckets ดังนี้:

- `room-images` (Public)
- `documents` (Private)
- `receipts` (Private)
- `id-cards` (Private)
- `maintenance-images` (Public)

### 4. รันโปรเจค

```bash
npm run dev
```

เปิดเบราว์เซอร์ที่ `http://localhost:5173`

## 📁 โครงสร้างโปรเจค

```
sena1/
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # Layout components (AdminLayout, TenantLayout)
│   │   ├── ui/             # Chakra UI snippets
│   │   ├── reports/        # Report components (Financial, Utilities)
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # React Context (AuthContext)
│   ├── lib/                # Utilities
│   │   ├── supabase.ts    # Supabase client
│   │   └── utils.ts       # Helper functions
│   ├── pages/              # Pages
│   │   ├── auth/          # Login, Register
│   │   ├── admin/         # Admin pages (Dashboard, Meters, Reports, etc.)
│   ├── services/           # API Services (invoice, report, maintenance, etc.)
│   ├── theme/              # Chakra UI theme
│   ├── types/              # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── schema.sql          # Database schema
├── .env                    # Environment variables
└── package.json
```

## 🎨 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Chakra UI v3
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Routing**: React Router v6
- **State Management**: React Query + Context API
- **Form Handling**: React Hook Form + Zod
- **Icons**: Lucide React
- **Fonts**: Inter (Google Fonts)
- **Data Export**: XLSX

## 📝 การใช้งาน

### สร้างผู้ใช้ Admin แรก

1. สมัครสมาชิกผ่านหน้า Register
2. เลือก Role เป็น "ผู้ดูแลระบบ"
3. ยืนยันอีเมล (ถ้า Supabase ตั้งค่าให้ยืนยัน)
4. Login เข้าสู่ระบบ

### เพิ่มห้องพัก

1. ไปที่ "จัดการห้องพัก"
2. คลิก "เพิ่มห้องพัก"
3. กรอกข้อมูลห้อง (หมายเลขห้อง, ประเภท, ราคา, ฯลฯ)
4. อัปโหลดรูปภาพห้อง
5. บันทึก

### เพิ่มผู้เช่า

1. ไปที่ "จัดการผู้เช่า"
2. คลิก "เพิ่มผู้เช่า"
3. กรอกข้อมูลผู้เช่า
4. อัปโหลดสำเนาบัตรประชาชน
5. บันทึก

### จัดการมิเตอร์ (ใหม่!)

1. ไปที่ "จัดการมิเตอร์"
2. เลือกเดือนที่ต้องการบันทึก
3. ระบบจะแสดงรายการห้องและมิเตอร์ครั้งก่อนหน้า
4. กรอกเลขมิเตอร์ปัจจุบันและบันทึก

### รายงาน (ใหม่!)

1. ไปที่ "รายงานและสถิติ"
2. เลือกดูภาพรวม, รายงานการเงิน, หรือ รายงานสาธารณูปโภค
3. กดปุ่ม Export Excel เพื่อดาวน์โหลดข้อมูล

## 🔒 Security

- Row Level Security (RLS) enabled บนทุก table
- Admin/Owner เท่านั้นที่เข้าถึงข้อมูลทั้งหมด
- Tenant เห็นเฉพาะข้อมูลของตัวเอง
- Protected Routes ตาม Role
- Secure file upload ผ่าน Supabase Storage

## 🚧 Roadmap

- [x] Phase 1: Authentication + Dashboard + Room Management
- [x] Phase 2: Tenant Management + Contract Management
- [x] Phase 3: Billing & Payment System (Invoice, Receipt, Meter Management)
- [x] Phase 4: Maintenance Requests + Notifications
- [x] Phase 5: Tenant Portal + Reports (Financial & Utility Reports + Export)
- [ ] Phase 6: LINE/Email Notifications
- [ ] Phase 7: QR Payment Integration
- [ ] Phase 8: IoT Features (Optional)

## 📄 License

MIT License

## 👨‍💻 Author

Sena-One Development Team

---

สร้างด้วย ❤️ โดยใช้ React + Chakra UI + Supabase
