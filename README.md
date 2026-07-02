# Sena-One

ระบบจัดการหอพัก/อพาร์ตเมนต์สำหรับผู้ดูแลและผู้เช่า สร้างด้วย React, TypeScript, Chakra UI v3 และ PGlite โดยเก็บข้อมูลไว้ใน IndexedDB ของเบราว์เซอร์สำหรับการใช้งาน/ทดสอบแบบ local-first

## คุณสมบัติหลัก

### ผู้ดูแลระบบ

- Dashboard สรุปจำนวนห้อง ผู้เช่า รายได้ และรายการที่ต้องติดตาม
- จัดการห้องพัก พร้อมสถานะห้อง รูปภาพ และประวัติมิเตอร์
- จัดการผู้เช่า ข้อมูลติดต่อ บัญชีผู้ใช้ และการผูกห้อง
- จัดการสัญญาเช่า สร้าง แก้ไข ต่อสัญญา ย้ายห้อง และยกเลิกสัญญา
- สถิติสัญญาใกล้หมดอายุ แยกช่วงเหลือ 4 เดือน, 2 เดือน, 30 วัน และหมดอายุ
- จัดการมิเตอร์น้ำ/ไฟ พร้อมข้อมูลย้อนหลัง
- ออกบิล ใบแจ้งหนี้ บันทึกการชำระเงิน และ export ข้อมูล
- รับเรื่องแจ้งซ่อมและอัปเดตสถานะงาน
- รายงานการเงิน ห้องว่าง และค่าสาธารณูปโภค
- จัดการผู้ใช้งานและสิทธิ์ Admin, Owner, Tenant

### ผู้เช่า

- ดู Dashboard ส่วนตัว
- ดูบิลและประวัติการชำระเงิน
- ดูข้อมูลสัญญาเช่า
- แจ้งซ่อมและติดตามสถานะ

## Tech Stack

- React 19
- TypeScript
- Vite
- Chakra UI v3
- React Router
- TanStack React Query
- PGlite (`@electric-sql/pglite`) สำหรับฐานข้อมูล local ใน IndexedDB
- bcryptjs สำหรับ hash รหัสผ่านใน local database
- XLSX / file-saver สำหรับ export
- React Icons

## การติดตั้ง

```bash
npm install
```

## การรันสำหรับพัฒนา

```bash
npm run dev
```

Vite จะรันแบบ `--host` ตาม script ใน `package.json` โดยปกติเปิดได้ที่:

```txt
http://localhost:5173
```

ถ้า port 5173 ถูกใช้งานอยู่ Vite อาจเลื่อนไป port ถัดไป เช่น `5174`

## คำสั่งที่ใช้บ่อย

```bash
npm run dev
npm run type-check
npm run build
npm run lint
npm run preview
```

หมายเหตุ: บน Windows หาก PowerShell block `npm.ps1` ให้ใช้:

```bash
cmd /c npm run type-check
cmd /c npm run build
```

## ฐานข้อมูล Local

โปรเจกต์นี้ใช้ PGlite และ IndexedDB แทน Supabase client ใน runtime ปัจจุบัน

- Database name: `idb://sena-one-pglite`
- Seed data อยู่ที่ `public/pglite-seed/*.json`
- schema และ table ถูกสร้างใน `src/lib/pgliteClient.ts`
- session ผู้ใช้เก็บใน `localStorage` key: `sena_user_session`

เมื่อ seed version เปลี่ยน ระบบจะโหลดข้อมูลจาก `public/pglite-seed` ใหม่โดยอัตโนมัติ

### รหัสผ่าน seed users

ระบบตั้งรหัสผ่านผู้ใช้ใน seed data เป็น:

```txt
sP@ssw0rd
```

การ login รองรับ username/phone ตามข้อมูลใน table `users` และมีรูปแบบ username สำหรับผู้เช่าตามเลขห้อง เช่น `sena301`

## โครงสร้างโปรเจกต์

```txt
sena-one/
├─ public/
│  ├─ images/
│  └─ pglite-seed/
├─ src/
│  ├─ components/
│  │  ├─ common/
│  │  ├─ contracts/
│  │  ├─ invoices/
│  │  ├─ layout/
│  │  ├─ maintenance/
│  │  ├─ reports/
│  │  ├─ rooms/
│  │  ├─ tenants/
│  │  └─ ui/
│  ├─ contexts/
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ pgliteClient.ts
│  │  ├─ exportInvoice.ts
│  │  └─ utils.ts
│  ├─ pages/
│  │  ├─ admin/
│  │  ├─ auth/
│  │  └─ tenant/
│  ├─ services/
│  ├─ theme/
│  ├─ types/
│  ├─ App.tsx
│  └─ main.tsx
├─ supabase/
├─ package.json
└─ vite.config.ts
```

## เส้นทางหลักในแอป

- `/login` หน้าเข้าสู่ระบบ
- `/admin` Dashboard ผู้ดูแล
- `/admin/users` จัดการผู้ใช้งาน
- `/admin/rooms` จัดการห้องพัก
- `/admin/tenants` จัดการผู้เช่า
- `/admin/contracts` จัดการสัญญาเช่า
- `/admin/invoices` จัดการบิล
- `/admin/meters` จัดการมิเตอร์
- `/admin/maintenance` จัดการแจ้งซ่อม
- `/admin/reports` รายงาน
- `/admin/settings` ตั้งค่า
- `/tenant` Dashboard ผู้เช่า
- `/tenant/bills` บิลของผู้เช่า
- `/tenant/maintenance` แจ้งซ่อมของผู้เช่า
- `/tenant/contract` สัญญาของผู้เช่า

## หมายเหตุสำหรับนักพัฒนา

- โปรดบันทึกไฟล์เป็น UTF-8 เพื่อป้องกันข้อความไทยกลายเป็น mojibake
- หลีกเลี่ยงการเขียนไฟล์ภาษาไทยผ่าน PowerShell โดยไม่กำหนด encoding
- ถ้าต้อง reset ข้อมูล local ให้ลบ IndexedDB ของ site นี้ใน DevTools แล้ว refresh หน้าใหม่
- โค้ดบางส่วนใน `supabase/` ยังเก็บ SQL และ migration เดิมไว้เป็น reference แต่ runtime ปัจจุบันใช้ PGlite client

## License

MIT
