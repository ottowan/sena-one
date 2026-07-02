import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data');
const seedDir = path.join(rootDir, 'public', 'pglite-seed');

fs.mkdirSync(dataDir, { recursive: true });

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(dataDir, 'sena-one.sqlite');
const SEED_VERSION = '20260701_201809';
const PASSWORD_RESET_VERSION = '20260701_reset_all_sP@ssw0rd_server';
const DEFAULT_ACCOUNT_PASSWORD = process.env.DEFAULT_ACCOUNT_PASSWORD || 'sP@ssw0rd';

const tables = [
    'profiles',
    'users',
    'rooms',
    'tenants',
    'contracts',
    'invoices',
    'payments',
    'deposits',
    'maintenance_requests',
    'notifications',
    'bookings',
    'history_meter',
    'app_settings',
    'position_rent_rates',
];

const jsonColumns = new Set([
    'amenities',
    'images',
    'id_card_images',
    'emergency_contact',
    'vehicles',
    'contract_files',
    'additional_charges',
    'documents',
    'data',
]);

const relationKeys = {
    contracts: { tenant: 'tenant_id', room: 'room_id' },
    invoices: { tenant: 'tenant_id', room: 'room_id', contract: 'contract_id' },
    payments: { invoice: 'invoice_id' },
    deposits: { tenant: 'tenant_id', contract: 'contract_id' },
    maintenance_requests: { tenant: 'tenant_id', room: 'room_id' },
    bookings: { room: 'room_id' },
    tenants: { room: 'current_room_id' },
};

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const columnCache = new Map();
const nowIso = () => new Date().toISOString();

function quoteIdent(identifier) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
        throw new Error(`Invalid identifier: ${identifier}`);
    }
    return `"${identifier}"`;
}

function toDbValue(value) {
    if (value === undefined) return null;
    if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
    return value;
}

function fromDbRow(row) {
    if (!row) return row;
    const parsed = { ...row };
    for (const column of jsonColumns) {
        if (typeof parsed[column] === 'string') {
            try {
                parsed[column] = JSON.parse(parsed[column]);
            } catch {
                // Keep plain strings as-is.
            }
        }
    }
    return parsed;
}

function makeError(message, code) {
    return { message, code };
}

function getColumns(table) {
    const cached = columnCache.get(table);
    if (cached) return cached;
    const columns = db.prepare(`PRAGMA table_info(${quoteIdent(table)})`).all().map((row) => row.name);
    columnCache.set(table, columns);
    return columns;
}

function normalizeSelect(select) {
    return (select || '*').replace(/\s+/g, ' ').trim();
}

function buildWhere(filters = [], params = []) {
    if (!filters.length) return { sql: '' };
    const parts = filters.map((filter) => {
        if (filter.op === 'in') {
            const values = Array.isArray(filter.value) ? filter.value : [];
            if (!values.length) return '1 = 0';
            const placeholders = values.map((value) => {
                params.push(value);
                return '?';
            });
            return `${quoteIdent(filter.column)} IN (${placeholders.join(', ')})`;
        }

        params.push(filter.value);
        const opMap = {
            eq: '=',
            neq: '<>',
            gte: '>=',
            lte: '<=',
            lt: '<',
        };

        if (filter.op === 'ilike') {
            return `LOWER(${quoteIdent(filter.column)}) LIKE LOWER(?)`;
        }
        return `${quoteIdent(filter.column)} ${opMap[filter.op]} ?`;
    });

    return { sql: ` WHERE ${parts.join(' AND ')}` };
}

