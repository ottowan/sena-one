const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, getDocs, setDoc, updateDoc, collection } = require('firebase/firestore');
const backendRequire = createRequire(resolve('functions/package.json'));
const { initializeApp, deleteApp } = backendRequire('firebase-admin/app');
const { getFirestore } = backendRequire('firebase-admin/firestore');
const handlers = require('../../functions/lib/equipmentSurveys');
const projectId = 'demo-sena-one';
let env, app, adminDb;
const assets = [{ id: 'a', name: 'เครื่องปรับอากาศ', asset_number: 'AC/1' }, { id: 'b', name: 'ตู้เสื้อผ้า', asset_number: 'C/1' }];
const normal = assets.map(item => ({ equipment_id: item.id, condition: 'normal', reason: '' }));
const request = (uid, data) => ({ auth: uid ? { uid, token: {} } : undefined, data });
const resultPath = year => `equipment_survey_rounds/${year}/rooms/r1`;
const open = (year = 2026) => handlers.adminOpenEquipmentSurvey.run(request('admin', { year }));
const submit = (uid = 'tenant1', year = 2026, answers = normal, roomId = 'r1') => handlers.submitEquipmentSurvey.run(request(uid, { year, roomId, answers }));

before(async () => {
    env = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8180, rules: readFileSync('firestore.rules', 'utf8') } });
    app = initializeApp({ projectId }); adminDb = getFirestore(app);
});
beforeEach(async () => {
    await env.clearFirestore();
    await Promise.all([
        ...['admin', 'owner', 'tenant1', 'tenant2'].map(uid => adminDb.doc(`users/${uid}`).set({ role: uid.startsWith('tenant') ? 'tenant' : uid, full_name: uid })),
        adminDb.doc('rooms/r1').set({ room_number: '301', current_tenant_uid: 'tenant1', equipment: assets }),
        adminDb.doc('rooms/r2').set({ room_number: '302', current_tenant_uid: 'tenant2', equipment: assets }),
    ]);
});
after(async () => { await env?.cleanup(); await adminDb?.terminate(); if (app) await deleteApp(app); });

test('only admin/owner can open rounds; duplicates cannot reset the annual snapshot', async () => {
    await assert.rejects(() => handlers.adminOpenEquipmentSurvey.run(request('tenant1', { year: 2026 })), { code: 'permission-denied' });
    await assert.rejects(() => handlers.adminOpenEquipmentSurvey.run(request(undefined, { year: 2026 })), { code: 'unauthenticated' });
    const result = await open(); assert.equal(result.room_count, 2);
    await assert.rejects(() => open(), { code: 'already-exists' });
    await assertSucceeds(handlers.adminOpenEquipmentSurvey.run(request('owner', { year: 2025 })));
});
test('tenants cannot grant themselves admin privileges or create an admin account', async () => {
    const tenant = env.authenticatedContext('tenant1').firestore();
    await assertFails(updateDoc(doc(tenant, 'users/tenant1'), { role: 'admin' }));
    await assertSucceeds(updateDoc(doc(tenant, 'users/tenant1'), { full_name: 'ชื่อใหม่' }));
    await assertFails(setDoc(doc(env.authenticatedContext('new').firestore(), 'users/new'), { role: 'admin' }));
    await assert.rejects(() => handlers.adminSetEquipmentSurveyStatus.run(request('tenant1', { year: 2026, status: 'open' })), { code: 'permission-denied' });
});
test('annual snapshots are isolated from registry changes and old years remain intact', async () => {
    await open(); await submit();
    await adminDb.doc('rooms/r1').update({ equipment: [{ id: 'new', name: 'รายการใหม่', asset_number: 'NEW' }] });
    await open(2027);
    assert.deepEqual((await adminDb.doc(resultPath(2026)).get()).data().items, assets);
    assert.equal((await adminDb.doc(resultPath(2027)).get()).data().items[0].asset_number, 'NEW');
    assert.equal((await adminDb.doc(resultPath(2026)).get()).data().status, 'submitted');
});
test('abnormal answers need a cause; an incorrect list is rejected on the server', async () => {
    await open();
    await assert.rejects(() => submit('tenant1', 2026, [{ ...normal[0], condition: 'damaged', reason: '' }, normal[1]]), { code: 'invalid-argument' });
    await assert.rejects(() => submit('tenant1', 2026, [normal[0]]), { code: 'invalid-argument' });
    await assert.rejects(() => submit('tenant1', 2026, [normal[0], { ...normal[1], equipment_id: 'unknown' }]), { code: 'invalid-argument' });
    assert.equal((await adminDb.doc(resultPath(2026)).get()).data().status, 'pending');
    await submit('tenant1', 2026, [{ ...normal[0], condition: 'damaged', reason: 'ไม่สามารถเปิดเครื่องได้' }, normal[1]]);
    assert.equal((await adminDb.doc(resultPath(2026)).get()).data().answers[0].reason, 'ไม่สามารถเปิดเครื่องได้');
});
test('submission is limited to the current tenant of the room', async () => {
    await open();
    await assert.rejects(() => submit('tenant2'), { code: 'permission-denied' });
    await assert.rejects(() => submit(null), { code: 'unauthenticated' });
    await adminDb.doc('rooms/r1').update({ current_tenant_uid: 'tenant2' });
    await assert.rejects(() => submit('tenant1'), { code: 'permission-denied' });
    await submit('tenant2');
});
test('closed rounds reject submissions; reopening does not allow overwriting submitted history', async () => {
    await open();
    await handlers.adminSetEquipmentSurveyStatus.run(request('admin', { year: 2026, status: 'closed' }));
    await assert.rejects(() => submit(), { code: 'failed-precondition' });
    await handlers.adminSetEquipmentSurveyStatus.run(request('admin', { year: 2026, status: 'open' }));
    await submit();
    await assert.rejects(() => submit(), { code: 'already-exists' });
});
test('two simultaneous submissions cannot overwrite each other', async () => {
    await open();
    const results = await Promise.allSettled([submit(), submit()]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter(result => result.status === 'rejected').length, 1);
});
test('clients cannot bypass the callable functions and cannot read other rooms history', async () => {
    await open();
    const tenant = env.authenticatedContext('tenant1').firestore();
    const admin = env.authenticatedContext('admin').firestore();
    await assertSucceeds(getDocs(collection(tenant, 'equipment_survey_rounds')));
    await assertSucceeds(getDoc(doc(tenant, resultPath(2026))));
    await assertFails(getDoc(doc(tenant, 'equipment_survey_rounds/2026/rooms/r2')));
    await assertFails(getDocs(collection(tenant, 'equipment_survey_rounds/2026/rooms')));
    await assertSucceeds(getDocs(collection(admin, 'equipment_survey_rounds/2026/rooms')));
    await assertFails(updateDoc(doc(tenant, resultPath(2026)), { status: 'submitted', answers: normal }));
    await assertFails(updateDoc(doc(admin, 'equipment_survey_rounds/2026'), { status: 'closed' }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'equipment_survey_rounds/2026')));
});
