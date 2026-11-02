// Run with: node --test scripts/filter-regression.test.cjs
// Exercise real service methods with an in-memory Firestore boundary.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const indexes = JSON.parse(fs.readFileSync(path.join(root, 'firestore.indexes.json'), 'utf8')).indexes;

function load(relative, mocks = {}, fallback) {
    const filename = path.join(root, relative);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const result = {};
    vm.runInThisContext(`(function(exports, require) { ${code}\n})`, { filename })(result, (name) => {
        if (name in mocks) return mocks[name];
        if (fallback) return fallback(name);
        if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`)), mocks);
        return require(name);
    });
    return result;
}

function services(tables) {
    const docs = (name) => (tables[name] || []).map(row => ({ id: row.id, data: () => row }));
    const firestore = {
        collection: (_, name) => ({ name, constraints: [] }),
        where: (field, op, value) => ({ field, op, value }),
        orderBy: (field, direction) => ({ field, direction }),
        query: (ref, ...constraints) => ({ ...ref, constraints }),
        getDocs: async ({ name, constraints }) => {
            // Catch combinations that would need an undeclared composite index.
            const fields = [...new Set(constraints.map(c => c.field))];
            if (fields.length > 1 && constraints.some(c => c.direction)) {
                assert(indexes.some(index => index.collectionGroup === name &&
                    fields.every(field => index.fields.some(f => f.fieldPath === field)) &&
                    constraints.filter(c => c.direction).every(c => index.fields.some(f =>
                        f.fieldPath === c.field && f.order === (c.direction === 'desc' ? 'DESCENDING' : 'ASCENDING')
                    ))), `Missing index for ${name}: ${JSON.stringify(constraints)}`);
            }
            let result = docs(name);
            for (const c of constraints) {
                if (c.direction) {
                    result = result.filter(d => d.data()[c.field] !== undefined).sort((a, b) =>
                        String(a.data()[c.field]).localeCompare(String(b.data()[c.field])) * (c.direction === 'desc' ? -1 : 1));
                } else {
                    result = result.filter(d => {
                        const value = d.data()[c.field];
                        if (c.op === '==') return value === c.value;
                        if (c.op === '>=') return value >= c.value;
                        if (c.op === '<') return value < c.value;
                        if (c.op === '<=') return value <= c.value;
                        throw new Error(`Unsupported operator ${c.op}`);
                    });
                }
            }
            return { docs: result, forEach: fn => result.forEach(fn) };
        },
    };
    const utils = {
        withId: d => ({ ...d.data(), id: d.id }),
        fetchByIds: async (name, ids) => new Map((tables[name] || []).filter(r => ids.includes(r.id)).map(r => [r.id, r])),
        fetchWhereIn: async (name, field, ids, ...constraints) => (tables[name] || []).filter(r =>
            ids.includes(r[field]) && constraints.every(c => r[c.field] === c.value)),
    };
    const mocks = { 'firebase/firestore': firestore, '../lib/firebase': { db: {} }, '../lib/firestoreUtils': utils, './authService': {} };
    return { mocks, load: file => load(`src/services/${file}.ts`, mocks) };
}

test('month bounds cover leap years and year rollover without timezone conversion', () => {
    const { billingMonthBounds } = load('src/lib/billingMonth.ts');
    assert.deepEqual(billingMonthBounds('2024-02'), { start: '2024-02', end: '2024-03' });
    assert.deepEqual(billingMonthBounds('2026-12'), { start: '2026-12', end: '2027-01' });
});

test('tenant status, room, search and vehicle filters work together without a composite index', async () => {
    const { tenantService } = services({
        tenants: [
            { id: 'a', status: 'active', full_name: 'Alice', phone: '081234', current_room_id: 'r1', created_at: '2026-01-01' },
            { id: 'b', status: 'inactive', full_name: 'Bob', created_at: '2026-01-02', vehicles: [{ plate: 'OLD 123' }] },
            { id: 'c', status: 'pending', full_name: 'Carol', created_at: '2026-01-03' },
        ],
        contracts: [{ id: 'c1', tenant_id: 'a', room_id: 'r1', status: 'active' }],
        rooms: [{ id: 'r1', room_number: '101' }],
        vehicles: [{ id: 'v1', room_id: 'r1', plate: 'AB 456' }],
    }).load('tenantService');
    const ids = async filters => (await tenantService.getTenants(filters)).map(t => t.id);
    assert.deepEqual(await ids({ status: 'inactive' }), ['b']);
    assert.deepEqual(await ids({ status: 'pending' }), ['c']);
    assert.deepEqual(await ids({ status: 'active', roomId: 'r1', searchTerm: ' ALICE ', vehiclePlate: ' ab 456 ' }), ['a']);
    assert.deepEqual(await ids({ vehiclePlate: ' old 123 ' }), ['b']);
    assert.deepEqual(await ids({ vehiclePlate: '   ' }), ['a', 'c', 'b']);
    assert.deepEqual(await ids({ status: 'active', vehiclePlate: 'missing' }), []);
});

const invoices = [
    { id: 'short', billing_month: '2024-02', status: 'paid', room_id: 'r1', tenant_id: 't1' },
    { id: 'first', billing_month: '2024-02-01', status: 'pending', room_id: 'r1', tenant_id: 't1' },
    { id: 'last', billing_month: '2024-02-29', status: 'paid', room_id: 'r1', tenant_id: 't1' },
    { id: 'time', billing_month: '2024-02-29T23:59:59', status: 'paid', room_id: 'r1', tenant_id: 't1' },
    { id: 'next', billing_month: '2024-03-01', status: 'paid', room_id: 'r1', tenant_id: 't1' },
    { id: 'previous', billing_month: '2024-01-31', status: 'cancelled', room_id: 'r1', tenant_id: 't1' },
];
const invoiceTables = { invoices, rooms: [{ id: 'r1', room_number: '101' }], tenants: [{ id: 't1', full_name: 'Alice' }] };

test('invoice month includes the last day and excludes neighboring months', async () => {
    const { invoiceService } = services(invoiceTables).load('invoiceService');
    assert.deepEqual(new Set((await invoiceService.getInvoices(undefined, undefined, '2024-02')).map(i => i.id)),
        new Set(['short', 'first', 'last', 'time']));
    assert.deepEqual(new Set((await invoiceService.getInvoices(' ALICE ', 'paid', '2024-02')).map(i => i.id)),
        new Set(['short', 'last', 'time']));
});

test('invoice status works with all months and with missing relation fields', async () => {
    const { invoiceService } = services({ ...invoiceTables, tenants: [{ id: 't1' }], rooms: [{ id: 'r1' }] }).load('invoiceService');
    assert.equal((await invoiceService.getInvoices(undefined, 'paid')).length, 4);
    assert.deepEqual(await invoiceService.getInvoices('missing', 'paid'), []);
});

test('financial report uses the same complete month and status bounds', async () => {
    const { reportService } = services(invoiceTables).load('reportService');
    assert.deepEqual(new Set((await reportService.getFinancialReport('2024-02', 'paid')).map(i => i.id)),
        new Set(['short', 'last', 'time']));
});

test('monthly Excel export includes last-day invoices', async () => {
    const context = services({
        ...invoiceTables,
        invoices: invoices.map(invoice => ({ ...invoice, room_id: invoice.id, rent_amount: 1 })),
        rooms: invoices.map(invoice => ({ id: invoice.id, room_number: invoice.id })),
    });
    let exportedRows;
    context.mocks.xlsx = { utils: { aoa_to_sheet: rows => { exportedRows = rows; return {}; }, book_new: () => ({}), book_append_sheet: () => {} }, write: () => new Uint8Array() };
    context.mocks['file-saver'] = { saveAs: () => {} };
    const { exportService } = context.load('exportService');
    await exportService.exportMonthlyInvoices('2024-02');
    // Rooms outside the selected month have no rent in their export row.
    assert.deepEqual(new Set(exportedRows.filter(row => row[5] === 1).map(row => row[0])),
        new Set(['short', 'first', 'last', 'time']));
});

test('contract and vehicle searches ignore surrounding whitespace and case', async () => {
    const context = services({ ...invoiceTables,
        contracts: [{ id: 'c1', tenant_id: 't1', room_id: 'r1', end_date: '2027-01-01', status: 'active' }],
        vehicles: [{ id: 'v1', plate: 'AB 123', room_id: 'r1', created_at: '2026-01-01' }],
    });
    context.mocks['./roomService'] = { roomService: { getRooms: async () => invoiceTables.rooms } };
    const { contractService } = context.load('contractService');
    const { vehicleService } = context.load('vehicleService');
    assert.equal((await contractService.getContracts({ searchTerm: ' ALICE ', status: 'active' })).length, 1);
    assert.equal((await contractService.getContracts({ searchTerm: ' 101 ' })).length, 1);
    assert.equal((await vehicleService.getVehicles({ plate: ' ab 123 ' })).length, 1);
});

function componentHarness(file, hookResults = {}, mocks = {}) {
    const state = [];
    let cursor = 0;
    const effects = [];
    const react = {
        useState: initial => {
            const index = cursor++;
            if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
            return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
        },
        useMemo: fn => fn(), useRef: value => ({ current: value }),
        useEffect: fn => { effects.push(fn); },
    };
    const module = load(file, { react, ...mocks }, name => {
        if (name === 'react/jsx-runtime') return require(name);
        return new Proxy({}, { get: (_, key) => {
            if (key === 'Card') return { Root: 'Card.Root', Body: 'Card.Body' };
            if (key === 'Tabs') return { Root: 'Tabs.Root', List: 'Tabs.List', Trigger: 'Tabs.Trigger' };
            if (key === 'createListCollection') return value => value;
            if (String(key).startsWith('use')) return () => hookResults[key] || { data: [], isLoading: false, isError: true, refetch: () => {} };
            return String(key);
        } });
    });
    const component = Object.values(module)[0];
    function flatten(node) {
        if (node == null || typeof node === 'boolean') return [];
        if (Array.isArray(node)) return node.flatMap(flatten);
        if (typeof node !== 'object') return [node];
        return [node, ...flatten(node.props?.children)];
    }
    return { state, effects, render: () => { cursor = 0; return flatten(component()); } };
}

test('list pages display load errors with a working retry action', () => {
    for (const page of ['TenantsPage', 'ContractsPage', 'VehicleRegistryPage', 'EquipmentRegistryPage', 'MaintenancePage']) {
        let retries = 0;
        const query = { data: [], isLoading: false, isError: true, refetch: () => retries++ };
        const hooks = Object.fromEntries(['useTenants', 'useContracts', 'useVehicleRegistry', 'useRooms', 'useQuery'].map(name => [name, query]));
        const nodes = componentHarness(`src/pages/admin/${page}.tsx`, hooks).render();
        const error = nodes.find(node => node?.type === 'DataLoadError');
        assert(error, page);
        error.props.onRetry();
        assert.equal(retries, 1, page);
    }
});

test('invoice page can retry latest-month failures and use an explicitly selected month', () => {
    let retries = 0;
    const harness = componentHarness('src/pages/admin/InvoicesPage.tsx', {
        useLatestInvoiceMonth: { isLoading: false, isError: true, refetch: () => retries++ },
        useInvoices: { data: [], isLoading: false, isError: false },
    });
    harness.render().find(node => node?.type === 'DataLoadError').props.onRetry();
    assert.equal(retries, 1);
    harness.state[3] = '2026-02';
    assert(!harness.render().some(node => node?.type === 'DataLoadError'));
});

test('equipment search ignores surrounding whitespace', () => {
    const harness = componentHarness('src/pages/admin/EquipmentRegistryPage.tsx', {
        useRooms: { data: [{ id: 'r1', equipment: [{ name: 'Desk', asset_number: 'A123' }] }], isLoading: false, isError: false },
    });
    harness.state[0] = ' a123 ';
    assert.equal(harness.render().find(node => node?.type === 'EquipmentTable').props.rooms.length, 1);
});

test('report responses from previous filters cannot overwrite the selected month', async () => {
    for (const [component, method, dataIndex] of [['FinancialReport', 'getFinancialReport', 2], ['UtilitiesReport', 'getUtilityReport', 1]]) {
        const pending = [];
        const harness = componentHarness(`src/components/reports/${component}.tsx`, {}, {
            '../../services/reportService': { reportService: { [method]: () => new Promise(resolve => pending.push(resolve)) } },
        });
        harness.render();
        const cleanup = harness.effects.pop()();
        cleanup();
        harness.state[0] = '2024-02';
        harness.render();
        harness.effects.pop()();
        const currentRows = [{ id: 'new', total_amount: 0 }];
        pending[1](currentRows);
        await new Promise(setImmediate);
        pending[0]([{ id: 'old', total_amount: 0 }]);
        await new Promise(setImmediate);
        assert.deepEqual(harness.state[dataIndex], currentRows, component);
        harness.state[0] = '';
        harness.render();
        harness.effects.pop()();
        assert.deepEqual(harness.state[dataIndex], [], component);
        assert.equal(pending.length, 2, 'An empty month must not issue a query');
    }
});
