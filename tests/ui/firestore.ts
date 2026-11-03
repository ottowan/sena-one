// In-memory fixtures only: no network or production database access.
const today = new Date();
const month = today.toISOString().slice(0, 7);
const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
const created = `${month}-02T09:00:00.000Z`;
const equipment = [{ id: 'asset1', name: 'เครื่องปรับอากาศ', asset_number: 'AC-101', quantity: 1, condition: 'good', status: 'good' }];
const rooms = Array.from({ length: 16 }, (_, i) => ({
    id: `r${i}`, room_number: String(301 + i), floor: 3,
    room_type: i % 3 ? 'ห้องพักมาตรฐาน' : 'ห้องพักขนาดใหญ่',
    status: i < 10 ? 'occupied' : i < 13 ? 'available' : i === 13 ? 'reserved' : 'maintenance',
    current_tenant_id: i < 10 ? `t${i}` : null, current_tenant_uid: i === 0 ? 'preview' : null,
    monthly_rent: 2500, water_rate: 18, electricity_rate: 8,
    current_water_meter: 1000 + i * 35, current_electricity_meter: 5000 + i * 120,
    created_at: created, equipment,
}));
const names = ['สมชาย ใจดี', 'อรทัย สุขสวัสดิ์', 'กิตติพงษ์ วัฒนชัย', 'วิภาดา แสงทอง', 'ธนากร ศิริกุล', 'สุภาวดี พรหมรักษ์', 'ณัฐวุฒิ มีสุข', 'ปาริชาติ จันทร์งาม', 'พีระพล สุขใจ', 'รัตนา พัฒนกิจ'];
const tenants = names.map((name, i) => ({ id: `t${i}`, full_name: name, status: 'active',
    user_id: i === 0 ? 'preview' : `user${i}`, phone: `08123456${String(i).padStart(2, '0')}`,
    current_room_id: `r${i}`, position_title: 'เจ้าหน้าที่', position_level: 'ปฏิบัติการ',
    id_card_number: '1234567890123', created_at: created, vehicles: [],
}));
const contracts = tenants.map((tenant, i) => ({ id: `c${i}`, tenant_id: tenant.id, room_id: `r${i}`, tenant_uid: i === 0 ? 'preview' : `user${i}`,
    status: 'active', start_date: '2025-01-01', end_date: '2029-12-31', monthly_rent: 2500, deposit_amount: 5000, created_at: created }));
