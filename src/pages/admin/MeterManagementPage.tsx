import React, { useState, useEffect } from 'react';
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
import { pgliteClient } from '../../lib/pgliteClient';
import { ContractStatus } from '../../types';

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

    const filteredRows = rows.filter(row => {
        if (selectedRoom.length === 0) return true;
        return selectedRoom.includes(row.roomId);
    });

    useEffect(() => {
        fetchMeterData();
    }, [selectedMonth]);

    const fetchMeterData = async () => {
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

            const [
                roomsResult,
                contractsResult,
                currentHistoryResult,
                prevHistoryResult,
                prevInvoicesResult,
            ] = await Promise.all([
                pgliteClient
                    .from('rooms')
                    .select('*')
                    .order('room_number'),
                pgliteClient
                    .from('contracts')
                    .select('*')
                    .eq('status', ContractStatus.ACTIVE),
                pgliteClient
                    .from('history_meter')
                    .select('*')
                    .eq('month', selectedMonth),
                pgliteClient
                    .from('history_meter')
                    .select('*')
                    .ilike('month', `${prevMonthStr}%`),
                pgliteClient
                    .from('invoices')
                    .select('room_id, water_meter_current, electricity_meter_current')
                    .gte('billing_month', `${prevMonthStr}-01`)
                    .lt('billing_month', `${selectedMonth}-01`)
                    .order('billing_month', { ascending: false }),
            ]);

            if (roomsResult.error) throw roomsResult.error;
            if (contractsResult.error) throw contractsResult.error;
            if (currentHistoryResult.error) throw currentHistoryResult.error;
            if (prevHistoryResult.error) throw prevHistoryResult.error;

            const allRooms = (roomsResult.data || []) as MeterRoomRow[];
            const contracts = (contractsResult.data || []) as MeterContractRow[];
            const currentHistory = (currentHistoryResult.data || []) as MeterHistoryRow[];
            const prevHistory = (prevHistoryResult.data || []) as MeterHistoryRow[];
            const prevMonthInvoices = (prevInvoicesResult.data || []) as MeterInvoiceRow[];

            const tenantIds = [...new Set(contracts.map((contract: any) => contract.tenant_id).filter(Boolean))];
            const tenantsResult = tenantIds.length
                ? await pgliteClient.from('tenants').select('id, full_name').in('id', tenantIds)
                : { data: [], error: null };

            if (tenantsResult.error) throw tenantsResult.error;

            const tenantMap = new Map(((tenantsResult.data || []) as MeterTenantRow[]).map((tenant) => [tenant.id, tenant]));
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
                        statusColor = 'red.600';
                    }
                    else if (room.status === 'available') {
                        tenantName = 'ห้องว่าง';
                        statusColor = 'green.600';
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
                    waterMeterCurr: currRecord ? currRecord.water_meter : '',
                    electricityMeterCurr: currRecord ? currRecord.electricity_meter : '',
                    hasHistory: !!currRecord
                };
            });

            // Sort by room number
            mappedRows.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

            setRows(mappedRows);

            // Create options for Select
            const options = mappedRows.map(r => ({ label: `ห้อง ${r.roomNumber}`, value: r.roomId }));
            setRoomOptions(createListCollection({ items: options }));

        } catch (error) {
            console.error('Error fetching meter data:', error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadingChange = (index: number, type: 'water' | 'electricity', value: string) => {
        const meterValue = value === '' ? '' : parseFloat(value) || 0;
        setRows(prev => {
            const newRows = [...prev];
            if (type === 'water') newRows[index].waterMeterCurr = meterValue;
            else newRows[index].electricityMeterCurr = meterValue;
            return newRows;
        });
    };

    const meterNumber = (value: number | '') => value === '' ? 0 : value;
    const isLowerThanPrevious = (value: number | '', previous: number) => value !== '' && value < previous;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update history_meter
            // We upsert. unique key in history_meter is usually (room_id, month).
            // check constraints.

            const payload = rows.map(row => ({
                room_id: row.roomId,
                month: selectedMonth,
                water_meter: meterNumber(row.waterMeterCurr),
                electricity_meter: meterNumber(row.electricityMeterCurr),
                // created_at / updated_at handled by db default?
            }));

            const { error } = await pgliteClient
                .from('history_meter')
                .upsert(payload, { onConflict: 'room_id, month' });

            if (error) throw error;

            toaster.create({ title: 'บันทึกข้อมูลเรียบร้อยแล้ว', type: 'success' });
            fetchMeterData(); // Refresh to ensure sync
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
                            <Input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                w="200px"
                            />
                        </HStack>
                    </HStack>

                </HStack>

                <Card.Root>
                    <Card.Body overflowX="auto">
                        <Table.Root size="sm" interactive stickyHeader>
                            <Table.Header>
                                <Table.Row>
                                    <Table.ColumnHeader w="100px">ห้อง</Table.ColumnHeader>
                                    <Table.ColumnHeader w="200px">ผู้เช่า</Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="center" colSpan={2} bg="blue.50" color="blue.700">
                                        น้ำประปา (Water)
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader textAlign="center" colSpan={2} bg="orange.50" color="orange.700">
                                        ไฟฟ้า (Electricity)
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader w="100px">สถานะ</Table.ColumnHeader>
                                </Table.Row>
                                <Table.Row>
                                    <Table.ColumnHeader></Table.ColumnHeader>
                                    <Table.ColumnHeader></Table.ColumnHeader>
                                    {/* Water Sub-headers */}
                                    <Table.ColumnHeader textAlign="right" bg="blue.50">ครั้งก่อน</Table.ColumnHeader>
                                    <Table.ColumnHeader bg="blue.50">ปัจจุบัน</Table.ColumnHeader>
                                    {/* Elec Sub-headers */}
                                    <Table.ColumnHeader textAlign="right" bg="orange.50">ครั้งก่อน</Table.ColumnHeader>
                                    <Table.ColumnHeader bg="orange.50">ปัจจุบัน</Table.ColumnHeader>
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
                                            <Table.Cell textAlign="right" color="gray.500">
                                                {row.waterMeterPrev}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={row.waterMeterCurr}
                                                    onChange={(e) => handleReadingChange(originalIndex, 'water', e.target.value)}
                                                    borderColor={isLowerThanPrevious(row.waterMeterCurr, row.waterMeterPrev) ? 'red.300' : 'gray.200'}
                                                />
                                                {isLowerThanPrevious(row.waterMeterCurr, row.waterMeterPrev) && (
                                                    <Text fontSize="xs" color="red.500">ต่ำกว่าครั้งก่อน</Text>
                                                )}
                                            </Table.Cell>

                                            {/* Electricity */}
                                            <Table.Cell textAlign="right" color="gray.500">
                                                {row.electricityMeterPrev}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Input
                                                    size="sm"
                                                    type="number"
                                                    value={row.electricityMeterCurr}
                                                    onChange={(e) => handleReadingChange(originalIndex, 'electricity', e.target.value)}
                                                    borderColor={isLowerThanPrevious(row.electricityMeterCurr, row.electricityMeterPrev) ? 'red.300' : 'gray.200'}
                                                />
                                                {isLowerThanPrevious(row.electricityMeterCurr, row.electricityMeterPrev) && (
                                                    <Text fontSize="xs" color="red.500">ต่ำกว่าครั้งก่อน</Text>
                                                )}
                                            </Table.Cell>

                                            <Table.Cell>
                                                {row.hasHistory ? (
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
                        px={8}
                    >
                        บันทึกการเปลี่ยนแปลง (Save Changes)
                    </Button>
                </Box>
            </VStack>
        </Container>
    );
};
