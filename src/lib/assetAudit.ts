import { assetKey, codesFromCell, equipmentCategory, isMissingAssetNumber, parseAssetRows, planAssetImport, type AssetCategory, type AssetImportRoom } from './assetImport';

const columns = [
    [2, 'C', 'air'], [5, 'F', 'bed'], [8, 'I', 'wardrobe'], [11, 'L', 'sink'],
    [14, 'O', 'fan'], [17, 'R', 'stove'], [20, 'U', 'water'], [23, 'X', 'electricity'],
] as const;

// Read-only reconciliation. Keep every source cell, including skipped codes and
// placeholders, so counts can distinguish "already registered" from "newly filled".
export function auditAssetRows(rows: unknown[][], rooms: AssetImportRoom[]) {
    const parsed = parseAssetRows(rows);
    const plan = planAssetImport(rooms, parsed.candidates);
    const owners = new Map<string, { room: string; name: string; asset_number: string }[]>();
    for (const room of rooms) for (const item of room.equipment || []) {
        if (isMissingAssetNumber(item.asset_number)) continue;
        const key = assetKey(item.asset_number!);
        owners.set(key, [...(owners.get(key) || []), { room: room.room_number, name: item.name, asset_number: item.asset_number! }]);
    }
    const cells = rows.slice(1).flatMap((row, index) => {
        const roomNumber = String(row[1] ?? '').trim().match(/(?:^|\/)(\d{3,4})$/)?.[1];
        if (!roomNumber) return [];
        const matches = rooms.filter(room => room.room_number === roomNumber);
        return columns.map(([column, letter, fallbackCategory]) => ({
            room: roomNumber, cell: `${letter}${index + 2}`, category: fallbackCategory,
            // Only asset columns are exposed: respondent names and old inspection
            // conditions are deliberately excluded from both JSON and Markdown.
            source_value: String(row[column] ?? '').trim(),
            codes: codesFromCell(row[column]).map(code => {
                const candidate = parsed.candidates.find(item => item.room_number === roomNumber && assetKey(item.asset_number) === assetKey(code) &&
                    (column === 5 ? ['bed', 'mattress'].includes(item.category) : item.category === fallbackCategory));
                const category: AssetCategory = candidate?.category || fallbackCategory;
                const targets = matches.flatMap(room => (room.equipment || []).filter(item => equipmentCategory(item.name) === category));
                const matching = targets.find(item => !isMissingAssetNumber(item.asset_number) && assetKey(item.asset_number!) === assetKey(code));
                const elsewhere = (owners.get(assetKey(code)) || []).filter(owner => owner.room !== roomNumber);
                const proposed = plan.changes.find(change => change.room_number === roomNumber)?.equipment.some(item => equipmentCategory(item.name) === category && assetKey(item.asset_number || '') === assetKey(code));
                const status = matches.length !== 1 ? 'room_missing_or_duplicated' : elsewhere.length ? 'registered_elsewhere' : matching ? (matching.asset_number === code ? 'matched' : 'format_difference') : !candidate ? 'needs_classification' : proposed ? 'ready_to_fill' : 'conflict';
                return { asset_number: code, category, status, registered: targets.filter(item => !isMissingAssetNumber(item.asset_number)).map(item => item.asset_number!), elsewhere };
            }),
        }));
    });
    const sourceRooms = [...new Set(cells.map(cell => cell.room))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const summary = sourceRooms.map(roomNumber => {
        const roomCells = cells.filter(cell => cell.room === roomNumber);
        const codes = [...new Map(roomCells.flatMap(cell => cell.codes).map(code => [`${code.category}:${assetKey(code.asset_number)}`, code])).values()];
        return {
            room: roomNumber, source_rows: [...new Set(roomCells.map(cell => cell.cell.replace(/\D/g, '')))].map(Number),
            source_codes: codes.length,
            matched: codes.filter(code => ['matched', 'format_difference'].includes(code.status)).length,
            ready_to_fill: codes.filter(code => code.status === 'ready_to_fill').length,
            needs_review: codes.filter(code => !['matched', 'format_difference', 'ready_to_fill'].includes(code.status)).length,
            registered_codes: rooms.filter(room => room.room_number === roomNumber).flatMap(room => room.equipment || []).filter(item => !isMissingAssetNumber(item.asset_number)).length,
        };
    });
    const sourceOwners = new Map<string, Set<string>>();
    for (const cell of cells) for (const code of cell.codes) {
        const key = assetKey(code.asset_number);
        sourceOwners.set(key, new Set([...(sourceOwners.get(key) || []), cell.room]));
    }
    return {
        source_rows: new Set(cells.map(cell => cell.cell.replace(/\D/g, ''))).size,
        source_rooms: sourceRooms.length, system_rooms: rooms.length,
        rooms_without_source: rooms.filter(room => !sourceRooms.includes(room.room_number)).map(room => room.room_number).sort(),
        summary, cells,
        duplicate_registry_codes: [...owners.values()].filter(items => items.length > 1),
        duplicate_source_codes: [...sourceOwners.entries()].filter(([, roomNumbers]) => roomNumbers.size > 1).map(([key, roomNumbers]) => ({ key, rooms: [...roomNumbers] })),
        warnings: [...parsed.warnings, ...plan.warnings],
    };
}
