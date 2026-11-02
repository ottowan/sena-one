// Callable boundary mock only used by tests/ui/vite.config.ts.
import { tables } from './firestore';
import { validateSurveyAnswers } from '../../functions/src/equipmentSurveyDomain';
export function httpsCallable(_: unknown, name: string) {
    return async (input: any) => {
        const round = tables.equipment_survey_rounds.find(item => item.year === input.year);
        if (name === 'adminSetEquipmentSurveyStatus') { round.status = input.status; return { data: { ok: true } }; }
        if (name === 'adminOpenEquipmentSurvey') {
            if (round) throw new Error('ปีนี้มีรอบสำรวจแล้ว');
            const year = input.year;
            tables.equipment_survey_rounds.push({ id: String(year), year, status: 'open', room_count: tables.rooms.length, opened_at: new Date().toISOString(), opened_by: 'preview' });
            tables[`equipment_survey_rounds/${year}/rooms`] = tables.rooms.map(room => ({ id: room.id, room_id: room.id, room_number: room.room_number, year, status: 'pending', occupied_at_open: true, items: room.equipment, answers: [] }));
            return { data: { year, room_count: tables.rooms.length } };
        }
        if (name === 'submitEquipmentSurvey') {
            if (!round || round.status !== 'open') throw new Error('รอบสำรวจนี้ปิดรับแล้ว');
            const room = tables[`equipment_survey_rounds/${input.year}/rooms`].find(item => item.room_id === input.roomId);
            if (room.status === 'submitted') throw new Error('ห้องนี้ส่งผลสำรวจแล้ว');
            const answers = validateSurveyAnswers(room.items, input.answers);
            Object.assign(room, { answers, status: 'submitted', submitted_at: new Date().toISOString(), submitted_by: 'preview', submitted_by_name: 'สมชาย ใจดี' });
            return { data: { ok: true } };
        }
        throw new Error(`Unsupported UI test callable: ${name}`);
    };
}
