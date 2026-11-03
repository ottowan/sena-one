const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(file) {
    const filename = path.resolve(root, file);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const output = {};
    vm.runInThisContext(`(function(exports, require){${code}\n})`, { filename })(output, name => name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name));
    return output;
}
const { validateSurveyAnswers, validateSurveyYear } = load('src/lib/equipmentSurveyDomain.ts');
const { parseAssetRows, planAssetImport, isMissingAssetNumber } = load('src/lib/assetImport.ts');
const items = [{ id: 'a', name: 'เตียง' }, { id: 'b', name: 'ตู้' }];
test('abnormal conditions require a real reason and only the five allowed states are accepted', () => {
    for (const condition of ['damaged', 'deteriorated', 'lost', 'unnecessary']) {
        for (const reason of ['', '  ', '-', 'ปกติ']) assert.throws(() => validateSurveyAnswers(items, [{ equipment_id: 'a', condition, reason }, { equipment_id: 'b', condition: 'normal', reason: '' }]));
        const result = validateSurveyAnswers(items, [{ equipment_id: 'a', condition, reason: ' ขาหักจากการใช้งาน ' }, { equipment_id: 'b', condition: 'normal', reason: '' }]);
        assert.equal(result[0].reason, 'ขาหักจากการใช้งาน');
    }
    for (const condition of ['bad', ['normal'], {}, '__proto__']) assert.throws(() => validateSurveyAnswers(items, [{ equipment_id: 'a', condition, reason: 'หมายเหตุ' }, { equipment_id: 'b', condition: 'normal', reason: '' }]));
});
test('survey answers must match all snapshot items exactly once', () => {
    assert.throws(() => validateSurveyAnswers(items, []));
    assert.throws(() => validateSurveyAnswers(items, [{ equipment_id: 'a', condition: 'normal' }, { equipment_id: 'a', condition: 'normal' }]));
    assert.throws(() => validateSurveyAnswers(items, [{ equipment_id: 'a', condition: 'normal' }, { equipment_id: 'c', condition: 'normal' }]));
    assert.throws(() => validateSurveyAnswers(items, [{ equipment_id: 'a', condition: 'normal', reason: 'x'.repeat(2001) }, { equipment_id: 'b', condition: 'normal' }]));
    assert.equal(validateSurveyYear(2026), 2026);
    for (const year of [2569, '2026', 0, 2026.5, null]) assert.throws(() => validateSurveyYear(year));
});
function sheet(...rows) {
    const header = Array(26).fill(''); header[1] = 'อาคาร/เลขที่ห้อง'; header[2] = 'เครื่องปรับอากาศ'; header[14] = 'พัดลม';
    return [header, ...rows.map(data => { const row = Array(26).fill(''); for (const [key, value] of Object.entries(data)) row[Number(key)] = value; return row; })];
}
test('spreadsheet import splits bed/mattress, fan ranges and shorthand without importing respondent names or conditions', () => {
    const parsed = parseAssetRows(sheet({ 0: 'private name', 1: '1470/301', 2: '4120-004-0002/232', 3: 'ชำรุด', 5: 'ที่นอน 7105-008-0003/376,เตียง 7105-002-0003/240', 14: '4140-005-0001/147-148' },
        { 1: '1470/302', 14: '4140-005-0001/123 และ124' }));
    assert.deepEqual(parsed.warnings, []);
    assert.equal(parsed.candidates.length, 7);
    assert.equal(parsed.candidates.find(item => item.category === 'mattress').asset_number, '7105-008-0003/376');
    assert.deepEqual(parsed.candidates.filter(item => item.category === 'fan').map(item => item.asset_number), ['4140-005-0001/147','4140-005-0001/148','4140-005-0001/123','4140-005-0001/124']);
    assert(!JSON.stringify(parsed).includes('private name'));
    assert(!JSON.stringify(parsed).includes('ชำรุด'));
});
test('placeholder numbers and an obvious category mismatch are skipped', () => {
    for (const value of ['', '-', '0', '000', 'ไม่มีเลข', 'ไม่พบเลขที่เครื่อง']) assert(isMissingAssetNumber(value));
    const result = parseAssetRows(sheet({ 1: '1470/306', 2: '4140-005-0001/128', 5: '0', 8: 'ไม่มีสติ๊กเกอร์ครุภัณฑ์', 20: 'มี', 23: 'ไม่มี' }));
    assert.equal(result.candidates.length, 0);
    assert.equal(result.warnings.length, 1);
});
test('fill missing numbers only, preserve IDs and other fields, and repeat imports are idempotent', () => {
    const rooms = [{ id: 'r1', room_number: '301', equipment: [
        { id: 'old', name: 'เครื่องปรับอากาศ', asset_number: 'OLD/1', note: 'keep' },
        { id: 'fan1', name: 'พัดลมติดผนัง', asset_number: '' },
        { id: 'fan2', name: 'พัดลมติดผนัง', asset_number: 'ไม่มีเลข' },
    ] }];
    const { candidates } = parseAssetRows(sheet({ 1: '1470/301', 2: '4120-004-0002/232', 14: '4140-005-0001/117, 4140-005-0001/118' }));
    const result = planAssetImport(rooms, candidates);
    assert.equal(result.filled, 2);
    assert.deepEqual(result.changes[0].equipment[0], rooms[0].equipment[0]);
    assert.equal(result.changes[0].equipment[1].id, 'fan1');
    assert.equal(rooms[0].equipment[1].asset_number, '', 'The preview must not mutate the live data');
    const updated = [{ ...rooms[0], equipment: result.changes[0].equipment }];
    assert.equal(planAssetImport(updated, candidates).filled, 0);
});
test('duplicate room answers, unknown rooms, conflicting codes and cross-room duplicates cannot overwrite records', () => {
    const parsed = parseAssetRows(sheet({ 1: '1470/301', 2: '4120-004-0002/232' }, { 1: '1470/301', 2: '4120-004-0002/232' }));
    assert.equal(parsed.candidates.length, 1);
    assert.equal(planAssetImport([], parsed.candidates).filled, 0);
    const rooms = [{ id: 'r1', room_number: '301', equipment: [{ id: 'a', name: 'เครื่องปรับอากาศ', asset_number: '' }] },
        { id: 'r2', room_number: '302', equipment: [{ id: 'b', name: 'เครื่องปรับอากาศ', asset_number: '41200040002/232' }] }];
    assert.equal(planAssetImport(rooms, parsed.candidates).filled, 0);
    const conflicting = [...parsed.candidates, { ...parsed.candidates[0], asset_number: '4120-004-0002/233' }];
    assert.equal(planAssetImport([rooms[0]], conflicting).filled, 0);
    assert.throws(() => parseAssetRows([['unrelated sheet']]));
});
