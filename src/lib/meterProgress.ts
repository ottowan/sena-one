export interface MeterProgressRow {
    waterMeterCurr: number | '';
    electricityMeterCurr: number | '';
    waterMeterPrev: number;
    electricityMeterPrev: number;
    isDirty?: boolean;
}
export function meterNeedsReview(row: MeterProgressRow) {
    return ([['waterMeterCurr', 'waterMeterPrev'], ['electricityMeterCurr', 'electricityMeterPrev']] as const)
        .some(([current, previous]) => row[current] !== '' && (!Number.isFinite(row[current]) || Number(row[current]) < row[previous]));
}
export function meterProgress(rows: MeterProgressRow[]) {
    const water = rows.filter(row => row.waterMeterCurr !== '').length;
    const electricity = rows.filter(row => row.electricityMeterCurr !== '').length;
    const complete = rows.filter(row => row.waterMeterCurr !== '' && row.electricityMeterCurr !== '').length;
    return { total: rows.length, water, electricity, complete,
        pending: rows.length - complete, review: rows.filter(meterNeedsReview).length,
        changed: rows.filter(row => row.isDirty && (row.waterMeterCurr !== '' || row.electricityMeterCurr !== '')).length,
        percent: rows.length ? Math.round((water + electricity) / (rows.length * 2) * 100) : 0 };
}
