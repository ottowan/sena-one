import type { RoomEquipmentItem } from '../types';
import { createDefaultRoomEquipment, ROOM_EQUIPMENT_NAMES } from './defaultRoomEquipment';

export type AssetCategory = 'air' | 'bed' | 'mattress' | 'wardrobe' | 'sink' | 'fan' | 'stove' | 'water' | 'electricity';
export interface AssetCandidate { room_number: string; category: AssetCategory; asset_number: string; source_row: number }
export type AssetCategoryConfirmation = Pick<AssetCandidate, 'room_number' | 'category' | 'asset_number'>;
export interface AssetImportRoom { id: string; room_number: string; equipment?: RoomEquipmentItem[] }
const categoryNames: Record<AssetCategory, string> = {
    air: ROOM_EQUIPMENT_NAMES[0], bed: ROOM_EQUIPMENT_NAMES[1], mattress: ROOM_EQUIPMENT_NAMES[2],
    wardrobe: ROOM_EQUIPMENT_NAMES[3], sink: ROOM_EQUIPMENT_NAMES[4], fan: ROOM_EQUIPMENT_NAMES[5],
    stove: ROOM_EQUIPMENT_NAMES[6], water: ROOM_EQUIPMENT_NAMES[7], electricity: ROOM_EQUIPMENT_NAMES[8],
};
export function equipmentCategory(name: string): AssetCategory | undefined {
    if (/ปรับอากาศ|แอร์/.test(name)) return 'air';
    if (/ที่นอน/.test(name) && !/เตียง/.test(name)) return 'mattress';
    if (/เตียง/.test(name)) return 'bed';
    if (/ตู้เสื้อผ้า/.test(name)) return 'wardrobe';
    if (/ซิงค์|ซิงก์|อ่างล้างจาน/.test(name)) return 'sink';
    if (/พัดลม/.test(name)) return 'fan';
    if (/เตา/.test(name)) return 'stove';
    if (/มาตร.*น้ำ|มิเตอร์น้ำ/.test(name)) return 'water';
    if (/มาตร.*ไฟ|มิเตอร์.*ไฟ/.test(name)) return 'electricity';
    return undefined;
}
export const assetKey = (code: string) => code.replace(/[^a-z0-9]/gi, '').toLowerCase();
export function isMissingAssetNumber(value?: string) {
    const text = String(value || '').trim();
    return !text || /^[-_\s0]+$/.test(text) || /^(ไม่มี|ไม่พบ|ไม่ปรากฏ|ไม่เจอ|หาไม่เจอ)/.test(text);
}

export function codesFromCell(value: unknown): string[] {
    const text = String(value ?? '').trim();
    const codes: string[] = [];
    const regex = /(\d{3,}(?:-\d{2,})*)\/(\d+)(?:\s*-\s*(\d+))?/g;
    for (const match of text.matchAll(regex)) {
        const [, prefix, suffix, range] = match;
        codes.push(`${prefix}/${suffix}`);
        if (range && Number(range) >= Number(suffix) && Number(range) - Number(suffix) <= 10) {
            for (let n = Number(suffix) + 1; n <= Number(range); n++) codes.push(`${prefix}/${n}`);
        }
        const remainder = text.slice((match.index || 0) + match[0].length);
        const shorthand = remainder.match(/^\s*(?:และ|,|\+)\s*(\d{1,5})(?![\d/-])/);
        if (shorthand && !range) codes.push(`${prefix}/${shorthand[1]}`);
    }
    if (!codes.length && /^\d{6,}$/.test(text) && !/^0+$/.test(text)) codes.push(text);
    return [...new Map(codes.map(code => [assetKey(code), code])).values()];
}

