import type { SurveyAsset, SurveyAnswer } from '../../functions/src/equipmentSurveyDomain';
export type { SurveyAsset, SurveyAnswer, EquipmentCondition } from '../../functions/src/equipmentSurveyDomain';
export { EQUIPMENT_CONDITIONS, validateSurveyAnswers } from '../../functions/src/equipmentSurveyDomain';

export interface EquipmentSurveyRound {
    id: string;
    year: number;
    status: 'open' | 'closed';
    room_count: number;
    opened_at: string;
    opened_by: string;
}
export interface RoomEquipmentSurvey {
    id: string;
    year: number;
    room_id: string;
    room_number: string;
    status: 'pending' | 'submitted';
    occupied_at_open: boolean;
    items: SurveyAsset[];
    answers: SurveyAnswer[];
    submitted_at?: string;
    submitted_by?: string;
    submitted_by_name?: string;
}
