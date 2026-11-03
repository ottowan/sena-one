import { ThaiDatePicker } from '../common/ThaiDatePicker';
import React, { useState, useEffect } from 'react';
import {
    Button,
    Card,
    HStack,
    Table,
    Text,
    Badge,
    VStack,
    Grid,
} from '@chakra-ui/react';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { reportService } from '../../services/reportService';
import { toaster } from '../../components/ui/toaster';
import * as XLSX from 'xlsx';

export const FinancialReport: React.FC = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [status, setStatus] = useState('');
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const statusOptions = [
        { label: 'ทั้งหมด (All)', value: '' },
        { label: 'ชำระแล้ว (Paid)', value: 'paid' },
        { label: 'รอชำระ (Pending)', value: 'pending' },
        { label: 'เกินกำหนด (Overdue)', value: 'overdue' },
        { label: 'ยกเลิก (Cancelled)', value: 'cancelled' },
    ];
    const statusLabel = (value: string) => statusOptions.find(item => item.value === value)?.label.split(' (')[0] || value;

    useEffect(() => {
        let cancelled = false;
        setData([]);
        setIsLoading(Boolean(month));
        if (month) {
            void reportService.getFinancialReport(month, status || undefined)
                .then(result => { if (!cancelled) setData(result); })
                .catch(error => {
                    if (cancelled) return;
                    console.error(error);
                    toaster.create({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', type: 'error' });
                })
                .finally(() => { if (!cancelled) setIsLoading(false); });
        }
        return () => { cancelled = true; };
    }, [month, status]);

    const handleExport = () => {
        const exportData = data.map(item => ({
            'วันที่': item.created_at?.slice(0, 10),
            'เดือนที่เรียกเก็บ': item.billing_month,
            'ห้อง': item.room?.room_number,
            'ผู้เช่า': item.tenant?.full_name,
            'ค่าเช่า': item.rent_amount,
            'ค่าน้ำ/หน่วย': item.water_usage,
            'ค่าน้ำ/บาท': item.water_cost,
            'ค่าไฟ/หน่วย': item.electricity_usage,
            'ค่าไฟ/บาท': item.electricity_cost,
            'ค่าอื่นๆ': item.additional_charges?.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0) || 0,
            'รวมทั้งสิ้น': item.total_amount,
            'สถานะ': statusLabel(item.status)
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financial Report");
        XLSX.writeFile(wb, `financial_report_${month}.xlsx`);
    };

    const totalRevenue = data
        .filter(d => d.status === 'paid')
        .reduce((sum, d) => sum + d.total_amount, 0);

    const pendingRevenue = data
        .filter(d => d.status === 'pending')
        .reduce((sum, d) => sum + d.total_amount, 0);

    return (
        <VStack gap={6} align="stretch" py={4}>
            {/* Filters */}
            <HStack wrap="wrap" justify="space-between">
                <HStack wrap="wrap" gap={3}>
                    <Text fontWeight="medium" whiteSpace="nowrap">เดือน:</Text>
                    <ThaiDatePicker
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        w="200px"
                    />

                    <Text fontWeight="medium" whiteSpace="nowrap">สถานะ:</Text>
                    <NativeSelectRoot width="200px">
                        <NativeSelectField aria-label="สถานะรายงานการเงิน" value={status} onChange={event => setStatus(event.target.value)}>
                            {statusOptions.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </NativeSelectField>
                    </NativeSelectRoot>
                </HStack>

                <Button colorPalette="green" onClick={handleExport} disabled={isLoading || data.length === 0}>
                    ส่งออก Excel
                </Button>
            </HStack>

            {/* Summary Cards */}
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                <Card.Root>
                    <Card.Body>
                        <Text color="fg.muted" fontSize="sm">ยอดรับจริง (ชำระแล้ว)</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="green.fg">
                            ฿{totalRevenue.toLocaleString()}
                        </Text>
                    </Card.Body>
                </Card.Root>
                <Card.Root>
                    <Card.Body>
                        <Text color="fg.muted" fontSize="sm">ยอดรอชำระ</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="orange.fg">
                            ฿{pendingRevenue.toLocaleString()}
                        </Text>
                    </Card.Body>
                </Card.Root>
            </Grid>

            {/* Table */}
            <Card.Root>
                <Card.Body overflowX="auto">
                    <Table.Root size="sm" interactive stickyHeader>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>วันที่ทำรายการ</Table.ColumnHeader>
                                <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                                <Table.ColumnHeader>ผู้เช่า</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right">ยอดรวม</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="center">สถานะ</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {isLoading ? (
                                <Table.Row>
                                    <Table.Cell colSpan={5} textAlign="center" py={8}>กำลังโหลด...</Table.Cell>
                                </Table.Row>
                            ) : data.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={5} textAlign="center" py={8}>ไม่พบข้อมูล</Table.Cell>
                                </Table.Row>
                            ) : data.map((item) => (
                                <Table.Row key={item.id}>
                                    <Table.Cell>{new Date(item.created_at).toLocaleDateString('th-TH')}</Table.Cell>
                                    <Table.Cell fontWeight="medium">{item.room?.room_number}</Table.Cell>
                                    <Table.Cell>{item.tenant?.full_name}</Table.Cell>
                                    <Table.Cell textAlign="right" fontWeight="bold">
                                        ฿{item.total_amount.toLocaleString()}
                                    </Table.Cell>
                                    <Table.Cell textAlign="center">
                                        <Badge
                                            colorPalette={
                                                item.status === 'paid' ? 'green' :
                                                    item.status === 'pending' ? 'yellow' : item.status === 'overdue' ? 'red' : 'gray'
                                            }
                                        >
                                            {statusLabel(item.status)}
                                        </Badge>
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Card.Body>
            </Card.Root>
        </VStack>
    );
};
