import React, { useState, useEffect } from 'react';
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
    Select,
    HStack,
    VStack,
    Text,
    Box,
    Spinner,
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

    // 12 months data
    const [meterData, setMeterData] = useState<MeterData[]>([]);

    const years = createListCollection({
        items: Array.from({ length: 5 }, (_, i) => ({
            label: (currentYear - 2 + i).toString(),
            value: (currentYear - 2 + i).toString()
        })),
    });

    useEffect(() => {
        if (open && roomId) {
            fetchHistory();
        }
    }, [open, roomId, selectedYear]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await roomService.getMeterHistory(roomId, selectedYear);

            // Generate empty 12 months structure
            const months = Array.from({ length: 12 }, (_, i) => {
                const m = i + 1;
                const monthStr = `${selectedYear}-${String(m).padStart(2, '0')}`;
                const existing = data.find((d: any) => d.month === monthStr);
                return {
                    month: monthStr,
                    water: existing ? existing.water_meter : '',
                    elec: existing ? existing.electricity_meter : '',
                };
            });

            setMeterData(months);
        } catch (error) {
            console.error('Error fetching history:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: 'ไม่สามารถโหลดข้อมูลประวัติได้',
                type: 'error',
            });
        } finally {
            setLoading(false);
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
                display: 'block',
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
                            <SelectRoot
                                collection={years}
                                value={[selectedYear.toString()]}
                                onValueChange={(e) => setSelectedYear(Number(e.value[0]))}
                                width="150px"
                            >
                                <SelectTrigger>
                                    <SelectValueText />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.items.map((year) => (
                                        <SelectItem item={year} key={year.value}>
                                            {year.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </SelectRoot>
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
                    <Button onClick={handleSave} loading={saving} colorPalette="blue">
                        <LuSave /> บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