const invoices = contracts.flatMap((contract, i) => [month, prevMonth].map((m, j) => ({
    id: `i${i}-${j}`, contract_id: contract.id, tenant_id: contract.tenant_id, tenant_uid: contract.tenant_uid, room_id: contract.room_id,
    billing_month: `${m}-01`, status: i < 4 ? 'paid' : i === 9 ? 'overdue' : 'pending',
    rent_amount: 2500, water_usage: 12, water_cost: 216, electricity_usage: 65, electricity_cost: 520,
    water_meter_last: 1000, water_meter_current: 1012, electricity_meter_last: 5000, electricity_meter_current: 5065,
    total_amount: 3236 + i * 20, additional_charges: [], due_date: `${m}-10`, created_at: created, updated_at: created,
})));
const history = rooms.flatMap((room, i) => [
    { id: `${room.id}_${prevMonth}`, room_id: room.id, month: prevMonth, water_meter: 1000 + i * 35, electricity_meter: 5000 + i * 120 },
    ...(i < 8 ? [{ id: `${room.id}_${month}`, room_id: room.id, month, water_meter: 1012 + i * 35, electricity_meter: 5065 + i * 120 }] : []),
]);
const tables: Record<string, any[]> = {
    rooms, tenants, contracts, invoices, history_meter: history,
    users: tenants.map((tenant, i) => ({ id: i === 0 ? 'preview' : `user${i}`, full_name: tenant.full_name, phone: tenant.phone, role: i === 0 ? 'admin' : 'tenant', created_at: created })),
    vehicles: tenants.slice(0, 5).map((tenant, i) => ({ id: `v${i}`, room_id: `r${i}`, plate: `กข ${1000 + i}`, province: 'กรุงเทพมหานคร', type: 'car', brand: 'Toyota', color: 'ขาว', has_sticker: true, created_at: created })),
    maintenance_requests: [{ id: 'm1', room_id: 'r0', tenant_id: 't0', tenant_uid: 'preview', title: 'เครื่องปรับอากาศไม่เย็น', description: 'เปิดใช้งานแล้วไม่มีลมเย็น ขอให้ตรวจสอบ', priority: 'normal', status: 'pending', created_at: created, images: [] }],
    app_settings: [{ id: 'singleton', water_rate: 18, electricity_rate: 8, common_fee: 0, water_maintenance_fee: 0 }],
    position_rent_rates: [{ id: 'ปฏิบัติการ', rent_amount: 2500, common_fee: 0 }],
};
const surveyYear = today.getFullYear();
tables.equipment_survey_rounds = [surveyYear, surveyYear - 1].map(year => ({ id: String(year), year, status: year === surveyYear ? 'open' : 'closed', room_count: rooms.length, opened_at: created, opened_by: 'preview' }));
for (const year of [surveyYear, surveyYear - 1]) {
    tables[`equipment_survey_rounds/${year}/rooms`] = rooms.map((room, i) => ({
        id: room.id, room_id: room.id, room_number: room.room_number, year, occupied_at_open: i < 10,
        status: year < surveyYear || i === 1 ? 'submitted' : 'pending',
        ...(year === surveyYear && i !== 1 ? { item_ids: ['asset1', 'asset2'], answered_count: 0 } : {}),
        items: [{ id: 'asset1', name: 'เครื่องปรับอากาศ', asset_number: year < surveyYear ? 'OLD-AC-101' : 'AC-101' }, { id: 'asset2', name: 'ตู้เสื้อผ้า', asset_number: 'C-101' }],
        answers: year < surveyYear || i === 1 ? [{ equipment_id: 'asset1', condition: 'normal', reason: '' }, { equipment_id: 'asset2', condition: 'deteriorated', reason: 'บานพับเสื่อมสภาพจากการใช้งาน' }] : [],
        ...(year < surveyYear || i === 1 ? { submitted_at: created, submitted_by: 'preview', submitted_by_name: 'สมชาย ใจดี' } : {}),
    }));
}
export { tables };
type Ref = { name: string; id?: string; constraints?: any[] };
export const collection = (_: unknown, ...parts: string[]): Ref => ({ name: parts.join('/') });
export const doc = (ref: any, ...parts: string[]): Ref => ref?.name ? { name: ref.name, id: parts[0] || 'new' } : { name: parts.slice(0, -1).join('/'), id: parts.at(-1) };
export const documentId = () => 'id';
export const serverTimestamp = () => new Date().toISOString();
export const where = (field: string, op: string, value: any) => ({ field, op, value });
export const orderBy = (field: string, direction = 'asc') => ({ field, direction });
export const limit = (count: number) => ({ count });
export const query = (ref: Ref, ...constraints: any[]) => ({ ...ref, constraints });
const snapshot = (row: any, name: string) => ({ id: row?.id, ref: { name, id: row?.id }, data: () => row, exists: () => !!row });
export async function getDoc(ref: Ref) { return snapshot((tables[ref.name] || []).find(row => row.id === ref.id), ref.name); }
export async function getDocs(ref: Ref) {
    const lowerMonth = ref.constraints?.find(c => c.field === 'month' && c.op === '>=')?.value;
    const delays = (window as Window & { __fixtureQueryDelays?: Record<string, number> }).__fixtureQueryDelays;
    const delay = delays?.[`${ref.name}:${lowerMonth}`];
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    let rows = [...(tables[ref.name] || [])];
    for (const c of ref.constraints || []) {
        if (c.direction) rows.sort((a, b) => String(a[c.field] || '').localeCompare(String(b[c.field] || '')) * (c.direction === 'desc' ? -1 : 1));
        else if (c.count) rows = rows.slice(0, c.count);
        else rows = rows.filter(row => {
            const value = row[c.field];
            if (c.op === '==') return value === c.value;
            if (c.op === 'in') return c.value.includes(value);
            if (c.op === '>=') return value >= c.value;
            if (c.op === '<=') return value <= c.value;
            if (c.op === '>') return value > c.value;
            if (c.op === '<') return value < c.value;
            return true;
        });
    }
    const docs = rows.map(row => snapshot(row, ref.name));
    return { docs, size: docs.length, empty: !docs.length, forEach: (fn: any) => docs.forEach(fn) };
}
export const getCountFromServer = async (ref: Ref) => {
    const snap = await getDocs(ref);
    return { data: () => ({ count: snap.size }) };
};
export const sum = (field: string) => field;
export const getAggregateFromServer = async (ref: Ref) => ({ data: () => ({ total: (tables[ref.name] || []).filter(row => row.status === 'paid').reduce((n, row) => n + row.total_amount, 0) }) });
export async function setDoc(ref: Ref, value: any, options?: any) {
    tables[ref.name] ||= [];
    const row = tables[ref.name].find(row => row.id === ref.id);
    if (row && options?.merge) Object.assign(row, value);
    else if (row) Object.assign(row, value);
    else tables[ref.name].push({ id: ref.id, ...value });
}
export const updateDoc = (ref: Ref, value: any) => setDoc(ref, value, { merge: true });
export const deleteDoc = async () => {};
export const deleteField = () => undefined;
export const writeBatch = () => {
    const operations: (() => Promise<void>)[] = [];
    return { set: (...args: Parameters<typeof setDoc>) => operations.push(() => setDoc(...args)), update: (ref: Ref, value: any) => operations.push(() => updateDoc(ref, value)), delete: () => {}, commit: async () => { await Promise.all(operations.map(op => op())); } };
};
export const runTransaction = async (_: any, fn: any) => fn({ get: getDoc, set: setDoc, update: updateDoc });
