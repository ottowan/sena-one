import type { RoomEquipmentItem } from '../types';

function uid(): string {
    return typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
}

// ชื่อครุภัณฑ์มาตรฐานที่รองรับ - ใช้ทั้งเป็นค่าเริ่มต้นและตัวเลือกตอนเพิ่มรายการ
export const ROOM_EQUIPMENT_NAMES = [
    'เครื่องปรับอากาศ',
    'เตียงนอนเหล็ก ขนาด 6 ฟุต',
    'ที่นอน ขนาด 6 ฟุต',
    'ตู้เสื้อผ้า',
    'ซิงค์ล้างจาน',
    'พัดลมติดเพดาน ขนาด 16 นิ้ว',
    'เตาไฟฟ้า',
    'มาตรวัดน้ำ',
    'มาตรวัดไฟฟ้า (มิเตอร์)',
] as const;

// รายการครุภัณฑ์มาตรฐานประจำห้องพัก (พัดลมมี 2 ตัวต่อห้อง)
export function createDefaultRoomEquipment(): RoomEquipmentItem[] {
    return [
        { id: uid(), name: 'เครื่องปรับอากาศ', asset_number: '' },
        { id: uid(), name: 'เตียงนอนเหล็ก ขนาด 6 ฟุต', asset_number: '' },
        { id: uid(), name: 'ที่นอน ขนาด 6 ฟุต', asset_number: '' },
        { id: uid(), name: 'ตู้เสื้อผ้า', asset_number: '' },
        { id: uid(), name: 'ซิงค์ล้างจาน', asset_number: '' },
        { id: uid(), name: 'พัดลมติดเพดาน ขนาด 16 นิ้ว', asset_number: '' },
        { id: uid(), name: 'พัดลมติดเพดาน ขนาด 16 นิ้ว', asset_number: '' },
        { id: uid(), name: 'เตาไฟฟ้า', asset_number: '' },
        { id: uid(), name: 'มาตรวัดน้ำ', asset_number: '' },
        { id: uid(), name: 'มาตรวัดไฟฟ้า (มิเตอร์)', asset_number: '' },
    ];
}
