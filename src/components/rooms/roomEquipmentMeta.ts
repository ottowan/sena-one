import {
    LuAirVent,
    LuBedSingle,
    LuBedDouble,
    LuDoorClosed,
    LuDroplets,
    LuFan,
    LuCookingPot,
    LuDroplet,
    LuZap,
    LuBoxes,
} from 'react-icons/lu';
import { ROOM_EQUIPMENT_NAMES } from '../../lib/defaultRoomEquipment';

const ICON_BY_NAME: Record<string, typeof LuBoxes> = {
    [ROOM_EQUIPMENT_NAMES[0]]: LuAirVent, // เครื่องปรับอากาศ
    [ROOM_EQUIPMENT_NAMES[1]]: LuBedSingle, // เตียงนอนเหล็ก
    [ROOM_EQUIPMENT_NAMES[2]]: LuBedDouble, // ที่นอน
    [ROOM_EQUIPMENT_NAMES[3]]: LuDoorClosed, // ตู้เสื้อผ้า
    [ROOM_EQUIPMENT_NAMES[4]]: LuDroplets, // ซิงค์ล้างจาน
    [ROOM_EQUIPMENT_NAMES[5]]: LuFan, // พัดลมติดเพดาน
    [ROOM_EQUIPMENT_NAMES[6]]: LuCookingPot, // เตาไฟฟ้า
    [ROOM_EQUIPMENT_NAMES[7]]: LuDroplet, // มาตรวัดน้ำ
    [ROOM_EQUIPMENT_NAMES[8]]: LuZap, // มาตรวัดไฟฟ้า
};

// สีแยกตามประเภท (fixed order ไม่สุ่ม) ให้แต่ละรายการแยกออกจากกันชัดเจน
const COLOR_BY_NAME: Record<string, string> = {
    [ROOM_EQUIPMENT_NAMES[0]]: 'cyan.500', // เครื่องปรับอากาศ
    [ROOM_EQUIPMENT_NAMES[1]]: 'purple.500', // เตียงนอนเหล็ก
    [ROOM_EQUIPMENT_NAMES[2]]: 'pink.500', // ที่นอน
    [ROOM_EQUIPMENT_NAMES[3]]: 'orange.500', // ตู้เสื้อผ้า
    [ROOM_EQUIPMENT_NAMES[4]]: 'blue.500', // ซิงค์ล้างจาน
    [ROOM_EQUIPMENT_NAMES[5]]: 'green.500', // พัดลมติดเพดาน
    [ROOM_EQUIPMENT_NAMES[6]]: 'red.500', // เตาไฟฟ้า
    [ROOM_EQUIPMENT_NAMES[7]]: 'teal.500', // มาตรวัดน้ำ
    [ROOM_EQUIPMENT_NAMES[8]]: 'yellow.600', // มาตรวัดไฟฟ้า
};

export function getRoomEquipmentIcon(name: string) {
    return ICON_BY_NAME[name] || LuBoxes;
}

export function getRoomEquipmentColor(name: string) {
    return COLOR_BY_NAME[name] || 'purple.500';
}
