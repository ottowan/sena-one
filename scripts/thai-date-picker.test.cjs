// Run with: node --test scripts/thai-date-picker.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, resolver = require) {
    const filename = path.resolve(__dirname, '..', file);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const result = {};
    vm.runInThisContext(`(function(exports, require){${code}\n})`, { filename })(result, resolver);
    return result;
}
const calendar = load('src/lib/thaiCalendar.ts');

test('Thai labels display Buddhist years while storage values use Gregorian years', () => {
    assert.equal(calendar.thaiCalendarLabel('2026-11', 'month'), 'พฤศจิกายน 2569');
    assert.equal(calendar.thaiCalendarLabel('2024-02-29', 'date'), '29 กุมภาพันธ์ 2567');
    assert.equal(calendar.calendarValue(2024, 1, 29), '2024-02-29');
    assert.equal(calendar.calendarValue(2026, 10), '2026-11');
    assert.equal(calendar.thaiCalendarLabel('', 'month'), '');
});

test('calendar aligns weekdays and handles leap years and December', () => {
    assert.equal(calendar.calendarDays(2024, 1).filter(Boolean).length, 29);
    assert.equal(calendar.calendarDays(2025, 1).filter(Boolean).length, 28);
    assert.equal(calendar.calendarDays(2026, 10)[0], 1); // Sunday
    assert.equal(calendar.calendarDays(2026, 11).filter(Boolean).length, 31);
});

function picker(props) {
    const state = [false, 2026, 10];
    let cursor = 0;
    const { ThaiDatePicker } = load('src/components/common/ThaiDatePicker.tsx', name => {
        if (name === 'react/jsx-runtime') return require(name);
        if (name.includes('thaiCalendar')) return calendar;
        if (name === 'react') return { useState: () => { const i = cursor++; return [state[i], v => { state[i] = v; }]; } };
        return new Proxy({}, { get: (_, key) => key === 'useFieldContext' ? () => undefined : String(key) });
    });
    const flatten = node => Array.isArray(node) ? node.flatMap(flatten) :
        node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [node];
    return { state, render: () => { cursor = 0; return flatten(ThaiDatePicker(props)); } };
}

test('month picker shows Thai months and emits ISO values', () => {
    let selected;
    const h = picker({ type: 'month', value: '2026-11', onChange: e => { selected = e.target.value; } });
    const nodes = h.render();
    assert(nodes.includes('พฤศจิกายน 2569'));
    nodes.find(n => n?.type === 'Button' && n.props.children === 'ธันวาคม').props.onClick();
    assert.equal(selected, '2026-12');
    assert.equal(h.state[0], false);
});

test('opening a date picker uses the selected date and can choose a leap day', () => {
    let selected;
    const h = picker({ value: '2024-02-01', onChange: e => { selected = e.target.value; } });
    h.render().find(n => n?.type === 'PopoverRoot').props.onOpenChange({ open: true });
    assert.deepEqual(h.state, [true, 2024, 1]);
    h.render().find(n => n?.type === 'Button' && n.props['aria-label'] === '29 กุมภาพันธ์ 2567').props.onClick();
    assert.equal(selected, '2024-02-29');
});

test('clear, disabled state, and year rollover work', () => {
    let selected = '2026-11';
    const h = picker({ value: '2026-11-01', onChange: e => { selected = e.target.value; } });
    h.state[2] = 11;
    h.render().find(n => n?.type === 'Button' && n.props['aria-label'] === 'เดือนถัดไป').props.onClick();
    assert.equal(h.state[1], 2027);
    assert.equal(h.state[2], 0);
    h.render().find(n => n?.type === 'Button' && n.props.children === 'ล้างค่า').props.onClick();
    assert.equal(selected, '');
    const disabled = picker({ type: 'month', value: '', disabled: true, onChange: () => {} });
    assert.equal(disabled.render().find(n => n?.type === 'PopoverTrigger').props.children.props.disabled, true);
});
