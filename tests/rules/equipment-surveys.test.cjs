const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, setDoc, updateDoc, collection, serverTimestamp, writeBatch } = require('firebase/firestore');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const root = path.resolve(__dirname, '../..');
let env, app, adminDb;
const contexts = new Map();
function dbFor(uid) {
    const key = uid || 'anonymous';
    if (!contexts.has(key)) contexts.set(key, uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore());
    return contexts.get(key);
}
function load(file, uid) {
    const filename = path.resolve(root, file);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    const result = {};
    vm.runInThisContext('(function(exports,require){'+code+'\n})', { filename })(result, name => {
        if (name === '../lib/firebase') return { db: dbFor(uid), auth: { currentUser: uid ? { uid } : null } };
        if (name === '../lib/firestoreUtils') return { nowIso: () => new Date().toISOString(), withId: item => ({ ...item.data(), id: item.id }) };
        return name.startsWith('.') ? load(path.relative(root, path.resolve(path.dirname(filename), name + '.ts')), uid) : require(name);
    });
    return result;
}
const service = uid => load('src/services/equipmentSurveyService.ts', uid).equipmentSurveyService;
const assets = [{ id: 'a', name: 'เครื่องปรับอากาศ', asset_number: 'AC/1' }, { id: 'b', name: 'ตู้เสื้อผ้า', asset_number: 'C/1' }];
const normal = assets.map(item => ({ equipment_id: item.id, condition: 'normal', reason: '' }));
const resultPath = year => 'equipment_survey_rounds/'+year+'/rooms/r1';
const open = (year = 2026) => service('admin').open(year);
const submit = (uid = 'tenant1', year = 2026, answers = normal, roomId = 'r1') => service(uid).submit(year, roomId, answers);
async function directAnswer(id, answer, count = 1) {
    const db = dbFor('tenant1'); const batch = writeBatch(db);
    batch.set(doc(db, resultPath(2026) + '/responses/' + id), { ...answer, equipment_id: id, answered_by: 'tenant1', updated_at: serverTimestamp() });
    batch.update(doc(db, resultPath(2026)), { answered_count: count, last_answer_id: id });
    return batch.commit();
}

before(async () => {
    env = await initializeTestEnvironment({ projectId: 'demo-sena-one', firestore: { host: '127.0.0.1', port: 8180, rules: fs.readFileSync('firestore.rules', 'utf8') } });
    app = initializeApp({ projectId: 'demo-sena-one' }); adminDb = getFirestore(app);
});
beforeEach(async () => {
    await env.clearFirestore();
    await Promise.all([
        ...['admin', 'owner', 'tenant1', 'tenant2'].map(uid => adminDb.doc('users/'+uid).set({ role: uid.startsWith('tenant') ? 'tenant' : uid, full_name: uid })),
        adminDb.doc('rooms/r1').set({ room_number: '301', current_tenant_uid: 'tenant1', equipment: assets }),
        adminDb.doc('rooms/r2').set({ room_number: '302', current_tenant_uid: 'tenant2', equipment: assets }),
    ]);
});
after(async () => { await env?.cleanup(); await adminDb?.terminate(); if (app) await deleteApp(app); });

