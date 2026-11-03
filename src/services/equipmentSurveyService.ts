import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { withId, nowIso } from '../lib/firestoreUtils';
import { planAssetImport, type AssetCandidate, type AssetImportRoom } from '../lib/assetImport';
import type { EquipmentSurveyRound, RoomEquipmentSurvey, SurveyAnswer } from '../types/equipmentSurvey';
import { validateSurveyAnswers, validateSurveyYear, type SurveyAsset } from '../lib/equipmentSurveyDomain';

function currentUid() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('กรุณาเข้าสู่ระบบ');
    return uid;
}
function normalizeDates<T>(data: T): T {
    const result = { ...data } as Record<string, unknown>;
    for (const key of ['opened_at', 'submitted_at']) {
        const value = result[key] as { toDate?: () => Date } | undefined;
        if (value && typeof value.toDate === 'function') result[key] = value.toDate().toISOString();
    }
    return result as T;
}
async function attachResponses(survey: RoomEquipmentSurvey) {
    if (survey.answered_count === undefined || survey.answered_count === 0) return survey; // Historical embedded reports remain readable.
    const responses = await getDocs(collection(db, 'equipment_survey_rounds', String(survey.year), 'rooms', survey.room_id, 'responses'));
    const byId = new Map(responses.docs.map(item => [item.id, item.data() as SurveyAnswer]));
    return { ...survey, answers: survey.items.map(item => byId.get(item.id)).filter((answer): answer is SurveyAnswer => !!answer) };
}

