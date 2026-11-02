// Run with: node --test scripts/meter-paste.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, requireModule = require) {
    const filename = path.resolve(__dirname, '..', file);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const result = {};
    vm.runInThisContext(`(function(exports, require) { ${code}\n})`, { filename })(result, requireModule);
    return result;
}
const helpers = load('src/lib/meterPaste.ts');
const { parseMeterPaste, meterHistoryReadings } = helpers;
const { meterProgress, meterNeedsReview } = load('src/lib/meterProgress.ts');

test('meter progress counts partial readings, explicit zero, review and edited rooms', () => {
    const row = { waterMeterPrev: 0, electricityMeterPrev: 0, waterMeterCurr: '', electricityMeterCurr: '' };
    assert.deepEqual(meterProgress([]), { total: 0, water: 0, electricity: 0, complete: 0, pending: 0, review: 0, changed: 0, percent: 0 });
    assert.deepEqual(meterProgress([
        { ...row, waterMeterCurr: 0, electricityMeterCurr: 0 },
        { ...row, waterMeterCurr: 10, isDirty: true }, row,
        { ...row, waterMeterPrev: 100, waterMeterCurr: 90, electricityMeterCurr: 1, isDirty: true },
    ]), { total: 4, water: 3, electricity: 2, complete: 2, pending: 2, review: 1, changed: 2, percent: 63 });
    assert.equal(meterNeedsReview({ ...row, waterMeterCurr: NaN }), true);
});

test('the supplied Markdown table yields 14 rooms with one identical duplicate', () => {
    const sample = `| เลขห้อง | ยอดการใช้งาน (มิเตอร์น้ำ 4 ตัวแรก) |
| ------- | ---------------------------------- |
| 315 | 2083 |
| 325 | 631 |
| 308 | 1513 |
| 314 | 1280 |
| 311 | 1546 |
| 304 | 1280 |
| 304 | 1280 |
| 313 | 1560 |
| 306 | 2505 |
| 302 | 2510 |
| 322 | 615 |
| 316 | 1180 |
| 310 | 1099 |
| 323 | 1486 |
| 301 | 2370 |`;
    const result = parseMeterPaste(sample);
    assert.equal(result.readings.length, 14);
    assert.equal(result.duplicates, 1);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.readings.find(r => r.roomNumber === '304'), { roomNumber: '304', value: 1280 });
});

test('Sheets tabs, CSV, plain text, zero, decimals and grouped values are supported', () => {
    const result = parseMeterPaste('เลขห้อง\tน้ำ\r\n315\t2,083\r\n325,631\n308 1513.5\n301\t0');
    assert.deepEqual(result.errors, []);
    assert.deepEqual(result.readings.map(r => r.value), [2083, 631, 1513.5, 0]);
});

test('conflicting duplicates and malformed rows block import', () => {
    const result = parseMeterPaste('315\t2083\n315\t2084\n325\t\n308\t-1\n301\tNaN\n302,1,2');
    assert.equal(result.errors.length, 5);
    assert.equal(result.readings.length, 1);
    assert(result.errors[0].includes('315'));
    assert.deepEqual(parseMeterPaste(' \n').readings, []);
});

test('blank readings are omitted while explicit zero is preserved', () => {
    assert.deepEqual(meterHistoryReadings(2083, ''), { water_meter: 2083 });
    assert.deepEqual(meterHistoryReadings('', 0), { electricity_meter: 0 });
    assert.deepEqual(meterHistoryReadings('', ''), {});
});

function harness(file, initialState, overrides = {}) {
    const state = initialState;
    let cursor = 0;
    const mockRequire = name => {
        if (name in overrides) return overrides[name];
        if (name === 'react/jsx-runtime') return require(name);
        if (name.includes('meterPaste')) return helpers;
        if (name.includes('meterProgress')) return load('src/lib/meterProgress.ts');
        if (name === 'react') return {
            useState: initial => {
                const i = cursor++;
                if (!(i in state)) state[i] = initial;
                return [state[i], v => { state[i] = typeof v === 'function' ? v(state[i]) : v; }];
            },
            useMemo: fn => fn(), useEffect: () => {}, useRef: v => ({ current: v }),
        };
        return new Proxy({}, { get: (_, key) => {
            if (key === 'Card' || key === 'Table') return new Proxy({}, { get: (_, part) => `${key}.${part}` });
            if (key === 'createListCollection') return v => v;
            if (key === 'toaster') return { create: () => {} };
            return String(key);
        } });
    };
    const component = Object.values(load(file, mockRequire))[0];
    function flatten(n) {
        if (n == null || typeof n === 'boolean') return [];
        if (Array.isArray(n)) return n.flatMap(flatten);
        if (typeof n !== 'object') return [n];
        return [n, ...flatten(n.props?.children)];
    }
    return { state, render: props => { cursor = 0; return flatten(component(props)); } };
}

