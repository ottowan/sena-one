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
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const file = args.find(arg => !arg.startsWith('--')) || path.join(root, 'asset/asset-sena1b1.xlsx');
const projectId = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8')).projects.default;
const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
const decode = value => value.nullValue !== undefined ? null : value.stringValue ?? (value.integerValue !== undefined ? Number(value.integerValue) : value.doubleValue ?? value.booleanValue ??
    (value.arrayValue ? (value.arrayValue.values || []).map(decode) : value.mapValue ? Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])) : undefined));
const encode = value => typeof value === 'string' ? { stringValue: value } : typeof value === 'number' ? { doubleValue: value } : typeof value === 'boolean' ? { booleanValue: value } : Array.isArray(value) ? { arrayValue: { values: value.map(encode) } } : { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };

async function main() {
    const workbook = XLSX.readFile(file);
    const parsed = parseAssetRows(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false }));
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
    const plan = planAssetImport(rooms, parsed.candidates);
    const report = { mode: apply ? 'apply' : 'dry-run', project: projectId, source: path.basename(file),
        source_rooms: new Set(parsed.candidates.map(item => item.room_number)).size,
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
