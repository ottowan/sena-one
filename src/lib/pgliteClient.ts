import { PGlite } from '@electric-sql/pglite';
import bcrypt from 'bcryptjs';

type Row = Record<string, any>;
type FilterOp = 'eq' | 'neq' | 'gte' | 'lte' | 'lt' | 'in' | 'ilike';

interface Filter {
    column: string;
    op: FilterOp;
    value: any;
}

interface OrderRule {
    column: string;
    ascending: boolean;
}

interface QueryResult<T = any> {
    data: T | null;
    error: any;
    count?: number | null;
}

const DB_NAME = 'idb://sena-one-pglite';
const SEED_VERSION = '20260701_201809';
const PASSWORD_RESET_VERSION = '20260701_reset_all_sP@ssw0rd';
const DEFAULT_ACCOUNT_PASSWORD = 'sP@ssw0rd';
const SESSION_KEY = 'sena_user_session';

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

const relationKeys: Record<string, Record<string, string>> = {
    contracts: { tenant: 'tenant_id', room: 'room_id' },
    invoices: { tenant: 'tenant_id', room: 'room_id', contract: 'contract_id' },
    payments: { invoice: 'invoice_id' },
    deposits: { tenant: 'tenant_id', contract: 'contract_id' },
    maintenance_requests: { tenant: 'tenant_id', room: 'room_id' },
    bookings: { room: 'room_id' },
    tenants: { room: 'current_room_id' },
};

const db = new PGlite(DB_NAME);
let initPromise: Promise<void> | null = null;
const columnCache = new Map<string, string[]>();

const nowIso = () => new Date().toISOString();
const isBrowser = typeof window !== 'undefined';

function toDbValue(value: any) {
    if (value === undefined) return null;
    if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
    return value;
}

function fromDbRow(row: Row): Row {
    const parsed = { ...row };
    for (const column of jsonColumns) {
        if (typeof parsed[column] === 'string') {
            try {
                parsed[column] = JSON.parse(parsed[column]);
            } catch {
                // Keep the original value if it is plain text.
            }
        }
    }
    return parsed;
}

function makeError(message: string, code?: string) {
    return { message, code };
}

function quoteIdent(identifier: string) {
    return `"${identifier.replace(/"/g, '""')}"`;
}

function normalizeSelect(select?: string) {
    return (select || '*').replace(/\s+/g, ' ').trim();
}

async function ensureInitialized() {
    if (!initPromise) {
        initPromise = initializeDatabase();
    }
    await initPromise;
}