const room = { roomNumber: '315', roomId: 'id315', waterMeterPrev: 2000, waterMeterCurr: '', electricityMeterPrev: 100, electricityMeterCurr: 150, hasHistory: false };
const importProps = { month: '2026-11', rows: [room], disabled: false, onApply: () => {} };
const applyButton = nodes => nodes.find(n => n?.type === 'Button' && n.props.colorPalette === 'brand');

test('unknown rooms block apply, and lower or overwritten readings need confirmation', () => {
    const h = harness('src/components/meters/MeterPasteImport.tsx', ['999\t10', 'water', false]);
    assert.equal(applyButton(h.render(importProps)).props.disabled, true);
    h.state[0] = '315\t1999';
    assert.equal(applyButton(h.render(importProps)).props.disabled, true);
    h.state[2] = true;
    assert.equal(applyButton(h.render(importProps)).props.disabled, false);
    h.state[0] = '315\t2083'; h.state[2] = false;
    assert.equal(applyButton(h.render({ ...importProps, rows: [{ ...room, waterMeterCurr: 2080 }] })).props.disabled, true);
    h.state[0] = '315\t2083\n315\t2084'; h.state[2] = true;
    assert.equal(applyButton(h.render(importProps)).props.disabled, true);
});

test('valid paste applies the chosen meter and clears the paste input', () => {
    const h = harness('src/components/meters/MeterPasteImport.tsx', ['315\t2083', 'water', false]);
    let applied;
    const button = applyButton(h.render({ ...importProps, onApply: (...args) => { applied = args; } }));
    assert.equal(button.props.disabled, false);
    button.props.onClick();
    assert.deepEqual(applied, ['water', [{ roomNumber: '315', value: 2083 }]]);
    assert.equal(h.state[0], '');
    assert.equal(applyButton(h.render({ ...importProps, disabled: true })).props.disabled, true);
});

test('page applies by room number despite a room filter, saves changed rooms only, and preserves blank electricity', async () => {
    const writes = [];
    const h = harness('src/pages/admin/MeterManagementPage.tsx', [
        '2026-11', false,
        [{ ...room, electricityMeterCurr: '' }, { ...room, roomNumber: '325', roomId: 'id325', waterMeterCurr: 631 }],
        false, ['id325'], { items: [] }, true, '2026-11',
    ], {
        'firebase/firestore': {
            writeBatch: () => ({ set: (...args) => writes.push(args), commit: async () => {} }),
            doc: (_, collection, id) => `${collection}/${id}`,
            collection: () => ({}), query: () => ({}), where: () => ({}), orderBy: () => ({}),
            getDocs: async () => ({ docs: [] }),
        },
        '../../lib/firebase': { db: {} },
        '../../lib/firestoreUtils': { nowIso: () => 'now', fetchByIds: async () => new Map() },
        '../../types': { ContractStatus: { ACTIVE: 'active' } },
    });
    let nodes = h.render();
    nodes.find(n => n?.type === 'MeterPasteImport').props.onApply('water', [{ roomNumber: '315', value: 2083 }]);
    assert.equal(h.state[2][0].waterMeterCurr, 2083);
    assert.equal(h.state[2][1].waterMeterCurr, 631);
    assert.equal(writes.length, 0, 'Applying a paste must not save automatically');
    nodes = h.render();
    await nodes.find(n => n?.type === 'Button' && n.props.onClick?.name === 'handleSave').props.onClick();
    assert.equal(writes.length, 1);
    assert.equal(writes[0][0], 'history_meter/id315_2026-11');
    assert.equal(writes[0][1].water_meter, 2083);
    assert(!('electricity_meter' in writes[0][1]));
    assert.deepEqual(writes[0][2], { merge: true });
});