export function parseAssetRows(rows: unknown[][], confirmations: AssetCategoryConfirmation[] = []) {
    const header = rows[0] || [];
    if (!String(header[1]).includes('ห้อง') || !String(header[2]).includes('ปรับอากาศ') || !String(header[14]).includes('พัดลม')) {
        throw new Error('รูปแบบไฟล์ไม่ตรงกับแบบสำรวจครุภัณฑ์ที่รองรับ');
    }
    const candidates: AssetCandidate[] = [];
    const warnings: string[] = [];
    const seen = new Set<string>();
    rows.slice(1).forEach((row, index) => {
        if (row.every(value => !String(value ?? '').trim())) return;
        const room = String(row[1] ?? '').trim().match(/(?:^|\/)(\d{3,4})$/)?.[1];
        if (!room) { warnings.push(`แถว ${index + 2}: อ่านเลขห้องไม่ได้`); return; }
        const add = (category: AssetCategory, code: string) => {
            const key = `${room}:${category}:${assetKey(code)}`;
            if (!seen.has(key)) { seen.add(key); candidates.push({ room_number: room, category, asset_number: code, source_row: index + 2 }); }
        };
        for (const [column, category] of [[2, 'air'], [8, 'wardrobe'], [11, 'sink'], [14, 'fan'], [17, 'stove'], [20, 'water'], [23, 'electricity']] as const) {
            for (const code of codesFromCell(row[column])) {
                // A fan code in the air-conditioner column cannot be matched safely.
                if (category === 'air' && assetKey(code).startsWith('4140')) {
                    const confirmed = confirmations.some(item => item.room_number === room && item.category === category && assetKey(item.asset_number) === assetKey(code));
                    if (!confirmed) {
                        warnings.push(`ห้อง ${room} เซลล์ C${index + 2}: ${code} อยู่ในช่องเครื่องปรับอากาศ แต่รูปแบบคล้ายเลขพัดลม ไม่นำเข้าอัตโนมัติ ต้องยืนยันประเภทหากเลขนี้ยังไม่มีในทะเบียน`);
                        continue;
                    }
                }
                add(category, code);
            }
        }
        const bedCodes = codesFromCell(row[5]);
        for (const code of bedCodes) {
            const key = assetKey(code);
            if (key.startsWith('7105008')) add('mattress', code);
            else if (key.startsWith('7105002') || key.startsWith('7105006') || bedCodes.length === 1) add('bed', code);
            else warnings.push(`ห้อง ${room}: แยกเลขเตียง/ที่นอน ${code} ไม่ได้ กรุณาตรวจสอบ`);
        }
    });
    return { candidates, warnings };
}

export function planAssetImport(rooms: AssetImportRoom[], candidates: AssetCandidate[]) {
    const warnings: string[] = [];
    const changes: { room_id: string; room_number: string; equipment: RoomEquipmentItem[]; filled: number }[] = [];
    const owners = new Map<string, string>();
    rooms.forEach(room => room.equipment?.forEach(item => {
        if (!isMissingAssetNumber(item.asset_number)) owners.set(assetKey(item.asset_number!), room.id);
    }));
    const grouped = new Map<string, AssetCandidate[]>();
    candidates.forEach(candidate => grouped.set(candidate.room_number, [...(grouped.get(candidate.room_number) || []), candidate]));
    for (const [roomNumber, source] of grouped) {
        const matches = rooms.filter(room => room.room_number === roomNumber);
        if (matches.length !== 1) { warnings.push(`ห้อง ${roomNumber}: ${matches.length ? 'มีเลขห้องซ้ำในระบบ' : 'ไม่พบห้องในระบบ'}`); continue; }
        const room = matches[0];
        const items = (room.equipment?.length ? room.equipment : createDefaultRoomEquipment()).map(item => ({ ...item }));
        let filled = 0;
        for (const category of Object.keys(categoryNames) as AssetCategory[]) {
            const sources = [...new Map(source.filter(item => item.category === category).map(item => [assetKey(item.asset_number), item])).values()];
            const targets = items.filter(item => equipmentCategory(item.name) === category);
            const existing = new Set(targets.filter(item => !isMissingAssetNumber(item.asset_number)).map(item => assetKey(item.asset_number!)));
            const newCodes = sources.filter(item => !existing.has(assetKey(item.asset_number)));
            const blanks = targets.filter(item => isMissingAssetNumber(item.asset_number));
            if (!targets.length && sources.length) {
                warnings.push(`ห้อง ${roomNumber}: ไม่มีรายการ ${categoryNames[category]} ในทะเบียน กรุณาเพิ่มรายการก่อน`);
                continue;
            }
            if (newCodes.length > blanks.length) {
                warnings.push(`ห้อง ${roomNumber}: ${categoryNames[category]} ในไฟล์ ${newCodes.map(item => item.asset_number).join(', ')} ไม่ตรงกับทะเบียน ${targets.filter(item => !isMissingAssetNumber(item.asset_number)).map(item => item.asset_number).join(', ') || '(ไม่มีเลขเดิม)'} ข้ามรายการที่อาจเขียนทับ/จับคู่ผิด`);
                continue;
            }
            newCodes.forEach((candidate, index) => {
                const key = assetKey(candidate.asset_number);
                if (owners.has(key)) {
                    warnings.push(`ห้อง ${roomNumber}: เลข ${candidate.asset_number} มีในทะเบียนแล้ว ข้ามรายการซ้ำ`);
                    return;
                }
                blanks[index].asset_number = candidate.asset_number;
                owners.set(key, room.id);
                filled++;
            });
        }
        if (filled) changes.push({ room_id: room.id, room_number: roomNumber, equipment: items, filled });
    }
    return { changes, warnings, filled: changes.reduce((sum, room) => sum + room.filled, 0) };
}