async function initializeDatabase() {
    await db.exec(`
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
            floor INTEGER, description TEXT, amenities JSONB, images JSONB,
            current_tenant_id TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY, user_id TEXT, full_name TEXT, phone TEXT, email TEXT,
            id_card_number TEXT, id_card_images JSONB, emergency_contact JSONB,
            vehicles JSONB, position_title TEXT, position_level TEXT, workplace TEXT,
            move_in_date TEXT, move_out_date TEXT, status TEXT, current_room_id TEXT,
            created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS contracts (
            id TEXT PRIMARY KEY, tenant_id TEXT, room_id TEXT, start_date TEXT,
            end_date TEXT, monthly_rent REAL, deposit_amount REAL,
            contract_files JSONB, status TEXT, created_at TEXT, updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY, contract_id TEXT, tenant_id TEXT, room_id TEXT,
            billing_month TEXT, rent_amount REAL, water_usage REAL, water_cost REAL,
            water_meter_last REAL, water_meter_current REAL, electricity_usage REAL,
            electricity_cost REAL, electricity_meter_last REAL, electricity_meter_current REAL,
            additional_charges JSONB, total_amount REAL, due_date TEXT, status TEXT,
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
            images JSONB, status TEXT, priority TEXT, assigned_to TEXT,
            created_at TEXT, updated_at TEXT, completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY, user_id TEXT, type TEXT, title TEXT, message TEXT,
            read BOOLEAN, data JSONB, created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY, room_id TEXT, applicant_name TEXT, phone TEXT, email TEXT,
            id_card_number TEXT, documents JSONB, move_in_date TEXT, status TEXT,
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

    const meta = await db.query<{ value: string }>('SELECT value FROM _meta WHERE key = $1', ['seed_version']);
    if (meta.rows[0]?.value === SEED_VERSION) {
        await resetAllUserPasswordsIfNeeded();
        return;
    }

    for (const table of tables) {
        await db.exec(`DELETE FROM ${quoteIdent(table)};`);
        const rows = await loadSeed(table);
        if (rows.length) {
            await insertRows(table, rows, true);
        }
    }

    await db.query(
        `INSERT INTO _meta (key, value) VALUES ('seed_version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [SEED_VERSION]
    );
    await resetAllUserPasswordsIfNeeded();
}

async function resetAllUserPasswordsIfNeeded() {
    const meta = await db.query<{ value: string }>(
        'SELECT value FROM _meta WHERE key = $1',
        ['password_reset_version']
    );
    if (meta.rows[0]?.value === PASSWORD_RESET_VERSION) return;

    const userCount = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users');
    if (Number(userCount.rows[0]?.count || 0) === 0) return;

    const passwordHash = await bcrypt.hash(DEFAULT_ACCOUNT_PASSWORD, 6);
    await db.query('UPDATE users SET password_hash = $1, updated_at = $2', [passwordHash, nowIso()]);
    await db.query(
        `INSERT INTO _meta (key, value) VALUES ('password_reset_version', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [PASSWORD_RESET_VERSION]
    );
}

async function loadSeed(table: string): Promise<Row[]> {
    if (!isBrowser) return [];
    const response = await fetch(`/pglite-seed/${table}.json`);
    if (!response.ok) return [];
    return response.json();
}

async function getColumns(table: string) {
    const cached = columnCache.get(table);
    if (cached) return cached;

    const result = await db.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
        [table]
    );
    const columns = result.rows.map((row) => row.column_name);
    columnCache.set(table, columns);
    return columns;
}

async function insertRows(table: string, input: Row | Row[], preserveIds = false) {
    const rows = Array.isArray(input) ? input : [input];
    const inserted: Row[] = [];
    const columns = await getColumns(table);

    for (const raw of rows) {
        const row: Row = { ...raw };
        if (!preserveIds && columns.includes('id') && !row.id) row.id = crypto.randomUUID();
        if (columns.includes('created_at') && !row.created_at) row.created_at = nowIso();
        if (columns.includes('updated_at') && !row.updated_at) row.updated_at = nowIso();

        const activeColumns = columns.filter((column) => row[column] !== undefined);
        const placeholders = activeColumns.map((_, index) => `$${index + 1}`).join(', ');
        const params = activeColumns.map((column) => toDbValue(row[column]));

        await db.query(
            `INSERT INTO ${quoteIdent(table)} (${activeColumns.map(quoteIdent).join(', ')})
             VALUES (${placeholders})`,
            params
        );
        inserted.push(fromDbRow(row));
    }

    return inserted;
}

async function updateRows(table: string, updates: Row, filters: Filter[]) {
    const columns = await getColumns(table);
    const patch = { ...updates };
    if (columns.includes('updated_at') && patch.updated_at === undefined) patch.updated_at = nowIso();

    const activeColumns = Object.keys(patch).filter((column) => columns.includes(column));
    if (!activeColumns.length) return [];

    const setSql = activeColumns.map((column, index) => `${quoteIdent(column)} = $${index + 1}`).join(', ');
    const params = activeColumns.map((column) => toDbValue(patch[column]));
    const where = buildWhere(filters, params);

    const result = await db.query<Row>(
        `UPDATE ${quoteIdent(table)} SET ${setSql}${where.sql} RETURNING *`,
        params
    );
    return result.rows.map(fromDbRow);
}

async function deleteRows(table: string, filters: Filter[]) {
    const params: any[] = [];
    const where = buildWhere(filters, params);
    await db.query(`DELETE FROM ${quoteIdent(table)}${where.sql}`, params);
}

async function upsertRows(table: string, input: Row | Row[], onConflict?: string) {
    const rows = Array.isArray(input) ? input : [input];
    const inserted: Row[] = [];
    const columns = await getColumns(table);
    const conflictColumns = (onConflict || (columns.includes('id') ? 'id' : columns[0]))
        .split(',')
        .map((column) => column.trim());

    for (const raw of rows) {
        const row = { ...raw };
        if (columns.includes('id') && !row.id) row.id = crypto.randomUUID();
        if (columns.includes('created_at') && !row.created_at) row.created_at = nowIso();
        if (columns.includes('updated_at') && !row.updated_at) row.updated_at = nowIso();

        const activeColumns = columns.filter((column) => row[column] !== undefined);
        const updateColumns = activeColumns.filter((column) => !conflictColumns.includes(column));
        const params = activeColumns.map((column) => toDbValue(row[column]));
        const updateSql = updateColumns.length
            ? updateColumns.map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`).join(', ')
            : conflictColumns.map((column) => `${quoteIdent(column)} = EXCLUDED.${quoteIdent(column)}`).join(', ');

        const result = await db.query<Row>(
            `INSERT INTO ${quoteIdent(table)} (${activeColumns.map(quoteIdent).join(', ')})
             VALUES (${activeColumns.map((_, index) => `$${index + 1}`).join(', ')})
             ON CONFLICT (${conflictColumns.map(quoteIdent).join(', ')})
             DO UPDATE SET ${updateSql}
             RETURNING *`,
            params
        );
        inserted.push(...result.rows.map(fromDbRow));
    }

    return inserted;
}

