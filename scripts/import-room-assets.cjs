// Default is read-only. Explicit --apply fills missing asset numbers only.
// Uses the locally signed-in Firebase CLI account; never prints credentials.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const cliAuth = require('firebase-tools/lib/auth');
const root = path.resolve(__dirname, '..');
function load(file) {
    const filename = path.resolve(root, file);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const output = {};
    vm.runInThisContext(`(function(exports, require){${code}\n})`, { filename })(output, name => name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), `${name}.ts`))) : require(name));
    return output;
}
const { parseAssetRows, planAssetImport } = load('src/lib/assetImport.ts');
const { auditAssetRows } = load('src/lib/assetAudit.ts');
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const audit = args.includes('--audit');
const confirmations = args.filter(arg => arg.startsWith('--confirm-category=')).map(arg => {
    const value = arg.slice('--confirm-category='.length);
    const match = value.match(/^(\d{3,4}):(air|bed|mattress|wardrobe|sink|fan|stove|water|electricity):([0-9/-]+)$/);
    if (!match) throw new Error('Category confirmation must be ROOM:CATEGORY:ASSET_NUMBER.');
    return { room_number: match[1], category: match[2], asset_number: match[3] };
});
const file = args.find(arg => !arg.startsWith('--')) || path.join(root, 'asset/asset-sena1b1.xlsx');
const projectId = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8')).projects.default;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const decode = value => value.nullValue !== undefined ? null : value.stringValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue ?? value.booleanValue ??
    (value.arrayValue ? (value.arrayValue.values || []).map(decode) : value.mapValue ? Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])) : undefined));
const encode = value => typeof value === 'string' ? { stringValue: value } : typeof value === 'number' ? { doubleValue: value } : typeof value === 'boolean' ? { booleanValue: value } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };

