# Sena-One

ระบบจัดการหอพัก/อพาร์ตเมนต์สำหรับผู้ดูแลและผู้เช่า สร้างด้วย React, TypeScript, Chakra UI v3 และ Express + SQLite backend

## ความสามารถหลัก

- Dashboard สำหรับผู้ดูแล
- จัดการห้องพัก ผู้เช่า สัญญา บิล มิเตอร์ การชำระเงิน และงานแจ้งซ่อม
- รายงานการเงิน ห้องว่าง และค่าสาธารณูปโภค
- หน้าผู้เช่าสำหรับดูบิล สัญญา Dashboard ส่วนตัว และแจ้งซ่อม
- ระบบ login ด้วย username/phone และ password
- เก็บ session ด้วย httpOnly cookie จาก backend
- เก็บข้อมูลกลางใน SQLite ที่ `data/sena-one.sqlite`
- เก็บไฟล์อัปโหลดใน `data/uploads`

## Tech Stack

- React 19
- TypeScript
- Vite
- Chakra UI v3
- React Router
- TanStack React Query
- Express
- SQLite ผ่าน `better-sqlite3`
- bcryptjs สำหรับ hash รหัสผ่านฝั่ง server
- multer สำหรับ upload ไฟล์
- XLSX / file-saver สำหรับ export

## ติดตั้ง

```bash
npm install
```

## รันสำหรับพัฒนา

รัน frontend และ backend พร้อมกัน:

```bash
npm run dev:all
```

หรือแยก terminal:

```bash
npm run server
npm run dev
```

ค่า default:

```txt
Backend:  http://localhost:3000
Frontend: http://localhost:5173
```

ถ้า port 5173 ถูกใช้แล้ว Vite อาจเลื่อนไป port ถัดไป เช่น `5174`

## Production

Build frontend:

```bash
npm run build
```

Start backend ที่ serve ทั้ง API และไฟล์ใน `dist`:

```bash
set NODE_ENV=production
set SESSION_SECRET=replace-with-a-long-random-secret
npm run server
```

บน Linux/macOS:

```bash
NODE_ENV=production SESSION_SECRET=replace-with-a-long-random-secret npm run server
```

ตัวแปรแนะนำสำหรับ production:

```txt
PORT=3000
SESSION_SECRET=long-random-secret
SQLITE_DB_PATH=/absolute/path/to/sena-one.sqlite
UPLOAD_DIR=/absolute/path/to/uploads
DEFAULT_ACCOUNT_PASSWORD=change-before-first-run
MAX_UPLOAD_BYTES=10485760
ADMIN_USERNAME=admin
ADMIN_PHONE=admin
ADMIN_FULL_NAME=Administrator
ADMIN_PASSWORD=change-before-first-run
```

ควรตั้ง reverse proxy เช่น Nginx/Caddy ให้ใช้ HTTPS หน้า backend

## Deploy Frontend on Netlify

ใช้ Netlify สำหรับ frontend ได้ โดย backend SQLite ต้องรันแยกบน server ที่มี persistent disk เช่น VPS, Render, Railway หรือ Fly.io

Netlify settings:

```txt
Build command: npm run build
Publish directory: dist
```

ไฟล์ `netlify.toml` ตั้งค่า SPA redirect ไว้แล้ว

ให้ตั้ง environment variable บน Netlify:

```txt
VITE_API_BASE=https://your-backend-domain.example.com
```

อย่าใส่ `VITE_API_BASE=https://sena-one.netlify.app` เพราะค่านี้ต้องเป็น URL ของ backend API ไม่ใช่ URL frontend

จากนั้น backend ต้องเปิด HTTPS และตอบ API เช่น:

```txt
https://your-backend-domain.example.com/api/health
```

ฝั่ง backend ให้ตั้งค่า origin ของ Netlify เพื่อให้ cookie login ใช้ข้ามโดเมนได้:

```txt
FRONTEND_ORIGIN=https://sena-one.netlify.app
```

ไม่แนะนำให้วาง SQLite backend ลง Netlify Functions สำหรับข้อมูลจริง เพราะ function ไม่มี SQLite file storage แบบถาวรเหมือน server ปกติ

## ฐานข้อมูลและไฟล์

- SQLite database: `data/sena-one.sqlite`
- Uploads: `data/uploads`
- Seed เริ่มต้น: `public/pglite-seed/*.json`
- `data/` ถูก ignore จาก git เพื่อไม่ให้ commit ฐานข้อมูลจริง
- `public/pglite-seed/*.json` ถูก ignore จาก git เพื่อป้องกันข้อมูล seed จริงหลุด

เมื่อ backend start ครั้งแรก ระบบจะสร้าง schema และ seed ข้อมูลเข้า SQLite ถ้ายังไม่มีข้อมูลตาม seed version

## รหัสผ่าน seed users

ค่าเริ่มต้นคือ:

```txt
sP@ssw0rd
```

สำหรับ production ให้ตั้ง `DEFAULT_ACCOUNT_PASSWORD` ก่อน start ครั้งแรก และควรเปลี่ยนรหัสผ่านผู้ใช้จริงหลังเข้าใช้งาน

## คำสั่งที่ใช้บ่อย

```bash
npm run dev:all
npm run server
npm run dev
npm run type-check
npm run build
npm run lint
```

บน Windows ถ้า PowerShell block `npm.ps1` ให้ใช้:

```bash
cmd /c npm run type-check
cmd /c npm run build
```

## โครงสร้างสำคัญ

```txt
sena-one/
├─ server/
│  ├─ database.js
│  └─ index.js
├─ src/
│  ├─ components/
│  ├─ contexts/
│  ├─ hooks/
│  ├─ lib/
│  │  ├─ pgliteClient.ts   # compatibility API client ชื่อเดิม แต่เรียก backend แล้ว
│  │  ├─ exportInvoice.ts
│  │  └─ utils.ts
│  ├─ pages/
│  ├─ services/
│  ├─ theme/
│  └─ types/
├─ public/
│  └─ pglite-seed/
├─ data/                   # runtime only, ไม่ commit
├─ package.json
└─ vite.config.ts
```

## หมายเหตุด้านความปลอดภัย

- อย่า commit `.env`, `data/`, database จริง หรือไฟล์ upload จริง
- ตั้ง `SESSION_SECRET` เป็นค่าสุ่มยาวก่อน production
- ใช้ HTTPS เสมอ
- backup `data/sena-one.sqlite` และ `data/uploads` เป็นประจำ
- หลัง deploy ครั้งแรก ให้เปลี่ยนรหัสผ่าน default ของผู้ใช้ทุกคน

## License

MIT