function buildWhere(filters: Filter[], params: any[]) {
    if (!filters.length) return { sql: '' };
    const parts = filters.map((filter) => {
        if (filter.op === 'in') {
            const values = filter.value as any[];
            const placeholders = values.map((value) => {
                params.push(value);
                return `$${params.length}`;
            });
            return `${quoteIdent(filter.column)} IN (${placeholders.join(', ')})`;
        }

        params.push(filter.op === 'ilike' ? String(filter.value).replace(/%/g, '%') : filter.value);
        const placeholder = `$${params.length}`;
        const opMap: Record<Exclude<FilterOp, 'in' | 'ilike'>, string> = {
            eq: '=',
            neq: '<>',
            gte: '>=',
            lte: '<=',
            lt: '<',
        };

        if (filter.op === 'ilike') {
            return `${quoteIdent(filter.column)} ILIKE ${placeholder}`;
        }
        return `${quoteIdent(filter.column)} ${opMap[filter.op]} ${placeholder}`;
    });

    return { sql: ` WHERE ${parts.join(' AND ')}` };
}

async function selectRows(
    table: string,
    filters: Filter[],
    orders: OrderRule[],
    limitCount: number | null,
    head: boolean,
    includeCount = false
) {
    const params: any[] = [];
    const where = buildWhere(filters, params);
    const orderSql = orders.length
        ? ` ORDER BY ${orders.map((order) => `${quoteIdent(order.column)} ${order.ascending ? 'ASC' : 'DESC'}`).join(', ')}`
        : '';
    const limitSql = limitCount ? ` LIMIT ${limitCount}` : '';
    const sql = `SELECT * FROM ${quoteIdent(table)}${where.sql}${orderSql}${limitSql}`;
    const result = head ? { rows: [] as Row[] } : await db.query<Row>(sql, params);
    const countResult = includeCount
        ? await db.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM ${quoteIdent(table)}${where.sql}`,
            params
        )
        : null;
    return {
        rows: result.rows.map(fromDbRow),
        count: countResult ? Number(countResult.rows[0]?.count || 0) : undefined,
    };
}

function matchesOr(row: Row, expression: string) {
    return expression.split(',').some((part) => {
        const match = part.match(/^(.+?)\.ilike\.%(.*)%$/);
        if (!match) return false;
        const key = match[1].split('.').pop() || '';
        return String(row[key] ?? '').toLowerCase().includes(match[2].toLowerCase());
    });
}

function relatedTableName(alias: string) {
    const singular: Record<string, string> = {
        tenant: 'tenants',
        room: 'rooms',
        contract: 'contracts',
        invoice: 'invoices',
        current_tenant: 'tenants',
    };
    return singular[alias] || alias;
}

async function attachRelations(table: string, rows: Row[], select: string) {
    const normalized = normalizeSelect(select);
    const relationMatches = [...normalized.matchAll(/(\w+):(\w+)\s*\(/g)];
    if (!relationMatches.length || rows.length === 0) return rows;

    for (const match of relationMatches) {
        const alias = match[1];
        const relatedTable = match[2] || relatedTableName(alias);

        if (table === 'rooms' && alias === 'current_tenant') {
            const roomIds = uniqueValues(rows.map((row) => row.id));
            const contracts = roomIds.length
                ? await selectRows('contracts', [
                    { column: 'room_id', op: 'in', value: roomIds },
                    { column: 'status', op: 'eq', value: 'active' },
                ], [], null, false)
                : { rows: [] as Row[] };
            const contractByRoom = new Map(contracts.rows.map((contract) => [contract.room_id, contract]));
            const tenantIds = uniqueValues([
                ...contracts.rows.map((contract) => contract.tenant_id),
                ...rows.map((row) => row.current_tenant_id),
            ]);
            const tenantMap = await rowsByIds('tenants', tenantIds);

            rows.forEach((row) => {
                const contract = contractByRoom.get(row.id);
                const tenantId = contract?.tenant_id || row.current_tenant_id;
                row[alias] = tenantId ? tenantMap.get(tenantId) || null : null;
            });
            continue;
        }

        const fk = relationKeys[table]?.[alias] || `${alias}_id`;
        const relationMap = await rowsByIds(relatedTable, rows.map((row) => row[fk]));

        rows.forEach((row) => {
            row[alias] = row[fk] ? relationMap.get(row[fk]) || null : null;
        });

        if (relatedTable === 'contracts' && normalized.includes('room:rooms')) {
            const relatedContracts = rows
                .map((row) => row[alias])
                .filter(Boolean) as Row[];
            const roomMap = await rowsByIds('rooms', relatedContracts.map((contract) => contract.room_id));
            relatedContracts.forEach((contract) => {
                contract.room = contract.room_id ? roomMap.get(contract.room_id) || null : null;
            });
        }
    }
    return rows;
}

function uniqueValues(values: any[]) {
    return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))];
}

async function rowsByIds(table: string, ids: any[]) {
    const uniqueIds = uniqueValues(ids);
    if (uniqueIds.length === 0) return new Map<any, Row>();

    const result = await selectRows(table, [{ column: 'id', op: 'in', value: uniqueIds }], [], null, false);
    return new Map(result.rows.map((row) => [row.id, row]));
}

class QueryBuilder implements PromiseLike<QueryResult<any>> {
    private filters: Filter[] = [];
    private orders: OrderRule[] = [];
    private limitCount: number | null = null;
    private selectClause = '*';
    private returnMode: 'many' | 'single' | 'maybeSingle' = 'many';
    private operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
    private payload: any;
    private head = false;
    private countRequested = false;
    private orExpression = '';
    private conflict?: string;

    constructor(private table: string) { }

    select(columns = '*', options?: { count?: 'exact'; head?: boolean }) {
        this.operation = this.operation === 'select' ? 'select' : this.operation;
        this.selectClause = columns;
        this.countRequested = options?.count === 'exact';
        this.head = !!options?.head;
        return this;
    }

    insert(payload: any) {
        this.operation = 'insert';
        this.payload = payload;
        return this;
    }

    update(payload: any) {
        this.operation = 'update';
        this.payload = payload;
        return this;
    }

    delete() {
        this.operation = 'delete';
        return this;
    }

    upsert(payload: any, options?: { onConflict?: string }) {
        this.operation = 'upsert';
        this.payload = payload;
        this.conflict = options?.onConflict;
        return this;
    }

    eq(column: string, value: any) { this.filters.push({ column, op: 'eq', value }); return this; }
    neq(column: string, value: any) { this.filters.push({ column, op: 'neq', value }); return this; }
    gte(column: string, value: any) { this.filters.push({ column, op: 'gte', value }); return this; }
    lte(column: string, value: any) { this.filters.push({ column, op: 'lte', value }); return this; }
    lt(column: string, value: any) { this.filters.push({ column, op: 'lt', value }); return this; }
    in(column: string, value: any[]) { this.filters.push({ column, op: 'in', value }); return this; }
    ilike(column: string, value: string) { this.filters.push({ column, op: 'ilike', value }); return this; }
    or(expression: string) { this.orExpression = expression; return this; }
    order(column: string, options?: { ascending?: boolean }) {
        this.orders.push({ column, ascending: options?.ascending !== false });
        return this;
    }
    limit(count: number) { this.limitCount = count; return this; }
    range(from: number, to: number) { this.limitCount = to - from + 1; return this; }
    single() { this.returnMode = 'single'; return this; }
    maybeSingle() { this.returnMode = 'maybeSingle'; return this; }

    then<TResult1 = QueryResult<any>, TResult2 = never>(
        onfulfilled?: ((value: QueryResult<any>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private async execute(): Promise<QueryResult> {
        try {
            await ensureInitialized();

            if (this.operation === 'delete') {
                await deleteRows(this.table, this.filters);
                return { data: null, error: null };
            }

            let rows: Row[] = [];
            let count: number | undefined;

            if (this.operation === 'insert') {
                rows = await insertRows(this.table, this.payload);
            } else if (this.operation === 'update') {
                rows = await updateRows(this.table, this.payload, this.filters);
            } else if (this.operation === 'upsert') {
                rows = await upsertRows(this.table, this.payload, this.conflict);
            } else {
                const result = await selectRows(
                    this.table,
                    this.filters,
                    this.orders,
                    this.limitCount,
                    this.head,
                    this.countRequested || this.head
                );
                rows = result.rows;
                count = result.count;
            }

            if (this.orExpression) rows = rows.filter((row) => matchesOr(row, this.orExpression));
            rows = await attachRelations(this.table, rows, this.selectClause);

            if (this.returnMode === 'single') {
                if (!rows[0]) return { data: null, error: makeError('No rows returned', 'PGRST116') };
                return { data: rows[0], error: null, count };
            }

            if (this.returnMode === 'maybeSingle') {
                return { data: rows[0] || null, error: null, count };
            }

            return { data: this.head ? null : rows, error: null, count: this.countRequested || this.head ? count : undefined };
        } catch (error: any) {
            return { data: null, error };
        }
    }
}

async function rpc(name: string, params?: Row): Promise<QueryResult> {
    try {
        await ensureInitialized();

        if (name === 'verify_password') {
            const login = params?.login_input;
            const password = params?.password_input || '';
            const result = await db.query<Row>(
                'SELECT * FROM users WHERE phone = $1 OR username = $1 LIMIT 1',
                [login]
            );
            const user = result.rows[0] ? fromDbRow(result.rows[0]) : null;
            const valid = user?.password_hash ? await bcrypt.compare(password, user.password_hash) : false;
            return {
                data: valid ? [{
                    user_id: user.id,
                    user_phone: user.phone,
                    user_name: user.full_name,
                    user_role: user.role,
                }] : [],
                error: null,
            };
        }

        if (name === 'create_user') {
            const id = crypto.randomUUID();
            const passwordHash = await bcrypt.hash(params?.password_input || '', 6);
            await insertRows('users', {
                id,
                phone: params?.phone_input,
                username: params?.username_input || null,
                password_hash: passwordHash,
                full_name: params?.full_name_input,
                role: params?.role_input || 'tenant',
            }, true);
            await upsertRows('profiles', {
                id,
                phone: params?.phone_input,
                full_name: params?.full_name_input,
                role: params?.role_input || 'tenant',
                email: params?.email_input || `${params?.phone_input}@senaone.local`,
            });
            return { data: id, error: null };
        }

        if (name === 'update_user_password') {
            const passwordHash = await bcrypt.hash(params?.new_password_input || '', 6);
            await updateRows('users', { password_hash: passwordHash }, [
                { column: 'id', op: 'eq', value: params?.user_id_input },
            ]);
            return { data: true, error: null };
        }

        if (name === 'get_dashboard_stats') {
            const result = await db.query<Row>(
                `SELECT
                    (SELECT COUNT(*)::int FROM rooms) AS "totalRooms",
                    (SELECT COUNT(*)::int FROM rooms WHERE status = 'available') AS "availableRooms",
                    (SELECT COUNT(*)::int FROM rooms WHERE status = 'occupied') AS "occupiedRooms",
                    (SELECT COUNT(*)::int FROM rooms WHERE status = 'maintenance') AS "maintenanceRooms",
                    (SELECT COALESCE(SUM(total_amount), 0)::float
                        FROM invoices
                        WHERE status = 'paid'
                            AND billing_month >= $1
                            AND billing_month < $2
                    ) AS "monthlyRevenue",
                    (SELECT COUNT(*)::int
                        FROM invoices
                        WHERE status = 'pending'
                            AND due_date < $3
                    ) AS "overduePayments",
                    (SELECT COUNT(*)::int FROM contracts WHERE status = 'active') AS "activeTenants",
                    (SELECT COUNT(*)::int FROM maintenance_requests WHERE status = 'pending') AS "openMaintenanceRequests"`,
                [
                    params?.current_month_start,
                    params?.next_month_start,
                    params?.today,
                ]
            );
            return { data: result.rows[0] || null, error: null };
        }

        return { data: null, error: makeError(`Unsupported RPC: ${name}`) };
    } catch (error) {
        return { data: null, error };
    }
}

function getStorageUrl(bucket: string, path: string) {
    return `pglite-storage://${bucket}/${path}`;
}