async function main() {
    if (audit && apply) throw new Error('--audit is read-only and cannot be combined with --apply.');
    const workbook = XLSX.readFile(file);
    const sourceRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false });
    const parsed = parseAssetRows(sourceRows, confirmations);
    if (confirmations.some(item => !parsed.candidates.some(candidate => candidate.room_number === item.room_number && candidate.category === item.category && candidate.asset_number.replace(/[^a-z0-9]/gi, '').toLowerCase() === item.asset_number.replace(/[^a-z0-9]/gi, '').toLowerCase()))) {
        throw new Error('A confirmed code was not found in the specified room and category in the source file.');
    }
    const account = cliAuth.getProjectDefaultAccount(root) || cliAuth.getGlobalDefaultAccount();
    if (!account?.tokens?.refresh_token) throw new Error('No signed-in Firebase CLI account is available.');
    const token = await cliAuth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
    const request = async (url, options = {}) => {
        const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' } });
        const data = await response.json();
        if (!response.ok) throw new Error(`Firestore ${response.status}: ${data.error?.message || 'request failed'}`);
        return data;
    };
    const docs = [];
    let pageToken;
    do {
        const data = await request(`${base}/rooms?pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`);
        docs.push(...(data.documents || [])); pageToken = data.nextPageToken;
    } while (pageToken);
    const rooms = docs.map(doc => ({ id: doc.name.split('/').pop(), ...Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [k, decode(v)])) }));
    if (audit) {
        const result = auditAssetRows(sourceRows, rooms);
        fs.mkdirSync(path.join(root, 'backups'), { recursive: true });
        const prefix = path.join(root, 'backups', `asset-audit-${Date.now()}`);
        fs.writeFileSync(`${prefix}.json`, JSON.stringify({ project: projectId, source: path.basename(file), audited_at: new Date().toISOString(), ...result }, null, 2));
        const escape = value => String(value).replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
        const lines = [
            '# ผลเทียบเลขครุภัณฑ์ Excel กับทะเบียนจริง', '',
            `ตรวจเมื่อ ${new Date().toISOString()} · ไฟล์ ${path.basename(file)} · Project ${projectId}`, '',
            `ไฟล์มี ${result.source_rows} แถวข้อมูล / ${result.source_rooms} ห้อง · ระบบมี ${result.system_rooms} ห้อง`, '',
            'จำนวนในตารางนับเลขที่พบจริง ไม่รวมคำว่า มี/ไม่มี/ไม่พบ/0 และแยกรายการใหม่ออกจากเลขที่มีอยู่แล้ว', '',
            '| ห้อง | แถว Excel | เลขในไฟล์ | ตรงทะเบียน | พร้อมเติม | รอตรวจสอบ | เลขในระบบทั้งหมด |',
            '| --- | --- | ---: | ---: | ---: | ---: | ---: |',
            ...result.summary.map(room => `| ${room.room} | ${room.source_rows.join(', ')} | ${room.source_codes} | ${room.matched} | ${room.ready_to_fill} | ${room.needs_review} | ${room.registered_codes} |`), '',
            `ห้องในระบบที่ไม่มีแถวใน Excel: ${result.rooms_without_source.join(', ')}`, '',
            '## เทียบทีละช่องต้นทาง', '',
            '| ห้อง | เซลล์ | ข้อความเลขครุภัณฑ์ต้นทาง | ผลเทียบเลข |', '| --- | --- | --- | --- |',
            ...result.cells.map(cell => `| ${cell.room} | ${cell.cell} | ${escape(cell.source_value)} | ${cell.codes.length ? cell.codes.map(code => escape(`${code.asset_number}: ${code.status}; ทะเบียนประเภทนี้=${code.registered.join(', ') || '-'}${code.elsewhere.length ? '; พบห้องอื่น=' + code.elsewhere.map(item => item.room).join(', ') : ''}`)).join('<br>') : 'ไม่มีเลขระบุในช่องนี้'} |`), '',
            'matched = ตรงกัน; format_difference = ต่างเฉพาะเครื่องหมาย; needs_classification = ต้องยืนยันประเภท; conflict = เลขไม่ตรงหรือช่องไม่พอ; registered_elsewhere = พบเลขในห้องอื่น; ready_to_fill = เติมได้โดยไม่ทับเลขเดิม', '',
            '## เลขซ้ำในทะเบียนปัจจุบัน', '',
            ...result.duplicate_registry_codes.map(items => `- ${items.map(item => `${item.room}: ${item.name} ${item.asset_number}`).join(' / ')}`), '',
            `เลขในไฟล์ที่ใช้ซ้ำข้ามห้อง: ${result.duplicate_source_codes.length ? result.duplicate_source_codes.map(item => `${item.key} ห้อง ${item.rooms.join(', ')}`).join('; ') : 'ไม่พบ'}`, '',
            '## คำเตือน', '', ...result.warnings.map(warning => `- ${warning}`), '',
            'รายงานนี้อ่านข้อมูลอย่างเดียว ไม่แก้ทะเบียน และไม่ดึงชื่อผู้ตอบ/ผลตรวจเดิมจาก Excel', '',
        ];
        fs.writeFileSync(`${prefix}.md`, lines.join('\n'));
        console.log(JSON.stringify({ mode: 'audit', project: projectId, source_rows: result.source_rows, source_rooms: result.source_rooms, system_rooms: result.system_rooms, summary: result.summary, rooms_without_source: result.rooms_without_source, duplicate_registry_codes: result.duplicate_registry_codes, warnings: result.warnings, reports: [`${prefix}.md`, `${prefix}.json`] }, null, 2));
        return;
    }
    const plan = planAssetImport(rooms, parsed.candidates);
    const report = { mode: apply ? 'apply' : 'dry-run', project: projectId, source: path.basename(file),
        source_rooms: new Set(sourceRows.slice(1).map(row => String(row[1] ?? '').trim().match(/(?:^|\/)(\d{3,4})$/)?.[1]).filter(Boolean)).size,
        source_rooms_with_importable_codes: new Set(parsed.candidates.map(item => item.room_number)).size,
        matched_rooms: plan.changes.length, filled: plan.filled,
        rooms: plan.changes.map(room => ({ room: room.room_number, filled: room.filled })), warnings: [...parsed.warnings, ...plan.warnings] };
    if (apply && plan.changes.length) {
        if (plan.changes.length > 450) throw new Error('Import exceeds the 450-room limit.');
        fs.mkdirSync(path.join(root, 'backups'), { recursive: true });
        fs.writeFileSync(path.join(root, 'backups', `room-assets-${Date.now()}.json`), JSON.stringify(docs.filter(doc => plan.changes.some(room => doc.name.endsWith(`/${room.room_id}`))), null, 2));
        const writes = plan.changes.map(room => {
            const original = docs.find(doc => doc.name.endsWith(`/${room.room_id}`));
            return { update: { name: original.name, fields: { equipment: encode(room.equipment), updated_at: encode(new Date().toISOString()) } },
                updateMask: { fieldPaths: ['equipment', 'updated_at'] }, currentDocument: { updateTime: original.updateTime } };
        });
        await request(`${base}:commit`, { method: 'POST', body: JSON.stringify({ writes }) });
    }
    console.log(JSON.stringify(report, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
