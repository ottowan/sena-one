// Shared form and transaction validation. Firestore rules independently validate writes.
export const EQUIPMENT_CONDITIONS = {
    normal: 'ปกติ', damaged: 'ชำรุด', deteriorated: 'เสื่อมสภาพ', lost: 'สูญไป', unnecessary: 'ไม่จำเป็นต้องใช้',
} as const;
export type EquipmentCondition = keyof typeof EQUIPMENT_CONDITIONS;
export interface SurveyAsset { id: string; name: string; asset_number?: string }
export interface SurveyAnswer { equipment_id: string; condition: EquipmentCondition; reason: string }

export function validateSurveyYear(year: unknown): number {
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new Error('กรุณาเลือกปีสำรวจที่ถูกต้อง');
    }
    return year;
}

export function validateSurveyAnswers(items: SurveyAsset[], input: unknown): SurveyAnswer[] {
    if (!Array.isArray(input) || !items.length || input.length !== items.length) throw new Error('กรุณาสำรวจครุภัณฑ์ให้ครบทุกชิ้น');
    const byId = new Map<string, SurveyAnswer>();
    for (const raw of input) {
        if (!raw || typeof raw !== 'object' || typeof raw.equipment_id !== 'string' || typeof raw.condition !== 'string' || byId.has(raw.equipment_id) ||
            !Object.prototype.hasOwnProperty.call(EQUIPMENT_CONDITIONS, raw.condition)) throw new Error('รายการหรือสภาพครุภัณฑ์ไม่ถูกต้อง');
        if (raw.reason !== undefined && typeof raw.reason !== 'string') throw new Error('สาเหตุต้องเป็นข้อความ');
        const reason = (raw.reason || '').trim();
        if (reason.length > 2000) throw new Error('สาเหตุต้องไม่เกิน 2,000 ตัวอักษร');
        if (raw.condition !== 'normal' && (reason.length < 2 || ['-', '_', '0', 'ปกติ'].includes(reason))) {
            throw new Error('ครุภัณฑ์ที่ไม่ปกติต้องระบุสาเหตุประกอบ');
        }
        byId.set(raw.equipment_id, { equipment_id: raw.equipment_id, condition: raw.condition, reason });
    }
    return items.map(item => {
        const answer = byId.get(item.id);
        if (!answer) throw new Error('รายการครุภัณฑ์ไม่ตรงกับรอบสำรวจ กรุณาโหลดข้อมูลใหม่');
        return answer;
    });
}