export const pgliteClient = {
    initialize() {
        return ensureInitialized();
    },
    from(table: string) {
        return new QueryBuilder(table);
    },
    rpc,
    auth: {
        async getUser() {
            const userStr = isBrowser ? localStorage.getItem(SESSION_KEY) : null;
            return { data: { user: userStr ? JSON.parse(userStr) : null }, error: null };
        },
    },
    storage: {
        from(bucket: string) {
            return {
                async upload(path: string, file: File) {
                    const reader = new FileReader();
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve(String(reader.result));
                        reader.onerror = () => reject(reader.error);
                        reader.readAsDataURL(file);
                    });
                    localStorage.setItem(getStorageUrl(bucket, path), dataUrl);
                    return { data: { path }, error: null };
                },
                getPublicUrl(path: string) {
                    return { data: { publicUrl: getStorageUrl(bucket, path) } };
                },
                async remove(paths: string[]) {
                    paths.forEach((path) => localStorage.removeItem(getStorageUrl(bucket, path)));
                    return { data: null, error: null };
                },
            };
        },
    },
};

export const uploadFile = async (
    bucket: string,
    path: string,
    file: File
): Promise<{ url?: string; error?: string }> => {
    const { error } = await pgliteClient.storage.from(bucket).upload(path, file);
    if (error) return { error: error.message };
    return { url: pgliteClient.storage.from(bucket).getPublicUrl(path).data.publicUrl };
};

export const deleteFile = async (
    bucket: string,
    path: string
): Promise<{ error?: string }> => {
    const { error } = await pgliteClient.storage.from(bucket).remove([path]);
    return error ? { error: error.message } : {};
};

export const getPublicUrl = (bucket: string, path: string): string => {
    return pgliteClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
};
