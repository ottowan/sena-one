# Sena-One

ระบบจัดการหอพัก/อพาร์ตเมนต์สำหรับผู้ดูแลและผู้เช่า สร้างด้วย React, TypeScript, Chakra UI v3 และ Firebase (Firestore + Authentication + Storage + Cloud Functions)

## ความสามารถหลัก

- Dashboard สำหรับผู้ดูแล
- จัดการห้องพัก ผู้เช่า สัญญา บิล มิเตอร์ การชำระเงิน และงานแจ้งซ่อม
- รายงานการเงิน ห้องว่าง และค่าสาธารณูปโภค
- หน้าผู้เช่าสำหรับดูบิล สัญญา Dashboard ส่วนตัว และแจ้งซ่อม
- ระบบ login ด้วย username/phone และ password (ผ่าน Firebase Auth email+password ภายใน)
- เก็บข้อมูลใน Firestore, ไฟล์อัปโหลดใน Firebase Storage
- สิทธิ์การเข้าถึงข้อมูลบังคับด้วย Firestore/Storage Security Rules

## Tech Stack

- React 19, TypeScript, Vite
- Chakra UI v3, React Router, TanStack React Query
- Firebase: Firestore, Authentication, Storage, Hosting
- Cloud Functions (2 functions เท่านั้น - admin reset/delete user account, ต้องใช้ Blaze plan)
- XLSX / file-saver สำหรับ export

## ติดตั้ง

```bash
npm install
```

## ตั้งค่า Firebase

1. สร้างหรือใช้ Firebase project ที่มีอยู่แล้ว (project นี้ใช้ `sena-one`)
2. เปิดใช้งานใน Firebase Console:
   - **Firestore Database** (Native mode)
   - **Authentication** → Sign-in method → เปิด **Email/Password**
   - **Storage**
3. คัดลอกค่า config จาก Console > Project settings > General > Your apps ใส่ใน `.env` (ดู `.env.example`)
4. Deploy security rules และ indexes:
   ```bash
   npx firebase login
   npx firebase deploy --only firestore:rules,firestore:indexes,storage --project sena-one
   ```
5. (ครั้งแรกเท่านั้น) seed ข้อมูลจาก `public/pglite-seed/*.json` เข้า Firestore:
   ```bash
   # ต้องมี service-account.json (Console > Project settings > Service accounts > Generate new private key)
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run migrate:firestore -- --dry-run
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json npm run migrate:firestore
   ```
   ทุกบัญชีที่ seed จะมีรหัสผ่านเริ่มต้น `sP@ssw0rd`
6. (สำหรับ 2 ฟังก์ชัน admin reset/delete user) อัปเกรดโปรเจกต์เป็น Blaze plan แล้ว deploy:
   ```bash
   cd functions && npm install && cd ..
   npx firebase deploy --only functions --project sena-one
   ```

## รันสำหรับพัฒนา

```bash
npm run dev
```

Frontend: `http://localhost:5173` (เชื่อมต่อ Firebase project ตรงจาก client เลย ไม่มี local backend/proxy)

## Production build + Deploy

```bash
npm run build
npm run deploy            # deploy hosting + firestore + storage
npm run deploy:functions  # deploy 2 cloud functions (ต้องมี Blaze plan)
```

หรือใช้ GitHub Actions auto-deploy: `npx firebase init hosting:github`

Firebase web config (`apiKey` ฯลฯ) ไม่ใช่ความลับ ปลอดภัยที่จะ commit ได้ - การป้องกันข้อมูลทำผ่าน Security Rules ไม่ใช่การซ่อน config

## ฐานข้อมูลและไฟล์

- Firestore collections: `users`, `username_lookup`, `phone_lookup`, `rooms`, `tenants`, `contracts`, `invoices`, `payments`, `deposits`, `maintenance_requests`, `history_meter`, `notifications`, `bookings`, `app_settings`, `position_rent_rates`
- ไฟล์อัปโหลด: Firebase Storage ภายใต้ prefix `room-images/`, `maintenance-images/`, `payment-slips/`
- Seed เริ่มต้น: `public/pglite-seed/*.json` (ใช้ครั้งเดียวตอน `npm run migrate:firestore`)

## รหัสผ่าน seed users

ค่าเริ่มต้นคือ `sP@ssw0rd` สำหรับทุกบัญชีที่ seed มา ควรเปลี่ยนรหัสผ่านผู้ใช้จริงหลังเข้าใช้งานครั้งแรก

## คำสั่งที่ใช้บ่อย

```bash
npm run dev
npm run type-check
npm run build
npm run lint
npm run migrate:firestore
npm run deploy
npm run deploy:functions
```

บน Windows ถ้า PowerShell block `npm.ps1` ให้ใช้:

```bash
cmd /c npm run type-check
cmd /c npm run build
```

## โครงสร้างสำคัญ

```txt
sena-one/
├─ functions/              # 2 Cloud Functions: admin reset/delete user (ต้อง Blaze plan)
├─ src/
│  ├─ components/
│  ├─ contexts/
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ firebase.ts       # Firebase app/auth/db/storage/functions singletons
│  │  ├─ firestoreUtils.ts # fan-out join helpers (chunked `in` queries)
│  │  ├─ exportInvoice.ts
│  │  └─ utils.ts
│  ├─ pages/
│  ├─ services/            # เรียก Firestore/Auth/Storage SDK ตรง
│  ├─ theme/
│  └─ types/
├─ public/
│  └─ pglite-seed/         # ข้อมูลสำหรับ seed ครั้งแรก
├─ scripts/
│  └─ migrate-to-firestore.ts  # seed script, รันครั้งเดียวแบบ local
├─ firestore.rules
├─ firestore.indexes.json
├─ storage.rules
├─ firebase.json
└─ vite.config.ts
```

## หมายเหตุด้านความปลอดภัย

- อย่า commit `.env`, `service-account.json` (ทั้งสองไฟล์ถูก gitignore ไว้แล้ว)
- Security Rules (`firestore.rules`, `storage.rules`) คือชั้นป้องกันข้อมูลหลัก ไม่ใช่ Firebase web config
- หลัง deploy ครั้งแรก ให้เปลี่ยนรหัสผ่าน default ของผู้ใช้ทุกคน
- role ของผู้ใช้เก็บใน field `role` ของ document `users/{uid}` (ไม่ใช้ custom claims เพราะเลี่ยงการใช้ Cloud Functions/Admin SDK ยกเว้น 2 ฟังก์ชัน admin reset/delete user)

## License

MIT
