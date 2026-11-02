/** Exclusive month bounds work for both YYYY-MM and ISO billing dates. */
export function billingMonthBounds(month: string) {
    const [year, monthNumber] = month.split('-').map(Number);
    const nextMonth = monthNumber === 12
        ? `${year + 1}-01`
        : `${year}-${String(monthNumber + 1).padStart(2, '0')}`;
    return { start: month, end: nextMonth };
}
