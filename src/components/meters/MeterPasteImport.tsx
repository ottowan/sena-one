import { useMemo, useState } from 'react';
import { Button, Card, HStack, Table, Text, Textarea, VStack } from '@chakra-ui/react';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { parseMeterPaste, type MeterKind, type PastedMeterReading } from '../../lib/meterPaste';

interface Props {
    month: string;
    rows: {
        roomNumber: string;
        waterMeterCurr: number | '';
        waterMeterPrev: number;
        electricityMeterCurr: number | '';
        electricityMeterPrev: number;
    }[];
    disabled: boolean;
    onApply: (kind: MeterKind, readings: PastedMeterReading[]) => void;
}

export function MeterPasteImport({ month, rows, disabled, onApply }: Props) {
    const [text, setText] = useState('');
    const [kind, setKind] = useState<MeterKind>('water');
    const [confirmed, setConfirmed] = useState(false);
    const parsed = useMemo(() => parseMeterPaste(text), [text]);
    const roomByNumber = new Map(rows.map(row => [row.roomNumber, row]));
    const preview = parsed.readings.map(reading => {
        const row = roomByNumber.get(reading.roomNumber);
        const current = row ? (kind === 'water' ? row.waterMeterCurr : row.electricityMeterCurr) : '';
        const previous = row ? (kind === 'water' ? row.waterMeterPrev : row.electricityMeterPrev) : 0;
        return { ...reading, current, previous, missing: !row,
            lower: !!row && reading.value < previous,
            overwrite: current !== '' && current !== reading.value };
    });
    const requiresConfirmation = preview.some(row => row.lower || row.overwrite);
    const canApply = !disabled && preview.length > 0 && !parsed.errors.length &&
        !preview.some(row => row.missing) && (!requiresConfirmation || confirmed);

    return (
        <Card.Root>
            <Card.Body>
                <VStack align="stretch" gap={4}>
                    <Text fontWeight="bold">วางข้อมูลมิเตอร์ — เดือน {month || 'ยังไม่ได้เลือก'}</Text>
                    <Text fontSize="sm" color="fg.muted">
                        วาง 2 คอลัมน์: เลขห้อง และเลขหน้าปัดสะสมปัจจุบัน รองรับตารางจากแชตและ Google Sheets
                        นำเข้าตามเลขห้องได้ทุกห้อง แม้เลือกกรองห้องอยู่
                    </Text>
                    <NativeSelectRoot disabled={disabled}>
                        <NativeSelectField aria-label="ประเภทมิเตอร์ที่นำเข้า" value={kind}
                            onChange={e => { setKind(e.target.value as MeterKind); setConfirmed(false); }}>
                            <option value="water">มิเตอร์น้ำ</option>
                            <option value="electricity">มิเตอร์ไฟฟ้า</option>
                        </NativeSelectField>
                    </NativeSelectRoot>
                    <Textarea aria-label="ข้อมูลมิเตอร์ที่คัดลอก" value={text} rows={7} disabled={disabled}
                        placeholder={'เลขห้อง\tค่ามิเตอร์\n315\t2083\n325\t631'}
                        onChange={e => { setText(e.target.value); setConfirmed(false); }} />
                    {parsed.duplicates > 0 && <Text color="blue.fg">รวมรายการซ้ำที่มีค่าเหมือนกัน {parsed.duplicates} รายการแล้ว</Text>}
                    {parsed.errors.map((error, index) => <Text key={index} color="red.fg" role="alert">{error}</Text>)}
                    {preview.length > 0 && (
                        <Table.ScrollArea maxH="320px">
                            <Table.Root size="sm">
                                <Table.Header><Table.Row>
                                    <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                                    <Table.ColumnHeader>เดือนก่อน</Table.ColumnHeader>
                                    <Table.ColumnHeader>ค่าในตาราง</Table.ColumnHeader>
                                    <Table.ColumnHeader>ค่านำเข้า</Table.ColumnHeader>
                                    <Table.ColumnHeader>ตรวจสอบ</Table.ColumnHeader>
                                </Table.Row></Table.Header>
                                <Table.Body>{preview.map(row => (
                                    <Table.Row key={row.roomNumber}>
                                        <Table.Cell>{row.roomNumber}</Table.Cell>
                                        <Table.Cell>{row.missing ? '-' : row.previous}</Table.Cell>
                                        <Table.Cell>{row.current === '' ? '-' : row.current}</Table.Cell>
                                        <Table.Cell>{row.value}</Table.Cell>
                                        <Table.Cell color={row.missing || row.lower || row.overwrite ? 'red.fg' : 'green.fg'}>
                                            {row.missing ? 'ไม่พบห้องในระบบ' :
                                                [row.lower && 'ต่ำกว่าเดือนก่อน', row.overwrite && 'แทนที่ค่าในตาราง'].filter(Boolean).join(' / ') || 'พร้อมนำเข้า'}
                                        </Table.Cell>
                                    </Table.Row>
                                ))}</Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                    )}
                    {requiresConfirmation && (
                        <label>
                            <input type="checkbox" checked={confirmed} disabled={disabled}
                                onChange={e => setConfirmed(e.target.checked)} />{' '}
                            ตรวจสอบแล้ว ยืนยันค่าที่ต่ำกว่าเดือนก่อนหรือแทนที่ค่าในตาราง
                        </label>
                    )}
                    <HStack wrap="wrap">
                        <Button colorPalette="brand" disabled={!canApply} onClick={() => {
                            onApply(kind, parsed.readings);
                            setText('');
                            setConfirmed(false);
                        }}>นำ {preview.length} ห้องไปใส่ในตาราง</Button>
                        <Text fontSize="sm" color="fg.muted">จากนั้นกด “บันทึกการเปลี่ยนแปลง” เพื่อบันทึก</Text>
                    </HStack>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
}
