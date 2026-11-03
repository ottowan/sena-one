import React, { useState, useEffect, useRef } from 'react';
import {
    DialogRoot as Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogActionTrigger,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import {
    Table,
    Input,
    HStack,
    VStack,
    Text,
    Box,
    Spinner,
} from '@chakra-ui/react';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { roomService } from '../../services/roomService';
import { toaster } from '../../components/ui/toaster';
import { LuSave } from 'react-icons/lu';

interface MeterHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    roomId: string;
    roomNumber: string;
}

interface MeterData {
    month: string; // YYYY-MM
    water: number | '';
    elec: number | '';
}

export const MeterHistoryDialog: React.FC<MeterHistoryDialogProps> = ({
    open,
    onClose,
    roomId,
    roomNumber,
}) => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const historyRequest = useRef(0);

    // 12 months data
    const [meterData, setMeterData] = useState<MeterData[]>([]);

    const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

    useEffect(() => {
        if (open && roomId) {
            fetchHistory();
        }
        return () => { historyRequest.current += 1; };
    }, [open, roomId, selectedYear]);

    const fetchHistory = async () => {
        const request = ++historyRequest.current;
        setLoading(true);
        setMeterData([]);
        try {
            const data = await roomService.getMeterHistory(roomId, selectedYear);
            if (request !== historyRequest.current) return;

            // Generate empty 12 months structure
            const months = Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
                const existing = data.find((d: any) => d.month.startsWith(monthStr));
                return {
                    month: monthStr,
                    water: existing ? existing.water_meter : '',
                    elec: existing ? existing.electricity_meter : '',
                };
            });

            setMeterData(months);
        } catch (error) {
            if (request !== historyRequest.current) return;
            console.error('Error fetching history:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถโหลดข้อมูลประวัติได้',
                type: 'error',
            });
        } finally {
            if (request === historyRequest.current) setLoading(false);
        }
    };

    const handleInputChange = (index: number, field: 'water' | 'elec', value: string) => {
        const newData = [...meterData];
        newData[index] = {
            ...newData[index],
            [field]: value === '' ? '' : Number(value),
        };
        setMeterData(newData);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Save all non-empty records
            const promises = meterData.map(async (item) => {
                if (item.water !== '' || item.elec !== '') {
                    return roomService.updateMeterHistory(
                        roomId,
                        item.month,
                        item.water === '' ? 0 : Number(item.water),
                        item.elec === '' ? 0 : Number(item.elec)
                    );
                }
            });

            await Promise.all(promises);

            toaster.create({
                title: 'บันทึกสำเร็จ',
                type: 'success',
            });
        } catch (error) {
            console.error('Error saving history:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถบันทึกข้อมูลได้',
                type: 'error',
            });
        } finally {
            setSaving(false);
        }
    };

    const getMonthName = (monthStr: string) => {
        const date = new Date(monthStr + '-01');
        return date.toLocaleDateString('th-TH', { month: 'long' });
    };

    return (
        <Dialog open={open} onOpenChange={(e) => !e.open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>ประวัติมิเตอร์ - ห้อง {roomNumber}</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <VStack gap={4} align="stretch">
                        <HStack>
                            <Text whiteSpace="nowrap">เลือกปี:</Text>
                            <NativeSelectRoot width="170px" disabled={saving}>
                                <NativeSelectField aria-label="ปีประวัติมิเตอร์ห้องพัก" value={selectedYear} onChange={event => setSelectedYear(Number(event.target.value))}>
                                    {years.map(year => <option key={year} value={year}>พ.ศ. {year + 543}</option>)}
                                </NativeSelectField>
                            </NativeSelectRoot>
                        </HStack>

                        {loading ? (
                            <Box textAlign="center" py={8}>
                                <Spinner />
                            </Box>
                        ) : (
                            <Box overflowX="auto">
                                <Table.Root size="sm" striped>
                                    <Table.Header>
                                        <Table.Row>
                                            <Table.ColumnHeader>เดือน</Table.ColumnHeader>
                                            <Table.ColumnHeader width="150px">มิเตอร์น้ำ</Table.ColumnHeader>
                                            {/* <Table.ColumnHeader>มิเตอร์ไฟ</Table.ColumnHeader> */}
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        {meterData.map((item, index) => (
                                            <Table.Row key={item.month}>
                                                <Table.Cell>{getMonthName(item.month)}</Table.Cell>
                                                <Table.Cell>
                                                    <Input
                                                        type="number"
                                                        aria-label={`มิเตอร์น้ำ ${getMonthName(item.month)} ${selectedYear + 543}`}
                                                        value={item.water}
                                                        onChange={(e) => handleInputChange(index, 'water', e.target.value)}
                                                        size="sm"
                                                    />
                                                </Table.Cell>
                                                {/* <Table.Cell>
                                                    <Input
                                                        type="number"
                                                        value={item.elec}
                                                        onChange={(e) => handleInputChange(index, 'elec', e.target.value)}
                                                        size="sm"
                                                    />
                                                </Table.Cell> */}
                                            </Table.Row>
                                        ))}
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        )}
                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <DialogActionTrigger asChild>
                        <Button variant="outline" onClick={onClose}>ปิด</Button>
                    </DialogActionTrigger>
                    <Button onClick={handleSave} loading={saving} disabled={loading || !meterData.length} colorPalette="brand">
                        <LuSave /> บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