test('real client transactions allow only admin/owner to open rounds and prevent duplicate years', async () => {
    await assertFails(service('tenant1').open(2026));
    await assert.rejects(() => service(null).open(2026));
    assert.equal((await open()).room_count, 2);
    await assert.rejects(() => open(), /ปีนี้มีรอบสำรวจแล้ว/);
    await assertSucceeds(service('owner').open(2025));
});
test('tenants cannot grant themselves admin privileges or create an admin account', async () => {
    const tenant = dbFor('tenant1');
    await assertFails(updateDoc(doc(tenant, 'users/tenant1'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(tenant, 'users/tenant1'), { full_name: 'ชื่อใหม่' }));
    await assertFails(setDoc(doc(dbFor('new'), 'users/new'), { role: 'admin' }));
    await open();
    await assertFails(service('tenant1').setStatus(2026, 'closed'));
});
test('snapshots survive registry changes and old years remain intact', async () => {
    await open(); await submit();
    await adminDb.doc('rooms/r1').update({ equipment: [{ id: 'new', name: 'รายการใหม่', asset_number: 'NEW' }] });
    await open(2027);
    assert.deepEqual((await adminDb.doc(resultPath(2026)).get()).data().items, assets);
    assert.equal((await adminDb.doc(resultPath(2027)).get()).data().items[0].asset_number, 'NEW');
    const history = await service('tenant1').getRoomHistory('r1');
    assert.equal(history.length, 2);
    assert.equal(typeof history.find(item => item.round.year === 2026).survey.submitted_at, 'string');
});
test('rules reject a direct abnormal write without a cause even when the UI is bypassed', async () => {
    await open();
    const target = doc(dbFor('tenant1'), resultPath(2026));
    const metadata = { status: 'submitted', submitted_at: serverTimestamp(), submitted_by: 'tenant1', submitted_by_name: 'tenant1' };
    for (const answers of [
        [{ ...normal[0], condition: 'damaged', reason: '' }, normal[1]],
        [{ ...normal[0], condition: 'damaged', reason: '   ' }, normal[1]],
        [{ ...normal[0], condition: 'lost', reason: 'ปกติ' }, normal[1]],
        [normal[0]],
        [normal[0], { ...normal[1], equipment_id: 'unknown' }],
        [{ ...normal[0], condition: ['normal'] }, normal[1]],
    ]) await assertFails(updateDoc(target, { ...metadata, answers }));
    assert.equal((await adminDb.doc(resultPath(2026)).get()).data().status, 'pending');
    await submit('tenant1', 2026, [{ ...normal[0], condition: 'damaged', reason: 'ไม่สามารถเปิดเครื่องได้' }, normal[1]]);
    assert.equal((await adminDb.doc(resultPath(2026) + '/responses/a').get()).data().reason, 'ไม่สามารถเปิดเครื่องได้');
});
test('only the current tenant can submit; names and times cannot be forged', async () => {
    await open();
    await assertFails(submit('tenant2'));
    await assert.rejects(() => submit(null));
    await assertFails(updateDoc(doc(dbFor('tenant1'), resultPath(2026)), { answers: normal, status: 'submitted', submitted_at: serverTimestamp(), submitted_by: 'tenant1', submitted_by_name: 'someone else' }));
    await adminDb.doc('rooms/r1').update({ current_tenant_uid: 'tenant2' });
    await assertFails(submit('tenant1'));
    await submit('tenant2');
});
test('closing and reopening rounds does not allow submitted history to be overwritten', async () => {
    await open();
    await service('admin').setStatus(2026, 'closed');
    await assert.rejects(() => submit(), /ปิดรับแล้ว/);
    await assertFails(updateDoc(doc(dbFor('tenant1'), resultPath(2026)), { status: 'submitted', answers: normal, submitted_at: serverTimestamp(), submitted_by: 'tenant1', submitted_by_name: 'tenant1' }));
    await service('admin').setStatus(2026, 'open'); await submit();
    await assert.rejects(() => submit(), /ส่งผลสำรวจแล้ว/);
    await assertFails(updateDoc(doc(dbFor('tenant1'), resultPath(2026)), { answers: normal, submitted_at: serverTimestamp() }));
    await assertFails(updateDoc(doc(dbFor('admin'), resultPath(2026)), { answers: [] }));
});
test('two simultaneous submissions cannot overwrite each other', async () => {
    await open();
    const results = await Promise.allSettled([submit(), submit()]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
});
test('rooms cannot be added to existing snapshots and residents cannot read another room history', async () => {
    await open();
    await assertSucceeds(getDocs(collection(dbFor('tenant1'), 'equipment_survey_rounds')));
    await assertSucceeds(getDoc(doc(dbFor('tenant1'), resultPath(2026))));
    await assertFails(getDoc(doc(dbFor('tenant1'), 'equipment_survey_rounds/2026/rooms/r2')));
    await assertFails(getDocs(collection(dbFor('tenant1'), 'equipment_survey_rounds/2026/rooms')));
    await assertSucceeds(getDocs(collection(dbFor('admin'), 'equipment_survey_rounds/2026/rooms')));
    await assertFails(setDoc(doc(dbFor('admin'), 'equipment_survey_rounds/2026/rooms/extra'), { room_id: 'extra', year: 2026, status: 'pending', items: assets, answers: [], created_at: serverTimestamp() }));
    await assertFails(getDoc(doc(dbFor(null), 'equipment_survey_rounds/2026')));
});
test('per-item checks handle thirty abnormal assets within the rules evaluation budget', async () => {
    const list = Array.from({ length: 30 }, (_, i) => ({ id: 'item'+i, name: 'ครุภัณฑ์ '+i, asset_number: '' }));
    await adminDb.doc('rooms/r1').update({ equipment: list }); await open();
    const answers = list.map(item => ({ equipment_id: item.id, condition: 'damaged', reason: 'ทดสอบชำรุดจากการใช้งาน' }));
    await assertFails(directAnswer('item29', { condition: 'damaged', reason: '' }));
    await submit('tenant1', 2026, answers);
    assert.equal((await adminDb.doc(resultPath(2026)).get()).data().answered_count, 30);
});
test('answer counters cannot be forged, duplicated, or finalized with missing answers', async () => {
    await open();
    await assertFails(updateDoc(doc(dbFor('tenant1'), resultPath(2026)), { answered_count: 2, last_answer_id: 'a' }));
    await assertFails(directAnswer('unknown', { condition: 'normal', reason: '' }));
    await assertFails(directAnswer('a', { condition: 'normal', reason: '' }, 2));
    for (const reason of ['', '  ', '-', 'ปกติ']) await assertFails(directAnswer('a', { condition: 'damaged', reason }));
    await directAnswer('a', { condition: 'normal', reason: '' });
    await assertFails(updateDoc(doc(dbFor('tenant1'), resultPath(2026)), { status: 'submitted', submitted_at: serverTimestamp(), submitted_by: 'tenant1', submitted_by_name: 'tenant1' }));
    await assertFails(directAnswer('a', { condition: 'normal', reason: '' }, 2));
    await submit();
    await assertFails(updateDoc(doc(dbFor('tenant1'), resultPath(2026) + '/responses/a'), { reason: 'แก้ไขหลังส่งแล้ว', updated_at: serverTimestamp() }));
});
test('opening a building-sized round stays within document access limits', async () => {
    await Promise.all(Array.from({ length: 35 }, (_, i) => adminDb.doc('rooms/extra'+i).set({ room_number: String(400+i), equipment: assets, current_tenant_uid: null })));
    assert.equal((await open()).room_count, 37);
});
