export const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export function calendarValue(year: number, month: number, day?: number) {
    return `${String(year).padStart(4, '0')}-${String(month + 1).padStart(2, '0')}` +
        (day === undefined ? '' : `-${String(day).padStart(2, '0')}`);
}

export function thaiCalendarLabel(value: string, type: 'date' | 'month') {
    if (!value) return '';
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    if (!year || !THAI_MONTHS[month - 1]) return '';
    return `${type === 'date' ? `${day} ` : ''}${THAI_MONTHS[month - 1]} ${year + 543}`;
}

export function calendarDays(year: number, month: number) {
    const offset = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
        const day = index - offset + 1;
        return day > 0 && day <= days ? day : null;
    });
}
