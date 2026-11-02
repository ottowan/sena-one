import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { validateSurveyAnswers, validateSurveyYear, type SurveyAsset } from './equipmentSurveyDomain';

async function requireAdmin(uid: string | undefined) {
    if (!uid) throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบ');
    const user = await getFirestore().collection('users').doc(uid).get();
    if (!['admin', 'owner'].includes(user.data()?.role)) throw new HttpsError('permission-denied', 'เฉพาะผู้ดูแลระบบเท่านั้น');
}
function yearFromInput(year: unknown) {
    try { return validateSurveyYear(year); }
    catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
}

export const adminOpenEquipmentSurvey = onCall<{ year: number }>(async request => {
    await requireAdmin(request.auth?.uid);
    const year = yearFromInput(request.data?.year);
    const db = getFirestore();
    const roundRef = db.collection('equipment_survey_rounds').doc(String(year));
    return db.runTransaction(async tx => {
        const existing = await tx.get(roundRef);
        if (existing.exists) throw new HttpsError('already-exists', 'ปีนี้มีรอบสำรวจแล้ว กรุณาใช้รอบเดิม');
        const rooms = await tx.get(db.collection('rooms'));
        const snapshots = rooms.docs.map(room => {
            const items = (room.data().equipment || []) as SurveyAsset[];
            return { room, items };
        }).filter(({ items }) => items.length > 0);
        if (!snapshots.length) throw new HttpsError('failed-precondition', 'กรุณาเพิ่มรายการครุภัณฑ์ประจำห้องก่อนเปิดสำรวจ');
        if (snapshots.length > 450) throw new HttpsError('failed-precondition', 'รอบสำรวจรองรับได้ไม่เกิน 450 ห้อง');
        for (const { items } of snapshots) {
            if (!Array.isArray(items) || items.some(item => !item.id || !item.name) || new Set(items.map(item => item.id)).size !== items.length) {
                throw new HttpsError('failed-precondition', 'พบรายการครุภัณฑ์ไม่ถูกต้อง กรุณาตรวจทะเบียนก่อนเปิดสำรวจ');
            }
        }
        const now = new Date().toISOString();
        tx.create(roundRef, { year, status: 'open', room_count: snapshots.length, opened_at: now, opened_by: request.auth!.uid });
        for (const { room, items } of snapshots) {
            tx.create(roundRef.collection('rooms').doc(room.id), {
                year, room_id: room.id, room_number: String(room.data().room_number), status: 'pending',
                occupied_at_open: !!room.data().current_tenant_uid,
                items: items.map(item => ({ id: item.id, name: item.name, asset_number: item.asset_number || '' })),
                answers: [], created_at: now,
            });
        }
        return { year, room_count: snapshots.length };
    });
});

export const adminSetEquipmentSurveyStatus = onCall<{ year: number; status: 'open' | 'closed' }>(async request => {
    await requireAdmin(request.auth?.uid);
    const year = yearFromInput(request.data?.year);
    const status = request.data?.status;
    if (status !== 'open' && status !== 'closed') throw new HttpsError('invalid-argument', 'สถานะรอบสำรวจไม่ถูกต้อง');
    const ref = getFirestore().collection('equipment_survey_rounds').doc(String(year));
    await getFirestore().runTransaction(async tx => {
        const round = await tx.get(ref);
        if (!round.exists) throw new HttpsError('not-found', 'ไม่พบรอบสำรวจ');
        tx.update(ref, { status, updated_at: new Date().toISOString(), updated_by: request.auth!.uid });
    });
    return { ok: true };
});

export const submitEquipmentSurvey = onCall<{ year: number; roomId: string; answers: unknown }>(async request => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'กรุณาเข้าสู่ระบบ');
    const year = yearFromInput(request.data?.year);
    const roomId = request.data?.roomId;
    if (typeof roomId !== 'string' || !roomId || roomId.includes('/')) throw new HttpsError('invalid-argument', 'เลขห้องไม่ถูกต้อง');
    const db = getFirestore();
    const roundRef = db.collection('equipment_survey_rounds').doc(String(year));
    const resultRef = roundRef.collection('rooms').doc(roomId);
    await db.runTransaction(async tx => {
        const [user, room, round, result] = await Promise.all([
            tx.get(db.collection('users').doc(uid)), tx.get(db.collection('rooms').doc(roomId)), tx.get(roundRef), tx.get(resultRef),
        ]);
        const role = user.data()?.role;
        if (!(role === 'tenant' && room.data()?.current_tenant_uid === uid)) {
            throw new HttpsError('permission-denied', 'สำรวจได้เฉพาะห้องพักของตนเอง');
        }
        if (!round.exists || round.data()?.status !== 'open') throw new HttpsError('failed-precondition', 'รอบสำรวจนี้ปิดรับแล้ว');
        if (!result.exists) throw new HttpsError('not-found', 'ห้องนี้ไม่มีรายการในรอบสำรวจ');
        if (result.data()?.status === 'submitted') throw new HttpsError('already-exists', 'ห้องนี้ส่งผลสำรวจแล้ว');
        let answers;
        try { answers = validateSurveyAnswers(result.data()!.items, request.data?.answers); }
        catch (error) { throw new HttpsError('invalid-argument', (error as Error).message); }
        tx.update(resultRef, { answers, status: 'submitted', submitted_at: new Date().toISOString(), submitted_by: uid, submitted_by_name: user.data()?.full_name || '' });
    });
    return { ok: true };
});
