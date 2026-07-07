import React, { useState, useEffect } from 'react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
} from '../../components/ui/dialog';
import {
    Button,
    VStack,
    HStack,
    Input,
    Text,
    Table,
    Box,
} from '@chakra-ui/react';

import { Checkbox } from '../../components/ui/checkbox';

import { contractService } from '../../services/contractService';
import { invoiceService } from '../../services/invoiceService';
import { toaster } from '../../components/ui/toaster';
import { type Contract, ContractStatus } from '../../types';
import { useQueryClient } from '@tanstack/react-query';

interface BulkInvoiceDialogProps {
    open: boolean;
    onClose: () => void;
}

interface BulkRowData {
    contract: Contract;
    waterMeterCurrent: number;
    electricityMeterCurrent: number;
    waterMeterLast: number;
    electricityMeterLast: number;
    isSelected: boolean;
}

export const BulkInvoiceDialog: React.FC<BulkInvoiceDialogProps> = ({ open, onClose }) => {
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState<BulkRowData[]>([]);
    const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [dueDate, setDueDate] = useState('');

    // Fetch active contracts when dialog opens
    useEffect(() => {
        if (open) {
            fetchActiveContracts();
            // Set default due date to 5th of next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(5);
            setDueDate(nextMonth.toISOString().slice(0, 10));
        }
    }, [open, billingMonth]);

    const fetchActiveContracts = async () => {
        setIsLoading(true);
        try {
            const contracts = await contractService.getContracts({ status: ContractStatus.ACTIVE });

            const [y, m] = billingMonth.split('-').map(Number);
            let prevY = y;
            let prevM = m - 1;
            if (prevM === 0) {
                prevM = 12;
                prevY -= 1;
            }
            const prevMonthStr = `${prevY}-${prevM.toString().padStart(2, '0')}`;
            const roomIds = contracts.map((contract) => contract.room_id);
            const meterReadings = await invoiceService.getMeterReadingsByMonths(roomIds, [prevMonthStr, billingMonth]);

            const rowsData = contracts.map((c) => {
                const prevMeter = meterReadings.get(`${c.room_id}:${prevMonthStr}`);
                const currentMeter = meterReadings.get(`${c.room_id}:${billingMonth}`);

                // Fallback for Last Meter if specifically prev month not found?
                // logic: if prev month empty, maybe try get absolute last? 
                // But user wants strict month logic. Let's keep strict or maybe fallback to 0.
                // Or maybe if prev not found, use lastReading?
                // Let's stick to strict logic first as per user request (Prev Month = Month-1).
                // If not found, it's 0 or maybe last available? 
                // For now, let's trust the strict logic.

                const lastWater = prevMeter?.water || 0;
                const lastElec = prevMeter?.electricity || 0;

                const currentWater = currentMeter?.water || 0;
                const currentElec = currentMeter?.electricity || 0;

                return {
                    contract: c,
                    waterMeterLast: lastWater,
                    electricityMeterLast: lastElec,
                    // If current meter found, use it. usage = current - last.
                    // If not found, default to last (so usage is 0 initially) OR keep empty?
                    // Input is number type, so 0.
                    // Wait, if current is 0 (not found), setting it to 0 might look like valid reading.
                    // But our input is number.
                    // Let's default to last reading so usage starts at 0, UNLESS current reading exists.
                    waterMeterCurrent: currentMeter ? currentWater : lastWater,
                    electricityMeterCurrent: currentMeter ? currentElec : lastElec,
                    isSelected: true // Default to selected
                };
            });

            // Sort by room number
            rowsData.sort((a, b) => a.contract.room?.room_number.localeCompare(b.contract.room?.room_number || '') || 0);

            setRows(rowsData);
        } catch (error) {
            console.error(error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูลสัญญา', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMeterChange = (index: number, field: 'water' | 'electricity', value: string) => {
        const numValue = parseFloat(value) || 0;
        setRows(prev => {
            const newRows = [...prev];
            if (field === 'water') newRows[index].waterMeterCurrent = numValue;
            else newRows[index].electricityMeterCurrent = numValue;
            return newRows;
        });
    };

    const handleSelect = (index: number, checked: boolean) => {
        setRows(prev => {
            const newRows = [...prev];
            newRows[index].isSelected = checked;
            return newRows;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        setRows(prev => prev.map(r => ({ ...r, isSelected: checked })));
    };

    const handleSubmit = async () => {
        const selectedRows = rows.filter(r => r.isSelected);
        if (selectedRows.length === 0) {
            toaster.create({ title: 'กรุณาเลือกรายการอย่างน้อย 1 รายการ', type: 'warning' });
            return;
        }

        if (!billingMonth || !dueDate) {
            toaster.create({ title: 'กรุณาระบุเดือนและวันที่ครบกำหนด', type: 'warning' });
            return;
        }

        setIsLoading(true);
        try {
            await invoiceService.createInvoicesBulk(
                selectedRows.map((row) => ({
                    contract: row.contract,
                    contract_id: row.contract.id,
                    billing_month: billingMonth,
                    due_date: dueDate,
                    water_usage: Math.max(0, row.waterMeterCurrent - row.waterMeterLast),
                    electricity_usage: Math.max(0, row.electricityMeterCurrent - row.electricityMeterLast),
                    water_meter_last: row.waterMeterLast,
                    water_meter_current: row.waterMeterCurrent,
                    electricity_meter_last: row.electricityMeterLast,
                    electricity_meter_current: row.electricityMeterCurrent,
                    additional_charges: [],
                }))
            );
            toaster.create({
                title: `สร้างใบแจ้งหนี้สำเร็จ ${selectedRows.length} รายการ`,
                type: 'success'
            });
            onClose();
            await queryClient.invalidateQueries({ queryKey: ['invoices'] });
        } catch (error) {
            console.error('Bulk invoice create failed:', error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้', type: 'error' });
        } finally {
            setIsLoading(false);
        }
        return;

        let successCount = 0;
        let failCount = 0;

        for (const row of selectedRows) {
            try {
                await invoiceService.createInvoice({
                    contract_id: row.contract.id,
                    billing_month: billingMonth, // YYYY-MM
                    due_date: dueDate,
                    water_usage: Math.max(0, row.waterMeterCurrent - row.waterMeterLast), // Auto calculate
                    electricity_usage: Math.max(0, row.electricityMeterCurrent - row.electricityMeterLast),
                    water_meter_last: row.waterMeterLast,
                    water_meter_current: row.waterMeterCurrent,
                    electricity_meter_last: row.electricityMeterLast,
                    electricity_meter_current: row.electricityMeterCurrent,
                    additional_charges: [] // No additional charges in bulk for now
                });
                successCount++;
            } catch (error) {
                console.error(`Failed to create invoice for room ${row.contract.room?.room_number}:`, error);
                failCount++;
            }
        }

        setIsLoading(false);
        toaster.create({
            title: `สร้างใบแจ้งหนี้สำเร็จ ${successCount} รายการ`,
            description: failCount > 0 ? `ล้มเหลว ${failCount} รายการ` : undefined,
            type: failCount > 0 ? 'warning' : 'success'
        });

        if (successCount > 0) {
            onClose();
            window.location.reload();
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} placement="center" size="xl">
            <DialogContent maxW="900px">
                <DialogHeader>
                    <DialogTitle>สร้างใบแจ้งหนี้แบบกลุ่ม (Bulk Generate)</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <VStack gap={6} align="stretch">
                        <HStack gap={4}>
                            <Box flex={1}>
                                <Text mb={1} fontSize="sm">เดือนที่เรียกเก็บ</Text>
                                <Input
                                    type="month"
                                    value={billingMonth}
                                    onChange={(e) => setBillingMonth(e.target.value)}
                                />
                            </Box>
                            <Box flex={1}>
                                <Text mb={1} fontSize="sm">กำหนดชำระ</Text>
                                <Input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </Box>
                        </HStack>

                        <Box overflowX="auto" maxH="500px">
                            <Table.Root size="sm" stickyHeader>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader width="40px">
                                            <Checkbox
                                                checked={rows.length > 0 && rows.every(r => r.isSelected)}
                                                onCheckedChange={(e) => handleSelectAll(!!e.checked)}
                                            />
                                        </Table.ColumnHeader>
                                        <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                                        <Table.ColumnHeader>ผู้เช่า</Table.ColumnHeader>
                                        <Table.ColumnHeader>มิเตอร์น้ำ (เก่า/ใหม่)</Table.ColumnHeader>
                                        <Table.ColumnHeader>มิเตอร์ไฟ (เก่า/ใหม่)</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {isLoading && rows.length === 0 ? (
                                        <Table.Row><Table.Cell colSpan={5} textAlign="center">กำลังโหลด...</Table.Cell></Table.Row>
                                    ) : rows.map((row, index) => (
                                        <Table.Row key={row.contract.id}>
                                            <Table.Cell>
                                                <Checkbox
                                                    checked={row.isSelected}
                                                    onCheckedChange={(e) => handleSelect(index, !!e.checked)}
                                                />
                                            </Table.Cell>
                                            <Table.Cell fontWeight="medium">{row.contract.room?.room_number}</Table.Cell>
                                            <Table.Cell maxW="150px" truncate>{row.contract.tenant?.full_name}</Table.Cell>
                                            <Table.Cell>
                                                <HStack>
                                                    <Text color="fg.muted" fontSize="xs" w="40px">{row.waterMeterLast}</Text>
                                                    <Input
                                                        size="xs"
                                                        width="80px"
                                                        type="number"
                                                        value={row.waterMeterCurrent}
                                                        onChange={(e) => handleMeterChange(index, 'water', e.target.value)}
                                                    />
                                                </HStack>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <HStack>
                                                    <Text color="fg.muted" fontSize="xs" w="40px">{row.electricityMeterLast}</Text>
                                                    <Input
                                                        size="xs"
                                                        width="80px"
                                                        type="number"
                                                        value={row.electricityMeterCurrent}
                                                        onChange={(e) => handleMeterChange(index, 'electricity', e.target.value)}
                                                    />
                                                </HStack>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Box>
                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <DialogActionTrigger asChild>
                        <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
                    </DialogActionTrigger>
                    <Button colorPalette="blue" onClick={handleSubmit} loading={isLoading}>
                        ยืนยันสร้าง {rows.filter(r => r.isSelected).length} รายการ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
