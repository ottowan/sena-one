import { ThaiDatePicker } from '../../components/common/ThaiDatePicker';
import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Table,
    Text,
    HStack,
    VStack,
    Card,
    Badge,
    Grid,
    Flex,
} from '@chakra-ui/react';
import { NativeSelectField, NativeSelectRoot } from '../../components/ui/native-select';
import { toaster } from '../../components/ui/toaster';
import { collection, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { fetchByIds, nowIso } from '../../lib/firestoreUtils';
import { ContractStatus } from '../../types';
import { MeterPasteImport } from '../../components/meters/MeterPasteImport';
import { meterHistoryReadings, type MeterKind, type PastedMeterReading } from '../../lib/meterPaste';
import { meterProgress, meterNeedsReview } from '../../lib/meterProgress';
import { PageHeader } from '../../components/common/PageHeader';
import { SummaryCard } from '../../components/common/SummaryCard';
import { SearchInput } from '../../components/common/SearchInput';
import { MeterReadingEditor, MeterReadingInput, MeterReadingUsage } from '../../components/meters/MeterReadingEditor';
import { thaiCalendarLabel } from '../../lib/thaiCalendar';
import { LuClipboardPaste, LuDroplets, LuZap, LuCircleCheck, LuTriangleAlert, LuSave } from 'react-icons/lu';

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
    const [roomOptions, setRoomOptions] = useState<{ items: { label: string; value: string }[] }>({ items: [] });
    const [pasteOpen, setPasteOpen] = useState(false);
    const [loadedMonth, setLoadedMonth] = useState('');
    const [rowFilter, setRowFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [meterKind, setMeterKind] = useState<MeterKind>('water');
    const loadRequestId = useRef(0);
    const dataReady = Boolean(selectedMonth) && loadedMonth === selectedMonth && !isLoading;

    const progress = meterProgress(rows);
    const filteredRows = rows.filter(row =>
        (!selectedRoom.length || selectedRoom.includes(row.roomId)) &&
        (!searchTerm.trim() || `${row.roomNumber} ${row.tenantName}`.toLowerCase().includes(searchTerm.trim().toLowerCase())) &&
        (rowFilter === 'all' || (rowFilter === 'pending' && (row.waterMeterCurr === '' || row.electricityMeterCurr === '')) ||
            (rowFilter === 'review' && meterNeedsReview(row)) || (rowFilter === 'changed' && row.isDirty && (row.waterMeterCurr !== '' || row.electricityMeterCurr !== '')))
    );

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
            setRoomOptions({ items: options });

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

    const readingProps = (row: MeterRow) => ({
        kind: meterKind, roomNumber: row.roomNumber,
        previous: meterKind === 'water' ? row.waterMeterPrev : row.electricityMeterPrev,
        current: meterKind === 'water' ? row.waterMeterCurr : row.electricityMeterCurr,
        disabled: !dataReady || isSaving,
        onChange: (value: string) => handleReadingChange(rows.findIndex(item => item.roomId === row.roomId), meterKind, value),
    });
    const statusBadge = (row: MeterRow) => (
        <Badge colorPalette={meterNeedsReview(row) ? 'red' : row.isDirty ? 'orange' : row.hasHistory ? 'green' : 'gray'}>
            {meterNeedsReview(row) ? 'ต้องตรวจสอบ' : row.isDirty ? 'ยังไม่บันทึก' : row.hasHistory ? 'บันทึกแล้ว' : 'รอกรอก'}
        </Badge>
    );

    return (
        <VStack gap={6} align="stretch">
            <PageHeader title="จัดการมิเตอร์" eyebrow="งานประจำเดือน"
                description="กรอกเลขหน้าปัด ดูยอดใช้ และตรวจสอบก่อนบันทึกในที่เดียว"
                actions={<>
                    <Box minW="190px"><ThaiDatePicker type="month" value={selectedMonth} disabled={isSaving}
                        onChange={e => {
                            if (e.target.value !== selectedMonth && progress.changed && !window.confirm('มีข้อมูลที่ยังไม่บันทึก ต้องการเปลี่ยนเดือนและละทิ้งการแก้ไขหรือไม่?')) return;
                            setSelectedMonth(e.target.value);
                        }} /></Box>
                    <Button variant="outline" colorPalette="brand" disabled={!dataReady || isSaving} onClick={() => setPasteOpen(open => !open)}>
                        <LuClipboardPaste />{pasteOpen ? 'ปิดช่องวางข้อมูล' : 'วางข้อมูลจากตาราง'}
                    </Button>
                </>} />
            <Grid templateColumns={{ base: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }} gap={3}>
                <SummaryCard label="ห้องทั้งหมด" value={dataReady ? progress.total : '—'} hint="ห้องพักในระบบ" icon={<LuCircleCheck />} />
                <SummaryCard label="กรอกมิเตอร์น้ำ" value={dataReady ? `${progress.water} / ${progress.total}` : '—'} hint="ห้องที่มีเลขหน้าปัดน้ำ" tone="blue" icon={<LuDroplets />} />
                <SummaryCard label="กรอกมิเตอร์ไฟ" value={dataReady ? `${progress.electricity} / ${progress.total}` : '—'} hint="ห้องที่มีเลขหน้าปัดไฟ" tone="orange" icon={<LuZap />} />
                <SummaryCard label="ต้องตรวจสอบ" value={dataReady ? progress.review : '—'} hint="ค่าต่ำกว่าครั้งก่อนหรือไม่ถูกต้อง" tone={progress.review ? 'danger' : 'brand'} icon={<LuTriangleAlert />} />
            </Grid>
            {pasteOpen && <MeterPasteImport key={selectedMonth} month={selectedMonth} rows={rows} disabled={!dataReady || isSaving} onApply={handlePasteApply} />}
            <Card.Root borderColor={meterKind === 'water' ? 'blue.fg' : 'orange.fg'} borderTopWidth="4px">
                <Card.Body p={{ base: 4, md: 5 }} gap={4}>
                    <Flex justify="space-between" gap={3} wrap="wrap" align="center">
                        <Box><Text fontSize="sm" color="fg.muted">กำลังกรอกข้อมูลประจำเดือน</Text>
                            <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold">{thaiCalendarLabel(selectedMonth, 'month') || 'กรุณาเลือกเดือน'}</Text></Box>
                        <HStack gap={2} wrap="wrap" aria-label="ประเภทมิเตอร์ที่กรอก">
                            <Button colorPalette="blue" variant={meterKind === 'water' ? 'solid' : 'outline'} aria-pressed={meterKind === 'water'} onClick={() => setMeterKind('water')}><LuDroplets />กรอกมิเตอร์น้ำ</Button>
                            <Button colorPalette="orange" variant={meterKind === 'electricity' ? 'solid' : 'outline'} aria-pressed={meterKind === 'electricity'} onClick={() => setMeterKind('electricity')}><LuZap />กรอกมิเตอร์ไฟฟ้า</Button>
                        </HStack>
                    </Flex>
                    <Text fontSize="sm" color="fg.muted">กรอกเลขสะสมบนหน้าปัดในช่อง “เลขครั้งนี้” ระบบคำนวณหน่วยที่ใช้ให้ · กด Enter เพื่อไปห้องถัดไป</Text>
                </Card.Body>
            </Card.Root>
            <Card.Root>
                <Card.Body gap={4} p={{ base: 4, md: 5 }}>
                    <Flex gap={3} direction={{ base: 'column', md: 'row' }}>
                        <Box flex={1}><SearchInput placeholder="ค้นหาเลขห้องหรือชื่อผู้เช่า..." value={searchTerm} onChange={setSearchTerm} /></Box>
                        <Box minW={{ md: '200px' }}>
                            <NativeSelectRoot disabled={!dataReady || isSaving}>
                                <NativeSelectField aria-label="กรองมิเตอร์ตามห้อง" value={selectedRoom[0] || ''} onChange={event => setSelectedRoom(event.target.value ? [event.target.value] : [])}>
                                    <option value="">ห้องทั้งหมด</option>
                                    {roomOptions.items.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </NativeSelectField>
                            </NativeSelectRoot>
                        </Box>
                    </Flex>
                    <Flex justify="space-between" gap={3} wrap="wrap" align="center">
                        <HStack wrap="wrap" gap={2}>
                            {[
                                { value: 'all', label: 'ทั้งหมด', count: progress.total },
                                { value: 'pending', label: 'ยังกรอกไม่ครบ', count: progress.pending },
                                { value: 'review', label: 'ต้องตรวจสอบ', count: progress.review },
                                { value: 'changed', label: 'มีการแก้ไข', count: progress.changed },
                            ].map(item => <Button key={item.value} type="button" size="sm" variant={rowFilter === item.value ? 'subtle' : 'ghost'}
                                colorPalette={item.value === 'review' ? 'red' : 'brand'} aria-pressed={rowFilter === item.value} onClick={() => setRowFilter(item.value)}>
                                {item.label}<Badge colorPalette={item.value === 'review' ? 'red' : 'gray'}>{item.count}</Badge>
                            </Button>)}
                        </HStack>
                        <HStack><Text fontSize="xs" color="fg.muted">แสดง {filteredRows.length} ห้อง</Text>
                            {(selectedRoom.length > 0 || searchTerm.trim() || rowFilter !== 'all') && <Button size="sm" variant="ghost" onClick={() => { setSelectedRoom([]); setSearchTerm(''); setRowFilter('all'); }}>ล้างตัวกรอง</Button>}
                        </HStack>
                    </Flex>
                    <Box h="5px" bg="bg.muted" borderRadius="full" overflow="hidden" role="progressbar"
                        aria-label="ความคืบหน้าการกรอกมิเตอร์" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
                        <Box h="full" w={`${progress.percent}%`} bg="brand.solid" borderRadius="full" />
                    </Box>
                </Card.Body>
            </Card.Root>
            {isLoading ? <Card.Root><Card.Body py={12}><Text textAlign="center" color="fg.muted">กำลังโหลดข้อมูลมิเตอร์...</Text></Card.Body></Card.Root> :
                !dataReady ? <Card.Root><Card.Body alignItems="center" gap={3} py={10}>
                    <Text color="fg.muted">{selectedMonth ? 'ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่' : 'เลือกเดือนเพื่อเริ่มจดมิเตอร์'}</Text>
                    {selectedMonth && <Button variant="outline" onClick={() => { void fetchMeterData(); }}>ลองอีกครั้ง</Button>}
                </Card.Body></Card.Root> :
                !filteredRows.length ? <Card.Root><Card.Body py={10}><Text textAlign="center" color="fg.muted">ไม่พบห้องตามเงื่อนไข ลองเปลี่ยนตัวกรองหรือคำค้นหา</Text></Card.Body></Card.Root> : <>
                    <Box className="table-panel" display={{ base: 'none', md: 'block' }} maxH="70vh">
                        <Table.Root size="md" interactive stickyHeader minW="700px">
                            <Table.Header><Table.Row>
                                <Table.ColumnHeader w="210px" position="sticky" left={0} zIndex={1}>ห้อง / ผู้เช่า</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right">เลขครั้งก่อน</Table.ColumnHeader>
                                <Table.ColumnHeader minW="210px" bg={meterKind === 'water' ? 'blue.subtle' : 'orange.subtle'} color={meterKind === 'water' ? 'blue.fg' : 'orange.fg'}>กรอกเลขครั้งนี้ · {meterKind === 'water' ? 'น้ำ' : 'ไฟฟ้า'}</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right">ใช้เดือนนี้</Table.ColumnHeader>
                                <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                            </Table.Row></Table.Header>
                            <Table.Body>{filteredRows.map(row => <Table.Row key={row.roomId}>
                                <Table.Cell position="sticky" left={0} bg="bg.panel" zIndex={1}>
                                    <Text fontSize="xl" fontWeight="bold">{row.roomNumber}</Text>
                                    <Text fontSize="xs" color={row.statusColor || 'fg.muted'} maxW="185px" lineClamp={2}>{row.tenantName}</Text>
                                </Table.Cell>
                                <Table.Cell textAlign="right" fontSize="lg" color="fg.muted" fontVariantNumeric="tabular-nums">{readingProps(row).previous.toLocaleString('th-TH')}</Table.Cell>
                                <Table.Cell bg={meterKind === 'water' ? 'blue.subtle' : 'orange.subtle'}><MeterReadingInput {...readingProps(row)} /></Table.Cell>
                                <Table.Cell textAlign="right"><MeterReadingUsage {...readingProps(row)} /></Table.Cell>
                                <Table.Cell>{statusBadge(row)}</Table.Cell>
                            </Table.Row>)}</Table.Body>
                        </Table.Root>
                    </Box>
                    <VStack align="stretch" gap={3} display={{ base: 'flex', md: 'none' }}>
                        {filteredRows.map(row => <Card.Root key={row.roomId}><Card.Body p={4} gap={4}>
                            <HStack justify="space-between"><Box><Text fontSize="lg" fontWeight="semibold">ห้อง {row.roomNumber}</Text><Text fontSize="xs" color={row.statusColor || 'fg.muted'}>{row.tenantName}</Text></Box>{statusBadge(row)}</HStack>
                            <MeterReadingEditor {...readingProps(row)} />
                        </Card.Body></Card.Root>)}
                    </VStack>
                </>}
            <Flex className="save-bar" position="sticky" bottom={4} zIndex={10} bg="bg.panel" borderWidth="1px" borderColor={progress.changed ? 'brand.emphasized' : 'border.default'}
                borderRadius="xl" boxShadow="lg" p={{ base: 3, md: 4 }} gap={3} align="center" justify="space-between">
                <Box><Text fontWeight="semibold" fontSize="sm">{progress.changed ? `มี ${progress.changed} ห้องที่ยังไม่บันทึก` : 'ข้อมูลการจดมิเตอร์'}</Text>
                    <Text fontSize="sm" color="fg.muted">{thaiCalendarLabel(selectedMonth, 'month')} · น้ำและไฟที่แก้ไข</Text></Box>
                <Button size="lg" colorPalette="brand" onClick={handleSave} loading={isSaving}
                    disabled={!dataReady || !progress.changed}><LuSave /><Box as="span" display={{ base: 'none', md: 'inline' }}>บันทึกการเปลี่ยนแปลง</Box><Box as="span" display={{ base: 'inline', md: 'none' }}>บันทึก</Box></Button>
            </Flex>
        </VStack>
    );
};
