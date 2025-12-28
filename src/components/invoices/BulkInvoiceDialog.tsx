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
    }, [open]);

    const fetchActiveContracts = async () => {
        setIsLoading(true);
        try {
            const contracts = await contractService.getContracts({ status: ContractStatus.ACTIVE });

            // Fetch last meter readings for each room in parallel
            const rowsData = await Promise.all(contracts.map(async (c) => {
                const lastMeter = await invoiceService.getLastMeterReading(c.room_id);
                return {
                    contract: c,
                    waterMeterLast: lastMeter.water,
                    electricityMeterLast: lastMeter.electricity,
                    waterMeterCurrent: lastMeter.water, // Default to last
                    electricityMeterCurrent: lastMeter.electricity, // Default to last
                    isSelected: true // Default to selected
                };
            }));

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
                                                    <Text color="gray.500" fontSize="xs" w="40px">{row.waterMeterLast}</Text>
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
                                                    <Text color="gray.500" fontSize="xs" w="40px">{row.electricityMeterLast}</Text>
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