export const equipmentSurveyService = {
    async getRounds(): Promise<EquipmentSurveyRound[]> {
        const snap = await getDocs(query(collection(db, 'equipment_survey_rounds'), orderBy('year', 'desc')));
        return snap.docs.map(item => normalizeDates(withId<EquipmentSurveyRound>(item)));
    },
    async getRoundRooms(year: number): Promise<RoomEquipmentSurvey[]> {
        const snap = await getDocs(collection(db, 'equipment_survey_rounds', String(year), 'rooms'));
        const surveys = await Promise.all(snap.docs.map(item => attachResponses(normalizeDates(withId<RoomEquipmentSurvey>(item)))));
        return surveys.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
    },
    async getRoomHistory(roomId: string) {
        const rounds = await this.getRounds();
        const history = await Promise.all(rounds.map(async round => {
            const snapshot = await getDoc(doc(db, 'equipment_survey_rounds', round.id, 'rooms', roomId));
            return snapshot.exists() ? { round, survey: await attachResponses(normalizeDates(withId<RoomEquipmentSurvey>(snapshot))) } : null;
        }));
        return history.filter((item): item is { round: EquipmentSurveyRound; survey: RoomEquipmentSurvey } => item !== null);
    },
    async open(year: number) {
        validateSurveyYear(year);
        const uid = currentUid();
        const roomRefs = (await getDocs(collection(db, 'rooms'))).docs.map(item => item.ref);
        if (roomRefs.length > 450) throw new Error('รอบสำรวจรองรับได้ไม่เกิน 450 ห้อง');
        const roundRef = doc(db, 'equipment_survey_rounds', String(year));
        return runTransaction(db, async tx => {
            const [existing, ...rooms] = await Promise.all([tx.get(roundRef), ...roomRefs.map(ref => tx.get(ref))]);
            if (existing.exists()) throw new Error('ปีนี้มีรอบสำรวจแล้ว กรุณาใช้รอบเดิม');
            const snapshots = rooms.filter(room => room.exists()).map(room => ({ room, items: (room.data().equipment || []) as SurveyAsset[] })).filter(({ items }) => items.length > 0);
            if (!snapshots.length) throw new Error('กรุณาเพิ่มรายการครุภัณฑ์ประจำห้องก่อนเปิดสำรวจ');
            snapshots.forEach(({ items }) => {
                if (!Array.isArray(items) || items.some(item => !item.id || !item.name) || new Set(items.map(item => item.id)).size !== items.length) {
                    throw new Error('กรุณาตรวจทะเบียน แต่ละห้องต้องมีรหัสรายการที่ถูกต้องและไม่ซ้ำกัน');
                }
            });
            tx.set(roundRef, { year, status: 'open', room_count: snapshots.length, opened_at: serverTimestamp(), opened_by: uid });
            snapshots.forEach(({ room, items }) => tx.set(doc(db, 'equipment_survey_rounds', String(year), 'rooms', room.id), {
                year, room_id: room.id, room_number: String(room.data().room_number), status: 'pending',
                occupied_at_open: !!room.data().current_tenant_uid,
                items: items.map(item => ({ id: item.id, name: item.name, asset_number: item.asset_number || '' })),
                item_ids: items.map(item => item.id), answered_count: 0, answers: [], created_at: serverTimestamp(),
            }));
            return { year, room_count: snapshots.length };
        });
    },
    async setStatus(year: number, status: 'open' | 'closed') {
        validateSurveyYear(year);
        const uid = currentUid();
        if (status !== 'open' && status !== 'closed') throw new Error('สถานะรอบสำรวจไม่ถูกต้อง');
        const ref = doc(db, 'equipment_survey_rounds', String(year));
        await runTransaction(db, async tx => {
            const round = await tx.get(ref);
            if (!round.exists()) throw new Error('ไม่พบรอบสำรวจ');
            tx.update(ref, { status, updated_at: serverTimestamp(), updated_by: uid });
        });
    },
    async submit(year: number, roomId: string, answers: SurveyAnswer[]) {
        validateSurveyYear(year);
        const uid = currentUid();
        if (!roomId || roomId.includes('/')) throw new Error('เลขห้องไม่ถูกต้อง');
        const roundRef = doc(db, 'equipment_survey_rounds', String(year));
        const resultRef = doc(db, 'equipment_survey_rounds', String(year), 'rooms', roomId);
        const initial = await getDoc(resultRef);
        if (!initial.exists()) throw new Error('ห้องนี้ไม่มีรายการในรอบสำรวจ');
        const validated = validateSurveyAnswers(initial.data().items, answers);
        for (const answer of validated) {
            const responseRef = doc(db, 'equipment_survey_rounds', String(year), 'rooms', roomId, 'responses', answer.equipment_id);
            await runTransaction(db, async tx => {
                const [round, result, response] = await Promise.all([tx.get(roundRef), tx.get(resultRef), tx.get(responseRef)]);
                if (!round.exists() || round.data().status !== 'open') throw new Error('รอบสำรวจนี้ปิดรับแล้ว');
                if (!result.exists() || result.data().status !== 'pending') throw new Error('ห้องนี้ส่งผลสำรวจแล้ว');
                tx.set(responseRef, { ...answer, answered_by: uid, updated_at: serverTimestamp() });
                if (!response.exists()) tx.update(resultRef, { answered_count: (result.data().answered_count || 0) + 1, last_answer_id: answer.equipment_id });
            });
        }
        await runTransaction(db, async tx => {
            const [round, result, user] = await Promise.all([tx.get(roundRef), tx.get(resultRef), tx.get(doc(db, 'users', uid))]);
            if (!round.exists() || round.data().status !== 'open') throw new Error('รอบสำรวจนี้ปิดรับแล้ว');
            if (!result.exists()) throw new Error('ห้องนี้ไม่มีรายการในรอบสำรวจ');
            if (result.data().status === 'submitted') throw new Error('ห้องนี้ส่งผลสำรวจแล้ว');
            if (result.data().answered_count !== result.data().items.length) throw new Error('กรุณาสำรวจครุภัณฑ์ให้ครบทุกชิ้น');
            tx.update(resultRef, { status: 'submitted', submitted_at: serverTimestamp(), submitted_by: uid, submitted_by_name: user.data()?.full_name || '' });
        });
    },
    async importAssetNumbers(candidates: AssetCandidate[]) {
        // Re-read all rooms inside one transaction to preserve concurrent edits
        // and reject asset numbers already registered to another room.
        const roomRefs = (await getDocs(collection(db, 'rooms'))).docs.map(item => item.ref);
        if (roomRefs.length > 450) throw new Error('นำเข้าได้ไม่เกิน 450 ห้องต่อครั้ง');
        return runTransaction(db, async tx => {
            const snapshots = await Promise.all(roomRefs.map(ref => tx.get(ref)));
            const rooms = snapshots.filter(item => item.exists()).map(item => ({ ...item.data(), id: item.id }) as AssetImportRoom);
            const plan = planAssetImport(rooms, candidates);
            plan.changes.forEach(change => tx.update(doc(db, 'rooms', change.room_id), { equipment: change.equipment, updated_at: nowIso() }));
            return { filled: plan.filled, rooms: plan.changes.length, warnings: plan.warnings };
        });
    },
};
