export type MeterKind = 'water' | 'electricity';
export interface PastedMeterReading {
    roomNumber: string;
    value: number;
}

/** Accept two columns copied from Sheets, CSV, plain text, or Markdown. */
export function parseMeterPaste(text: string) {
    const readings = new Map<string, number>();
    const errors: string[] = [];
    let duplicates = 0;
    text.split(/\r?\n/).forEach((raw, index) => {
        const line = raw.trim();
        if (!line || /^```/.test(line) || /^[|\s:-]+$/.test(line)) return;
        const cells = (line.includes('|')
            ? line.replace(/^\|/, '').replace(/\|$/, '').split('|')
            : line.includes('\t') ? line.split('\t')
            : line.includes(',') ? line.split(',') : line.split(/\s+/)
        ).map(cell => cell.trim());
        if (/^(เลขห้อง|ห้อง|room|room_number|room number)$/i.test(cells[0])) return;
        const [roomNumber, value] = cells;
        if (cells.length !== 2 || !roomNumber || !/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value ?? '')) {
            errors.push(`บรรทัด ${index + 1}: ต้องมีเลขห้องและค่ามิเตอร์ที่เป็นตัวเลขตั้งแต่ 0 ขึ้นไป`);
            return;
        }
        const number = Number(value.replaceAll(',', ''));
        if (!Number.isFinite(number)) {
            errors.push(`บรรทัด ${index + 1}: ค่ามิเตอร์ไม่ถูกต้อง`);
        } else if (readings.has(roomNumber)) {
            if (readings.get(roomNumber) !== number) {
                errors.push(`ห้อง ${roomNumber}: มีค่ามิเตอร์ซ้ำที่ไม่ตรงกัน กรุณาเหลือค่าเดียว`);
            } else {
                duplicates++;
            }
        } else {
            readings.set(roomNumber, number);
        }
    });
    return {
        readings: [...readings].map(([roomNumber, value]) => ({ roomNumber, value })),
        errors,
        duplicates,
    };
}

/** Omit unread meters so importing water cannot zero out electricity. */
export function meterHistoryReadings(water: number | '', electricity: number | '') {
    return {
        ...(water !== '' ? { water_meter: water } : {}),
        ...(electricity !== '' ? { electricity_meter: electricity } : {}),
    };
}
