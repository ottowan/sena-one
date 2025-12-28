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
import { supabase } from '../../lib/supabase';
import { ContractStatus } from '../../types';

interface MeterRow {
    roomId: string;
    roomNumber: string;
    tenantName: string;
    waterMeterPrev: number;
    waterMeterCurr: number;
    electricityMeterPrev: number;
    electricityMeterCurr: number;
    hasHistory: boolean; // true if current value comes from history_meter
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
            // 1. Get all active rooms/contracts (or all rooms?)
            // Usually we want active contracts. 
            // Also need to handle cases where there is no active contract but we want to record meter? 
            // For now, let's stick to active contracts + rooms.

            const { data: contracts, error: contractError } = await supabase
                .from('contracts')
                .select('*, room:rooms(*), tenant:tenants(*)')
                .eq('status', ContractStatus.ACTIVE)
                .order('room_id'); // We might want to order by room number logic

            if (contractError) throw contractError;

            // 2. Get history_meter for SELECTED month
            const { data: currentHistory, error: historyError } = await supabase
                .from('history_meter')
                .select('*')
                .eq('month', selectedMonth);

            if (historyError) throw historyError;

            // 3. Get history_meter for PREVIOUS month
            // Calculate previous month string
            const [year, month] = selectedMonth.split('-').map(Number);
            const prevDate = new Date(year, month - 2, 1); // month is 0-indexed in Date, so month-1 is current, month-2 is prev
            const prevMonthStr = prevDate.toISOString().slice(0, 7);

            const { data: prevHistory, error: prevHistoryError } = await supabase
                .from('history_meter')
                .select('*')
                .eq('month', prevMonthStr);

            if (prevHistoryError) throw prevHistoryError;

            // Map data
            const mappedRows: MeterRow[] = contracts.map(contract => {
                const room = contract.room;
                const tenant = contract.tenant;
                const roomId = room.id;

                // Find in histories
                const currRecord = currentHistory?.find(h => h.room_id === roomId);
                const prevRecord = prevHistory?.find(h => h.room_id === roomId);

                // Determine Previous Values
                let waterPrev = 0;
                let elecPrev = 0;

                if (prevRecord) {
                    waterPrev = prevRecord.water_meter;
                    elecPrev = prevRecord.electricity_meter;
                } else {
                    // Fallback to room's initial if not found in history? 
                    // Or keep 0. Let's try room's current if strictly 0? 
                    // Better to just show what we have.
                    // If no previous history, maybe valid 0.
                }

                return {
                    roomId: roomId,
                    roomNumber: room?.room_number || '',
                    tenantName: tenant?.full_name || '-',
                    waterMeterPrev: waterPrev,
                    electricityMeterPrev: elecPrev,
                    waterMeterCurr: currRecord ? currRecord.water_meter : waterPrev, // Default to prev if no curr
                    electricityMeterCurr: currRecord ? currRecord.electricity_meter : elecPrev,
                    hasHistory: !!currRecord
                };
            });

            // Sort by room number
            mappedRows.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

            setRows(mappedRows);

            // Create options for Select using createListCollection
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
        const numVal = parseFloat(value) || 0;
        setRows(prev => {
            const newRows = [...prev];
            if (type === 'water') newRows[index].waterMeterCurr = numVal;
            else newRows[index].electricityMeterCurr = numVal;
            return newRows;
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Update history_meter
            // We upsert. unique key in history_meter is usually (room_id, month).
            // check constraints.

            const payload = rows.map(row => ({
                room_id: row.roomId,
                month: selectedMonth,
                water_meter: row.waterMeterCurr,
                electricity_meter: row.electricityMeterCurr,
                // created_at / updated_at handled by db default?
            }));

            const { error } = await supabase
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
                                            <Table.Cell>{row.tenantName}</Table.Cell>

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
                                                    borderColor={row.waterMeterCurr < row.waterMeterPrev ? 'red.300' : 'gray.200'}
                                                />
                                                {row.waterMeterCurr < row.waterMeterPrev && (
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
                                                    borderColor={row.electricityMeterCurr < row.electricityMeterPrev ? 'red.300' : 'gray.200'}
                                                />
                                                {row.electricityMeterCurr < row.electricityMeterPrev && (
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
