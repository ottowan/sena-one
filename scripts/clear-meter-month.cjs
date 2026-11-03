// Read-only by default. --apply backs up and deletes only the requested month's readings.
const fs = require('node:fs');
const path = require('node:path');
const auth = require('firebase-tools/lib/auth');
const root = path.resolve(__dirname, '..');
const month = process.argv.find(arg => /^\d{4}-\d{2}$/.test(arg));
const apply = process.argv.includes('--apply');
async function main() {
    if (!month || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Specify a month as YYYY-MM. Add --apply to clear it.');
    const project = JSON.parse(fs.readFileSync(path.join(root, '.firebaserc'), 'utf8')).projects.default;
    const account = auth.getProjectDefaultAccount(root) || auth.getGlobalDefaultAccount();
    const token = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
    const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
    const request = async (suffix, body) => {
        const res = await fetch(base + suffix, { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok) throw new Error(`Firestore ${res.status}: ${data.error?.message || 'request failed'}`);
        return data;
    };
    const query = async () => (await request(':runQuery', { structuredQuery: { from: [{ collectionId: 'history_meter' }], where: { fieldFilter: { field: { fieldPath: 'month' }, op: 'EQUAL', value: { stringValue: month } } } } })).flatMap(row => row.document ? [row.document] : []);
    const docs = await query();
    if (docs.some(doc => doc.fields.month?.stringValue !== month || !doc.name.includes('/documents/history_meter/'))) throw new Error('Unexpected document outside the selected month.');
    if (docs.length > 450) throw new Error('More than 450 readings; refusing a partial clear.');
    let backup;
    if (apply && docs.length) {
        const directory = path.join(root, 'backups');
        fs.mkdirSync(directory, { recursive: true });
        backup = path.join(directory, `meter-${month}-before-clear-${Date.now()}.json`);
        fs.writeFileSync(backup, JSON.stringify({ project, month, backedUpAt: new Date().toISOString(), documents: docs }, null, 2), { flag: 'wx' });
        await request(':commit', { writes: docs.map(doc => ({ delete: doc.name, currentDocument: { updateTime: doc.updateTime } })) });
        const remaining = await query();
        if (remaining.length) throw new Error(`Clear committed but ${remaining.length} readings remain; inspect concurrent writes.`);
    }
    console.log(JSON.stringify({ project, month, mode: apply ? 'apply' : 'dry-run', matched: docs.length, deleted: apply ? docs.length : 0, backup }, null, 2));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
