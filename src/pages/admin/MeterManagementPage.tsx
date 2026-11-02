import { ThaiDatePicker } from '../../components/common/ThaiDatePicker';
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Container,
    Heading,
    Table,
    Input,
    Text,
    HStack,
    VStack,
    Card,
    Badge,
    createListCollection,
} from '@chakra-ui/react';
import {
    SelectContent,
    SelectItem,
    SelectLabel,
    SelectRoot,
    SelectTrigger,
    SelectValueText,
} from '../../components/ui/select';
import { toaster } from '../../components/ui/toaster';
import { collection, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { fetchByIds, nowIso } from '../../lib/firestoreUtils';
import { ContractStatus } from '../../types';
import { MeterPasteImport } from '../../components/meters/MeterPasteImport';
import { meterHistoryReadings, type MeterKind, type PastedMeterReading } from '../../lib/meterPaste';

interface MeterRow {
    roomId: string;
    roomNumber: string;
    tenantName: string;
    statusColor?: string;
    waterMeterPrev: number;
    waterMeterCurr: number | '';
    electricityMeterPrev: number;
    electricityMeterCurr: number | '';
    hasHistory: boolean; // true if current value comes from history_meter
    isDirty?: boolean;
}

interface MeterRoomRow {
    id: string;
    room_number: string;
    status: string;
    current_water_meter?: number | null;
    current_electricity_meter?: number | null;
}

interface MeterContractRow {
    room_id: string;
    tenant_id: string;
}

interface MeterTenantRow {
    id: string;
    full_name: string;
}

interface MeterHistoryRow {
    room_id: string;
    water_meter?: number | null;
    electricity_meter?: number | null;
}

interface MeterInvoiceRow {
    room_id: string;
    water_meter_current?: number | null;
    electricity_meter_current?: number | null;
}

export const MeterManagementPage: React.FC = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState<MeterRow[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<string[]>([]);
    const [roomOptions, setRoomOptions] = useState<any>(createListCollection({ items: [] }));
    const [pasteOpen, setPasteOpen] = useState(false);
    const [loadedMonth, setLoadedMonth] = useState('');
    const loadRequestId = useRef(0);
    const dataReady = Boolean(selectedMonth) && loadedMonth === selectedMonth && !isLoading;

    const filteredRows = rows.filter(row => {
        if (selectedRoom.length === 0) return true;
        return selectedRoom.includes(row.roomId);
    });

    useEffect(() => {
        void fetchMeterData();
        return () => { loadRequestId.current += 1; };
    }, [selectedMonth]);

    const fetchMeterData = async () => {
        const requestId = ++loadRequestId.current;
        setLoadedMonth('');
        if (!selectedMonth) {
            setRows([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [year, month] = selectedMonth.split('-').map(Number);
            let prevYear = year;
            let prevMonth = month - 1;
            if (prevMonth === 0) {
                prevMonth = 12;
                prevYear = prevYear - 1;
            }
            const prevMonthStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

            const [roomsSnap, contractsSnap, currentHistorySnap, prevHistorySnap, prevInvoicesSnap] = await Promise.all([
                getDocs(query(collection(db, 'rooms'), orderBy('room_number', 'asc'))),
                getDocs(query(collection(db, 'contracts'), where('status', '==', ContractStatus.ACTIVE))),
                getDocs(query(collection(db, 'history_meter'), where('month', '==', selectedMonth))),
                getDocs(query(collection(db, 'history_meter'), where('month', '==', prevMonthStr))),
                getDocs(
                    query(
                        collection(db, 'invoices'),
                        where('billing_month', '>=', `${prevMonthStr}-01`),
                        where('billing_month', '<', `${selectedMonth}-01`),
                        orderBy('billing_month', 'desc')
                    )
                ),
            ]);

            const allRooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as MeterRoomRow);
            const contracts = contractsSnap.docs.map((d) => d.data() as MeterContractRow);
            const currentHistory = currentHistorySnap.docs.map((d) => d.data() as MeterHistoryRow);
            const prevHistory = prevHistorySnap.docs.map((d) => d.data() as MeterHistoryRow);
            const prevMonthInvoices = prevInvoicesSnap.docs.map((d) => d.data() as MeterInvoiceRow);

            const tenantIds = [...new Set(contracts.map((contract) => contract.tenant_id).filter(Boolean))];
            const tenantById = await fetchByIds<MeterTenantRow>('tenants', tenantIds);

            const tenantMap = new Map([...tenantById.entries()].map(([id, tenant]) => [id, tenant]));
            const contractMap = new Map(contracts.map((contract) => [contract.room_id, contract]));
            const currentHistoryMap = new Map(currentHistory.map((history) => [history.room_id, history]));
            const prevHistoryMap = new Map(prevHistory.map((history) => [history.room_id, history]));
            const prevInvoiceMap = new Map<string, MeterInvoiceRow>();

            for (const invoice of prevMonthInvoices) {
                if (!prevInvoiceMap.has(invoice.room_id)) {
                    prevInvoiceMap.set(invoice.room_id, invoice);
                }
            }

            // Map data
            const mappedRows: MeterRow[] = allRooms.map(room => {
                const roomId = room.id;

                // Find Active Contract/Tenant
                const activeContract = contractMap.get(roomId);
                const activeTenant = activeContract ? tenantMap.get(activeContract.tenant_id) : null;
                let tenantName = '-';
                let statusColor = undefined;

                if (activeTenant) {
                    tenantName = activeTenant.full_name;
                } else {
                    // Use Room Status
                    if (room.status === 'maintenance') {
                        tenantName = 'ห้องชำรุด/ซ่อมบำรุง';
                        statusColor = 'red.fg';
                    }
                    else if (room.status === 'available') {
                        tenantName = 'ห้องว่าง';
                        statusColor = 'green.fg';
                    }
                    else if (room.status === 'reserved') tenantName = 'จองแล้ว';
                    else tenantName = `สถานะ: ${room.status}`;
                }

                // Find in histories
                const currRecord = currentHistoryMap.get(roomId);
                const prevRecord = prevHistoryMap.get(roomId);

                // Determine Previous Values
                let waterPrev = 0;
                let elecPrev = 0;

                if (prevRecord) {
                    waterPrev = prevRecord.water_meter || 0;
                    elecPrev = prevRecord.electricity_meter || 0;
                } else {
                    // Fallback to invoice (only works if room was occupied)
                    const prevInvoice = prevInvoiceMap.get(roomId);
                    if (prevInvoice) {
                        waterPrev = prevInvoice.water_meter_current || 0;
                        elecPrev = prevInvoice.electricity_meter_current || 0;
                    } else {
                        // If no history and no invoice (e.g. new vacant room or no data yet),
                        // maybe use room's initial meter?
                        // For safety, let's start at 0 or maintain 0.
                        // Or check room attributes if they have 'current_meter'.
                        // Current schema has 'current_water_meter' on rooms table but it might be stale?
                        // Let's use it as last resort if we want 'last known' state.
                        waterPrev = room.current_water_meter || 0;
                        elecPrev = room.current_electricity_meter || 0;
                    }
                }

                return {
                    roomId: roomId,
                    roomNumber: room.room_number,
                    tenantName: tenantName,
                    statusColor: statusColor,
                    waterMeterPrev: waterPrev,
                    electricityMeterPrev: elecPrev,
                    waterMeterCurr: currRecord?.water_meter ?? '',
                    electricityMeterCurr: currRecord?.electricity_meter ?? '',
                    hasHistory: !!currRecord
                };
            });

            // Sort by room number
            mappedRows.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

            if (requestId !== loadRequestId.current) return;
            setRows(mappedRows);
            setLoadedMonth(selectedMonth);

            // Create options for Select
            const options = mappedRows.map(r => ({ label: `ห้อง ${r.roomNumber}`, value: r.roomId }));
            setRoomOptions(createListCollection({ items: options }));

        } catch (error) {
            if (requestId !== loadRequestId.current) return;
            setRows([]);
            console.error('Error fetching meter data:', error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', type: 'error' });
        } finally {
            if (requestId === loadRequestId.current) setIsLoading(false);
        }
    };

    const handleReadingChange = (index: number, type: 'water' | 'electricity', value: string) => {
        const meterValue = value === '' ? '' : Number(value);
        setRows(prev => prev.map((row, rowIndex) => rowIndex === index ? {
            ...row,
            [type === 'water' ? 'waterMeterCurr' : 'electricityMeterCurr']: meterValue,
            isDirty: true,
        } : row));
    };

    const handlePasteApply = (kind: MeterKind, readings: PastedMeterReading[]) => {
        if (!dataReady || isSaving) return;
        const byRoom = new Map(readings.map(reading => [reading.roomNumber, reading.value]));
        setRows(prev => prev.map(row => byRoom.has(row.roomNumber) ? {
            ...row,
            [kind === 'water' ? 'waterMeterCurr' : 'electricityMeterCurr']: byRoom.get(row.roomNumber)!,
            isDirty: true,
        } : row));
        toaster.create({ title: `นำค่ามิเตอร์ ${readings.length} ห้องใส่ในตารางแล้ว กรุณากดบันทึก`, type: 'success' });
    };

    const isLowerThanPrevious = (value: number | '', previous: number) => value !== '' && value < previous;

    const handleSave = async () => {
        if (!dataReady || isSaving) return;
        const changedRows = rows.filter(row => row.isDirty && (row.waterMeterCurr !== '' || row.electricityMeterCurr !== ''));
        if (!changedRows.length) return;
        if (changedRows.some(row => [row.waterMeterCurr, row.electricityMeterCurr]
            .some(value => value !== '' && (!Number.isFinite(value) || value < 0)))) {
            toaster.create({ title: 'กรุณาตรวจสอบค่ามิเตอร์ ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป', type: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            // Update history_meter
            // We upsert. unique key in history_meter is usually (room_id, month).
            // check constraints.

            const batch = writeBatch(db);
            changedRows.forEach((row) => {
                const ref = doc(db, 'history_meter', `${row.roomId}_${selectedMonth}`);
                batch.set(
                    ref,
                    {
                        room_id: row.roomId,
                        month: selectedMonth,
                        ...meterHistoryReadings(row.waterMeterCurr, row.electricityMeterCurr),
                        updated_at: nowIso(),
                    },
                    { merge: true }
                );
            });
            await batch.commit();

            toaster.create({ title: 'บันทึกข้อมูลเรียบร้อยแล้ว', type: 'success' });
            await fetchMeterData(); // Refresh to ensure sync
        } catch (error) {
            console.error('Save error:', error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการบันทึก', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Container maxW="container.xl" py={8}>
            <VStack gap={6} align="stretch">
                <HStack justify="space-between">
                    <Heading size="lg">จัดการมิเตอร์ (Meter Management)</Heading>
                    <HStack>
                        <HStack>
                            <Text fontWeight="medium" whiteSpace="nowrap">เลือกห้อง:</Text>
                            <SelectRoot
                                collection={roomOptions}
                                value={selectedRoom}
                                onValueChange={(e) => setSelectedRoom(e.value)}
                                width="200px"
                            >
                                <SelectTrigger clearable>
                                    <SelectValueText placeholder="ทั้งหมด" />
                                </SelectTrigger>
                                <SelectContent>
                                    {roomOptions.items.map((movie: any) => (
                                        <SelectItem item={movie} key={movie.value}>
                                            {movie.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectRoot>

                            <Text fontWeight="medium" ml={4}>เลือกเดือน:</Text>
                            <ThaiDatePicker
                                type="month"
                                value={selectedMonth}
                                disabled={isSaving}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                w="200px"
                            />
                        </HStack>
                    </HStack>

                </HStack>

                <HStack wrap="wrap">
                    <Button variant="outline" disabled={!dataReady || isSaving} onClick={() => setPasteOpen(open => !open)}>
                        {pasteOpen ? 'ปิดช่องวางข้อมูล' : 'วางข้อมูลมิเตอร์จากตาราง'}
                    </Button>
                    <Text fontSize="sm" color="fg.muted">ช่องมิเตอร์ที่เว้นว่างจะไม่ถูกบันทึกเป็นศูนย์</Text>
                </HStack>
                {pasteOpen && (
                    <MeterPasteImport key={selectedMonth} month={selectedMonth} rows={rows}
                        disabled={!dataReady || isSaving} onApply={handlePasteApply} />
                )}

                <Card.Root>
                    <Card.Body overflowX="auto">
                        <Table.Root size="sm" interactive stickyHeader>
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader w="100px">ห้อง</Table.ColumnHeader>
                                    <Table.ColumnHeader w="200px">ผู้เช่า</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="center" colSpan={2} bg="blue.subtle" color="blue.fg">
                                        น้ำประปา (Water)
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="center" colSpan={2} bg="orange.subtle" color="orange.fg">
                                        ไฟฟ้า (Electricity)
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader w="100px">สถานะ</Table.ColumnHeader>
                                </Table.Row>
                                <Table.Row>
                                    <Table.ColumnHeader></Table.ColumnHeader>
                                    <Table.ColumnHeader></Table.ColumnHeader>
                                    {/* Water Sub-headers */}
                                    <Table.ColumnHeader textAlign="right" bg="blue.subtle">ครั้งก่อน</Table.ColumnHeader>
                                    <Table.ColumnHeader bg="blue.subtle">ปัจจุบัน</Table.ColumnHeader>
                                    {/* Elec Sub-headers */}
                                    <Table.ColumnHeader textAlign="right" bg="orange.subtle">ครั้งก่อน</Table.ColumnHeader>
                                    <Table.ColumnHeader bg="orange.subtle">ปัจจุบัน</Table.ColumnHeader>
                                    <Table.ColumnHeader></Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {isLoading ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={7} textAlign="center" py={8}>
                                            กำลังโหลดข้อมูล...
                                        </Table.Cell>
                                    </Table.Row>
                                ) : filteredRows.map((row) => {
                                    // Find index in original rows to update
                                    const originalIndex = rows.findIndex(r => r.roomId === row.roomId);
                                    return (
                                        <Table.Row key={row.roomId}>
                                            <Table.Cell fontWeight="bold">{row.roomNumber}</Table.Cell>
                                            <Table.Cell color={row.statusColor} fontWeight={row.statusColor ? 'bold' : 'normal'}>
                                                {row.tenantName}
                                            </Table.Cell>

                                            {/* Water */}
                                            <Table.Cell textAlign="right" color="fg.muted">
                                                {row.waterMeterPrev}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    min={0}
                                                    disabled={!dataReady || isSaving}
                                                    value={row.waterMeterCurr}
                                                    onChange={(e) => handleReadingChange(originalIndex, 'water', e.target.value)}
                                                    borderColor={isLowerThanPrevious(row.waterMeterCurr, row.waterMeterPrev) ? 'red.300' : 'border.default'}
                                                />
                                                {isLowerThanPrevious(row.waterMeterCurr, row.waterMeterPrev) && (
                                                    <Text fontSize="xs" color="red.fg">ต่ำกว่าครั้งก่อน</Text>
                                                )}
                                            </Table.Cell>

                                            {/* Electricity */}
                                            <Table.Cell textAlign="right" color="fg.muted">
                                                {row.electricityMeterPrev}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    min={0}
                                                    disabled={!dataReady || isSaving}
                                                    value={row.electricityMeterCurr}
                                                    onChange={(e) => handleReadingChange(originalIndex, 'electricity', e.target.value)}
                                                    borderColor={isLowerThanPrevious(row.electricityMeterCurr, row.electricityMeterPrev) ? 'red.300' : 'border.default'}
                                                />
                                                {isLowerThanPrevious(row.electricityMeterCurr, row.electricityMeterPrev) && (
                                                    <Text fontSize="xs" color="red.fg">ต่ำกว่าครั้งก่อน</Text>
                                                )}
                                            </Table.Cell>

                                            <Table.Cell>
                                                {row.isDirty ? (
                                                    <Badge colorPalette="orange">มีการแก้ไข ยังไม่บันทึก</Badge>
                                                ) : row.hasHistory ? (
                                                    <Badge colorPalette="green">บันทึกแล้ว</Badge>
                                                ) : (
                                                    <Badge colorPalette="gray">รอการบันทึก</Badge>
                                                )}
                                            </Table.Cell>
                                        </Table.Row>
                                    )
                                })}
                            </Table.Body>
                        </Table.Root>
                    </Card.Body>
                </Card.Root>

                <Box textAlign="right">
                    <Button
                        size="xl"
                        colorPalette="blue"
                        onClick={handleSave}
                        loading={isSaving}
                        disabled={!dataReady || !rows.some(row => row.isDirty && (row.waterMeterCurr !== '' || row.electricityMeterCurr !== ''))}
                        px={8}
                    >
                        บันทึกการเปลี่ยนแปลง (Save Changes)
                    </Button>
                </Box>
            </VStack>
        </Container>
    );
};
