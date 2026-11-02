import { collection, doc, getDoc, getDocs, orderBy, query, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../lib/firebase';
import { withId, nowIso } from '../lib/firestoreUtils';
import { planAssetImport, type AssetCandidate, type AssetImportRoom } from '../lib/assetImport';
import type { EquipmentSurveyRound, RoomEquipmentSurvey, SurveyAnswer } from '../types/equipmentSurvey';

export const equipmentSurveyService = {
    async getRounds(): Promise<EquipmentSurveyRound[]> {
        const snap = await getDocs(query(collection(db, 'equipment_survey_rounds'), orderBy('year', 'desc')));
        return snap.docs.map(item => withId<EquipmentSurveyRound>(item));
    },
    async getRoundRooms(year: number): Promise<RoomEquipmentSurvey[]> {
        const snap = await getDocs(collection(db, 'equipment_survey_rounds', String(year), 'rooms'));
        return snap.docs.map(item => withId<RoomEquipmentSurvey>(item))
            .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
    },
    async getRoomHistory(roomId: string) {
        const rounds = await this.getRounds();
        const history = await Promise.all(rounds.map(async round => {
            const snapshot = await getDoc(doc(db, 'equipment_survey_rounds', round.id, 'rooms', roomId));
            return snapshot.exists() ? { round, survey: withId<RoomEquipmentSurvey>(snapshot) } : null;
        }));
        return history.filter((item): item is { round: EquipmentSurveyRound; survey: RoomEquipmentSurvey } => item !== null);
    },
    async open(year: number) {
        return httpsCallable<{ year: number }, { year: number; room_count: number }>(functions, 'adminOpenEquipmentSurvey')({ year });
    },
    async setStatus(year: number, status: 'open' | 'closed') {
        return httpsCallable(functions, 'adminSetEquipmentSurveyStatus')({ year, status });
    },
    async submit(year: number, roomId: string, answers: SurveyAnswer[]) {
        return httpsCallable(functions, 'submitEquipmentSurvey')({ year, roomId, answers });
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
