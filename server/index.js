import express from 'express';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
    DB_PATH,
    createUser,
    executeQuery,
    findUserById,
    getDashboardStats,
    initializeDatabase,
    selectRows,
    updateUserPassword,
    verifyPassword,
} from './database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR || path.join(rootDir, 'data', 'uploads');
const distDir = path.join(rootDir, 'dist');

fs.mkdirSync(uploadDir, { recursive: true });
initializeDatabase();

const app = express();
const port = Number(process.env.PORT || 3000);
const sessionCookie = 'sena_session';
const sessionSecret = process.env.SESSION_SECRET || 'change-this-before-production';
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const upload = multer({
    storage: multer.diskStorage({
        destination(req, _file, cb) {
            const bucket = sanitizePathSegment(req.params.bucket);
            const dir = path.join(uploadDir, bucket);
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename(_req, file, cb) {
            const ext = path.extname(file.originalname || '');
            cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
        },
    }),
    limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024) },
});

function sanitizePathSegment(value = '') {
    return String(value).replace(/[^a-zA-Z0-9._-]/g, '_');
}

function signSession(user) {
    const payload = Buffer.from(JSON.stringify({
        id: user.id,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
    })).toString('base64url');
    const sig = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
    return `${payload}.${sig}`;
}

function readSession(req) {
    const token = req.cookies?.[sessionCookie];
    if (!token || !token.includes('.')) return null;
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    try {
        const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        const user = findUserById(session.id);
        if (!user) return null;
        return {
            id: user.id,
            phone: user.phone,
            full_name: user.full_name,
            role: user.role,
        };
    } catch {
        return null;
    }
}

function requireAuth(req, res, next) {
    const user = readSession(req);
    if (!user) return res.status(401).json({ error: { message: 'Unauthorized' } });
    req.user = user;
    next();
}

function publicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        phone: user.phone,
        full_name: user.full_name,
        role: user.role,
    };
}

function normalizePhone(value = '') {
    return String(value || '').replace(/\D/g, '');
}

function tenantAccess(user) {
    const userPhone = normalizePhone(user.phone);
    const tenants = selectRows('tenants').rows.filter((tenant) => (
        tenant.user_id === user.id || (userPhone && normalizePhone(tenant.phone) === userPhone)
    ));
    const tenantIds = new Set(tenants.map((tenant) => tenant.id).filter(Boolean));
    const contracts = tenantIds.size
        ? selectRows('contracts', [{ column: 'tenant_id', op: 'in', value: [...tenantIds] }]).rows
        : [];
    const contractIds = new Set(contracts.map((contract) => contract.id).filter(Boolean));
    const roomIds = new Set([
        ...tenants.map((tenant) => tenant.current_room_id),
        ...contracts.map((contract) => contract.room_id),
    ].filter(Boolean));
    const invoices = selectRows('invoices').rows.filter((invoice) => (
        tenantIds.has(invoice.tenant_id) || contractIds.has(invoice.contract_id) || roomIds.has(invoice.room_id)
    ));
    const invoiceIds = new Set(invoices.map((invoice) => invoice.id).filter(Boolean));

    return { tenantIds, contractIds, roomIds, invoiceIds };
}

function rowAllowedForTenant(table, row, access, user) {
    if (!row) return false;
    if (table === 'tenants') return access.tenantIds.has(row.id);
    if (table === 'contracts') return access.tenantIds.has(row.tenant_id) || access.roomIds.has(row.room_id);
    if (table === 'invoices') {
        return access.tenantIds.has(row.tenant_id)
            || access.contractIds.has(row.contract_id)
            || access.roomIds.has(row.room_id);
    }
    if (table === 'payments') return access.invoiceIds.has(row.invoice_id);
    if (table === 'deposits') return access.tenantIds.has(row.tenant_id) || access.contractIds.has(row.contract_id);
    if (table === 'maintenance_requests') return access.tenantIds.has(row.tenant_id) || access.roomIds.has(row.room_id);
    if (table === 'history_meter') return access.roomIds.has(row.room_id);
    if (table === 'rooms') return access.roomIds.has(row.id);
    if (table === 'users' || table === 'profiles') return row.id === user.id;
    if (table === 'app_settings' || table === 'position_rent_rates') return true;
    return false;
}

function payloadRows(payload) {
    return Array.isArray(payload) ? payload : [payload];
}

function tenantCanMutate(request, access) {
    const rows = payloadRows(request.payload || {});
    if (['insert', 'upsert'].includes(request.operation)) {
        if (request.table === 'history_meter') return rows.every((row) => access.roomIds.has(row.room_id));
        if (request.table === 'maintenance_requests') {
            return rows.every((row) => access.tenantIds.has(row.tenant_id) && access.roomIds.has(row.room_id));
        }
    }
    return false;
}