export function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS _meta (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY, role TEXT, email TEXT, full_name TEXT, phone TEXT,
            id_card_number TEXT, id_card_image_url TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY, phone TEXT UNIQUE, password_hash TEXT, full_name TEXT,
            role TEXT, created_at TEXT, updated_at TEXT, username TEXT UNIQUE
        );
        CREATE TABLE IF NOT EXISTS rooms (
            id TEXT PRIMARY KEY, room_number TEXT, room_type TEXT, size_sqm REAL,
            monthly_rent REAL, water_rate REAL, electricity_rate REAL,
            current_water_meter REAL, current_electricity_meter REAL, status TEXT,
            floor INTEGER, description TEXT, amenities TEXT, images TEXT,
            current_tenant_id TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY, user_id TEXT, full_name TEXT, phone TEXT, email TEXT,
            id_card_number TEXT, id_card_images TEXT, emergency_contact TEXT,
            vehicles TEXT, position_title TEXT, position_level TEXT, workplace TEXT,
            move_in_date TEXT, move_out_date TEXT, status TEXT, current_room_id TEXT,
            created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY, tenant_id TEXT, room_id TEXT, start_date TEXT,
            end_date TEXT, monthly_rent REAL, deposit_amount REAL,
            contract_files TEXT, status TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY, contract_id TEXT, tenant_id TEXT, room_id TEXT,
            billing_month TEXT, rent_amount REAL, water_usage REAL, water_cost REAL,
            water_meter_last REAL, water_meter_current REAL, electricity_usage REAL,
            electricity_cost REAL, electricity_meter_last REAL, electricity_meter_current REAL,
            additional_charges TEXT, total_amount REAL, due_date TEXT, status TEXT,
            created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY, invoice_id TEXT, amount REAL, payment_method TEXT,
            payment_date TEXT, receipt_image_url TEXT, notes TEXT, created_by TEXT, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS deposits (
            id TEXT PRIMARY KEY, contract_id TEXT, tenant_id TEXT, amount REAL, status TEXT,
            refund_amount REAL, refund_date TEXT, notes TEXT, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS maintenance_requests (
            id TEXT PRIMARY KEY, room_id TEXT, tenant_id TEXT, title TEXT, description TEXT,
            images TEXT, status TEXT, priority TEXT, assigned_to TEXT,
            created_at TEXT, updated_at TEXT, completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT,
            read INTEGER, data TEXT, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY, room_id TEXT, applicant_name TEXT, phone TEXT, email TEXT,
            id_card_number TEXT, documents TEXT, move_in_date TEXT, status TEXT,
            deposit_paid REAL, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS history_meter (
            id TEXT PRIMARY KEY, room_id TEXT, month TEXT, water_meter REAL,
            electricity_meter REAL, created_at TEXT, updated_at TEXT,
            UNIQUE(room_id, month)
        );
        CREATE TABLE IF NOT EXISTS app_settings (
            id INTEGER PRIMARY KEY, common_fee REAL, water_rate REAL,
            water_maintenance_fee REAL, electricity_rate REAL, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS position_rent_rates (
            position_level TEXT PRIMARY KEY, rent_amount REAL, common_fee REAL, updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_history_meter_month ON history_meter(month);
        CREATE INDEX IF NOT EXISTS idx_history_meter_room_month ON history_meter(room_id, month);
        CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
        CREATE INDEX IF NOT EXISTS idx_contracts_status_room ON contracts(status, room_id);
        CREATE INDEX IF NOT EXISTS idx_contracts_tenant ON contracts(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_room_billing ON invoices(room_id, billing_month);
        CREATE INDEX IF NOT EXISTS idx_invoices_status_billing ON invoices(status, billing_month);
        CREATE INDEX IF NOT EXISTS idx_invoices_status_due ON invoices(status, due_date);
        CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status ON maintenance_requests(status);
    `);

    const meta = db.prepare('SELECT value FROM _meta WHERE key = ?').get('seed_version');
    if (meta?.value === SEED_VERSION) {
        resetAllUserPasswordsIfNeeded();
        ensureBootstrapAdmin();
        return;
    }

    const seed = db.transaction(() => {
        for (const table of tables) {
            db.prepare(`DELETE FROM ${quoteIdent(table)}`).run();
            const file = path.join(seedDir, `${table}.json`);
            if (!fs.existsSync(file)) continue;
            const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (rows.length) insertRows(table, rows, true);
        }
        db.prepare(`
            INSERT INTO _meta (key, value) VALUES ('seed_version', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `).run(SEED_VERSION);
    });
    seed();
    resetAllUserPasswordsIfNeeded();
    ensureBootstrapAdmin();
}

function resetAllUserPasswordsIfNeeded() {
    const meta = db.prepare('SELECT value FROM _meta WHERE key = ?').get('password_reset_version');
    if (meta?.value === PASSWORD_RESET_VERSION) return;
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    if (Number(userCount?.count || 0) === 0) return;

    const passwordHash = bcrypt.hashSync(DEFAULT_ACCOUNT_PASSWORD, 12);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ?').run(passwordHash, nowIso());
    db.prepare(`
        INSERT INTO _meta (key, value) VALUES ('password_reset_version', ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(PASSWORD_RESET_VERSION);
}

function ensureBootstrapAdmin() {
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get();
    if (Number(userCount?.count || 0) > 0) return;

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) return;

    const id = crypto.randomUUID();
    const phone = process.env.ADMIN_PHONE || 'admin';
    const username = process.env.ADMIN_USERNAME || 'admin';
    const fullName = process.env.ADMIN_FULL_NAME || 'Administrator';
    const passwordHash = bcrypt.hashSync(adminPassword, 12);

    insertRows('users', {
        id,
        phone,
        username,
        password_hash: passwordHash,
        full_name: fullName,
        role: 'admin',
    }, true);
    upsertRows('profiles', {
        id,
        phone,
        full_name: fullName,
        role: 'admin',
        email: `${username}@senaone.local`,
    });
}

export function insertRows(table, input, preserveIds = false) {
    const rows = Array.isArray(input) ? input : [input];
    const inserted = [];
    const columns = getColumns(table);

    const tx = db.transaction(() => {
        for (const raw of rows) {
            const row = { ...raw };
            if (!preserveIds && columns.includes('id') && !row.id) row.id = crypto.randomUUID();
            if (columns.includes('created_at') && !row.created_at) row.created_at = nowIso();
            if (columns.includes('updated_at') && !row.updated_at) row.updated_at = nowIso();

            const activeColumns = columns.filter((column) => row[column] !== undefined);
            const placeholders = activeColumns.map(() => '?').join(', ');
            const params = activeColumns.map((column) => toDbValue(row[column]));
            const sql = `
                INSERT INTO ${quoteIdent(table)} (${activeColumns.map(quoteIdent).join(', ')})
                VALUES (${placeholders})
                RETURNING *
            `;
            inserted.push(fromDbRow(db.prepare(sql).get(...params)));
        }
    });
    tx();
    return inserted;
}

export function updateRows(table, updates, filters = []) {
    const columns = getColumns(table);
    const patch = { ...updates };
    if (columns.includes('updated_at') && patch.updated_at === undefined) patch.updated_at = nowIso();
    const activeColumns = Object.keys(patch).filter((column) => columns.includes(column));
    if (!activeColumns.length) return [];

    const params = activeColumns.map((column) => toDbValue(patch[column]));
    const setSql = activeColumns.map((column) => `${quoteIdent(column)} = ?`).join(', ');
    const where = buildWhere(filters, params);
    const sql = `UPDATE ${quoteIdent(table)} SET ${setSql}${where.sql} RETURNING *`;
    return db.prepare(sql).all(...params).map(fromDbRow);
}

export function deleteRows(table, filters = []) {
    const params = [];
    const where = buildWhere(filters, params);
    db.prepare(`DELETE FROM ${quoteIdent(table)}${where.sql}`).run(...params);
}

export function upsertRows(table, input, onConflict) {
    const rows = Array.isArray(input) ? input : [input];
    const inserted = [];
    const columns = getColumns(table);
    const conflictColumns = (onConflict || (columns.includes('id') ? 'id' : columns[0]))
        .split(',')
        .map((column) => column.trim());

    const tx = db.transaction(() => {
        for (const raw of rows) {
            const row = { ...raw };
            if (columns.includes('id') && !row.id) row.id = crypto.randomUUID();
            if (columns.includes('created_at') && !row.created_at) row.created_at = nowIso();
            if (columns.includes('updated_at') && !row.updated_at) row.updated_at = nowIso();

            const activeColumns = columns.filter((column) => row[column] !== undefined);
            const updateColumns = activeColumns.filter((column) => !conflictColumns.includes(column));
            const updateSql = (updateColumns.length ? updateColumns : conflictColumns)
                .map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`)
                .join(', ');
            const params = activeColumns.map((column) => toDbValue(row[column]));
            const sql = `
                INSERT INTO ${quoteIdent(table)} (${activeColumns.map(quoteIdent).join(', ')})
                VALUES (${activeColumns.map(() => '?').join(', ')})
                ON CONFLICT (${conflictColumns.map(quoteIdent).join(', ')})
                DO UPDATE SET ${updateSql}
                RETURNING *
            `;
            inserted.push(fromDbRow(db.prepare(sql).get(...params)));
        }
    });
    tx();
    return inserted;
}

export function selectRows(table, filters = [], orders = [], limitCount = null, head = false, includeCount = false) {
    const params = [];
    const where = buildWhere(filters, params);
    const orderSql = orders.length
        ? ` ORDER BY ${orders.map((order) => `${quoteIdent(order.column)} ${order.ascending ? 'ASC' : 'DESC'}`).join(', ')}`
        : '';
    const limitSql = limitCount ? ` LIMIT ${Number(limitCount)}` : '';
    const sql = `SELECT * FROM ${quoteIdent(table)}${where.sql}${orderSql}${limitSql}`;
    const rows = head ? [] : db.prepare(sql).all(...params).map(fromDbRow);
    const count = includeCount
        ? Number(db.prepare(`SELECT COUNT(*) AS count FROM ${quoteIdent(table)}${where.sql}`).get(...params)?.count || 0)
        : undefined;
    return { rows, count };
}

function matchesOr(row, expression) {
    return expression.split(',').some((part) => {
        const match = part.match(/^(.+?)\.ilike\.%(.*)%$/);
        if (!match) return false;
        const key = match[1].split('.').pop() || '';
        return String(row[key] ?? '').toLowerCase().includes(match[2].toLowerCase());
    });
}

function relatedTableName(alias) {
    const singular = {
        tenant: 'tenants',
        room: 'rooms',
        contract: 'contracts',
        invoice: 'invoices',
        current_tenant: 'tenants',
    };
    return singular[alias] || alias;
}

function uniqueValues(values) {
    return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

function rowsByIds(table, ids) {
    const uniqueIds = uniqueValues(ids);
    if (uniqueIds.length === 0) return new Map();
    const result = selectRows(table, [{ column: 'id', op: 'in', value: uniqueIds }], [], null, false);
    return new Map(result.rows.map((row) => [row.id, row]));
}

export function attachRelations(table, rows, select = '*') {
    const normalized = normalizeSelect(select);
    const relationMatches = [...normalized.matchAll(/(\w+):(\w+)\s*\(/g)];
    if (!relationMatches.length || rows.length === 0) return rows;

    for (const match of relationMatches) {
        const alias = match[1];
        const relatedTable = match[2] || relatedTableName(alias);

        if (table === 'rooms' && alias === 'current_tenant') {
            const roomIds = uniqueValues(rows.map((row) => row.id));
            const contracts = roomIds.length
                ? selectRows('contracts', [
                    { column: 'room_id', op: 'in', value: roomIds },
                    { column: 'status', op: 'eq', value: 'active' },
                ], [], null, false)
                : { rows: [] };
            const contractByRoom = new Map(contracts.rows.map((contract) => [contract.room_id, contract]));
            const tenantIds = uniqueValues([
                ...contracts.rows.map((contract) => contract.tenant_id),
                ...rows.map((row) => row.current_tenant_id),
            ]);
            const tenantMap = rowsByIds('tenants', tenantIds);
            rows.forEach((row) => {
                const contract = contractByRoom.get(row.id);
                const tenantId = contract?.tenant_id || row.current_tenant_id;
                row[alias] = tenantId ? tenantMap.get(tenantId) || null : null;
            });
            continue;
        }

        const fk = relationKeys[table]?.[alias] || `${alias}_id`;
        const relationMap = rowsByIds(relatedTable, rows.map((row) => row[fk]));
        rows.forEach((row) => {
            row[alias] = row[fk] ? relationMap.get(row[fk]) || null : null;
        });

        if (relatedTable === 'contracts' && normalized.includes('room:rooms')) {
            const relatedContracts = rows.map((row) => row[alias]).filter(Boolean);
            const roomMap = rowsByIds('rooms', relatedContracts.map((contract) => contract.room_id));
            relatedContracts.forEach((contract) => {
                contract.room = contract.room_id ? roomMap.get(contract.room_id) || null : null;
            });
        }
    }

    return rows;
}

export function executeQuery(request) {
    const {
        table,
        operation = 'select',
        payload,
        filters = [],
        orders = [],
        limitCount = null,
        selectClause = '*',
        returnMode = 'many',
        head = false,
        countRequested = false,
        orExpression = '',
        conflict,
    } = request;

    let rows = [];
    let count;

    if (operation === 'delete') {
        deleteRows(table, filters);
        return { data: null, error: null };
    }

    if (operation === 'insert') rows = insertRows(table, payload);
    else if (operation === 'update') rows = updateRows(table, payload, filters);
    else if (operation === 'upsert') rows = upsertRows(table, payload, conflict);
    else {
        const result = selectRows(table, filters, orders, limitCount, head, countRequested || head);
        rows = result.rows;
        count = result.count;
    }

    if (orExpression) rows = rows.filter((row) => matchesOr(row, orExpression));
    rows = attachRelations(table, rows, selectClause);

    if (returnMode === 'single') {
        if (!rows[0]) return { data: null, error: makeError('No rows returned', 'PGRST116') };
        return { data: rows[0], error: null, count };
    }

    if (returnMode === 'maybeSingle') return { data: rows[0] || null, error: null, count };
    return { data: head ? null : rows, error: null, count: countRequested || head ? count : undefined };
}

export function findUserByLogin(login) {
    const row = db.prepare('SELECT * FROM users WHERE phone = ? OR username = ? LIMIT 1').get(login, login);
    return row ? fromDbRow(row) : null;
}

export function findUserById(id) {
    const row = db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').get(id);
    return row ? fromDbRow(row) : null;
}

export function createUser(params = {}) {
    const id = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(params.password_input || '', 12);
    insertRows('users', {
        id,
        phone: params.phone_input,
        username: params.username_input || null,
        password_hash: passwordHash,
        full_name: params.full_name_input,
        role: params.role_input || 'tenant',
    }, true);
    upsertRows('profiles', {
        id,
        phone: params.phone_input,
        full_name: params.full_name_input,
        role: params.role_input || 'tenant',
        email: params.email_input || `${params.phone_input}@senaone.local`,
    });
    return id;
}

export function updateUserPassword(params = {}) {
    const passwordHash = bcrypt.hashSync(params.new_password_input || '', 12);
    updateRows('users', { password_hash: passwordHash }, [
        { column: 'id', op: 'eq', value: params.user_id_input },
    ]);
    return true;
}

export function getDashboardStats(params = {}) {
    return db.prepare(`
        SELECT
            (SELECT COUNT(*) FROM rooms) AS totalRooms,
            (SELECT COUNT(*) FROM rooms WHERE status = 'available') AS availableRooms,
            (SELECT COUNT(*) FROM rooms WHERE status = 'occupied') AS occupiedRooms,
            (SELECT COUNT(*) FROM rooms WHERE status = 'maintenance') AS maintenanceRooms,
            (SELECT COALESCE(SUM(total_amount), 0)
                FROM invoices
                WHERE status = 'paid'
                    AND billing_month >= ?
                    AND billing_month < ?
            ) AS monthlyRevenue,
            (SELECT COUNT(*)
                FROM invoices
                WHERE status = 'pending'
                    AND due_date < ?
            ) AS overduePayments,
            (SELECT COUNT(*) FROM contracts WHERE status = 'active') AS activeTenants,
            (SELECT COUNT(*) FROM maintenance_requests WHERE status = 'pending') AS openMaintenanceRequests
    `).get(params.current_month_start, params.next_month_start, params.today);
}

export function verifyPassword(login, password) {
    const user = findUserByLogin(login);
    const valid = user?.password_hash ? bcrypt.compareSync(password || '', user.password_hash) : false;
    return valid ? user : null;
}

export { db, DB_PATH };