function applyTenantPolicy(user, request, result) {
    if (user.role !== 'tenant') return result;
    const access = tenantAccess(user);

    if (request.operation !== 'select' && !tenantCanMutate(request, access)) {
        return { data: null, error: { message: 'Forbidden' } };
    }

    if (!Array.isArray(result.data)) {
        if (result.data && !rowAllowedForTenant(request.table, result.data, access, user)) {
            return { ...result, data: null };
        }
        return result;
    }

    return {
        ...result,
        data: result.data.filter((row) => rowAllowedForTenant(request.table, row, access, user)),
    };
}

function setSessionCookie(res, user) {
    res.cookie(sessionCookie, signSession(user), {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 12,
        path: '/',
    });
}

app.get('/api/health', (_req, res) => {
    res.json({ ok: true, database: DB_PATH });
});

app.post('/api/auth/login', (req, res) => {
    const login = req.body?.login || req.body?.username || req.body?.phone;
    const password = req.body?.password || '';
    const user = verifyPassword(login, password);
    if (!user) return res.status(401).json({ user: null, error: { message: 'Invalid login or password' } });
    setSessionCookie(res, user);
    res.json({ user: publicUser(user), error: null });
});

app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie(sessionCookie, { path: '/' });
    res.json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
    res.json({ user: readSession(req), error: null });
});

app.post('/api/rpc', (req, res) => {
    try {
        const { name, params = {} } = req.body || {};

        if (name === 'verify_password') {
            const user = verifyPassword(params.login_input, params.password_input || '');
            if (user) setSessionCookie(res, user);
            return res.json({
                data: user ? [{
                    user_id: user.id,
                    user_phone: user.phone,
                    user_name: user.full_name,
                    user_role: user.role,
                }] : [],
                error: null,
            });
        }

        if (!readSession(req)) return res.status(401).json({ data: null, error: { message: 'Unauthorized' } });

        if (name === 'create_user') return res.json({ data: createUser(params), error: null });
        if (name === 'update_user_password') return res.json({ data: updateUserPassword(params), error: null });
        if (name === 'get_dashboard_stats') return res.json({ data: getDashboardStats(params), error: null });

        res.status(400).json({ data: null, error: { message: `Unsupported RPC: ${name}` } });
    } catch (error) {
        res.status(500).json({ data: null, error: { message: error.message } });
    }
});

app.post('/api/query', requireAuth, (req, res) => {
    try {
        const request = req.body || {};
        if (req.user.role === 'tenant' && request.operation !== 'select') {
            const access = tenantAccess(req.user);
            if (!tenantCanMutate(request, access)) {
                return res.status(403).json({ data: null, error: { message: 'Forbidden' } });
            }
        }
        const result = executeQuery(request);
        const guarded = applyTenantPolicy(req.user, request, result);
        const status = guarded.error?.message === 'Forbidden' ? 403 : 200;
        res.status(status).json(guarded);
    } catch (error) {
        res.status(500).json({ data: null, error: { message: error.message } });
    }
});

app.post('/api/storage/:bucket', requireAuth, upload.single('file'), (req, res) => {
    const bucket = sanitizePathSegment(req.params.bucket);
    const requestedPath = req.body?.path ? String(req.body.path) : req.file.filename;
    const targetPath = requestedPath.split('/').map(sanitizePathSegment).join('/');
    const targetDir = path.join(uploadDir, bucket, path.dirname(targetPath));
    fs.mkdirSync(targetDir, { recursive: true });
    const finalPath = path.join(uploadDir, bucket, targetPath);
    fs.renameSync(req.file.path, finalPath);
    res.json({ data: { path: targetPath, publicUrl: `/api/storage/${bucket}/${targetPath}` }, error: null });
});

app.delete('/api/storage/:bucket/*path', requireAuth, (req, res) => {
    const bucket = sanitizePathSegment(req.params.bucket);
    const relPath = String(req.params.path || '').split('/').map(sanitizePathSegment).join('/');
    const filePath = path.join(uploadDir, bucket, relPath);
    if (filePath.startsWith(path.join(uploadDir, bucket)) && fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
    res.json({ data: null, error: null });
});

app.get('/api/storage/:bucket/*path', requireAuth, (req, res) => {
    const bucket = sanitizePathSegment(req.params.bucket);
    const relPath = String(req.params.path || '').split('/').map(sanitizePathSegment).join('/');
    const filePath = path.join(uploadDir, bucket, relPath);
    if (!filePath.startsWith(path.join(uploadDir, bucket)) || !fs.existsSync(filePath)) {
        return res.status(404).end();
    }
    res.sendFile(filePath);
});

if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(port, () => {
    console.log(`Sena One server listening on http://localhost:${port}`);
    console.log(`SQLite database: ${DB_PATH}`);
});
