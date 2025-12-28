import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    HStack,
    Input,
    Table,
    Text,
    Badge,
    VStack,
    Grid,
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
import { reportService } from '../../services/reportService';
import { toaster } from '../../components/ui/toaster';
import * as XLSX from 'xlsx';

export const FinancialReport: React.FC = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [status, setStatus] = useState<string[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const statusOptions = createListCollection({
        items: [
            { label: 'ทั้งหมด (All)', value: '' },
            { label: 'ชำระแล้ว (Paid)', value: 'paid' },
            { label: 'รอชำระ (Pending)', value: 'pending' },
            { label: 'ยกเลิก (Cancelled)', value: 'cancelled' },
        ]
    });

    useEffect(() => {
        fetchData();
    }, [month, status]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await reportService.getFinancialReport(month, status[0] || undefined);
            setData(result);
        } catch (error) {
            console.error(error);
            toaster.create({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูล', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

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
            'สถานะ': item.status === 'paid' ? 'ชำระแล้ว' : item.status === 'pending' ? 'รอชำระ' : 'ยกเลิก'
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
                <HStack>
                    <Text fontWeight="medium" whiteSpace="nowrap">เดือน:</Text>
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        w="200px"
                    />

                    <Text fontWeight="medium" ml={4} whiteSpace="nowrap">สถานะ:</Text>
                    <SelectRoot
                        collection={statusOptions}
                        value={status}
                        onValueChange={(e) => setStatus(e.value)}
                        width="200px"
                    >
                        <SelectTrigger clearable>
                            <SelectValueText placeholder="ทั้งหมด" />
                        </SelectTrigger>
                        <SelectContent>
                            {statusOptions.items.map((item) => (
                                <SelectItem item={item} key={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </SelectRoot>
                </HStack>

                <Button colorPalette="green" onClick={handleExport} disabled={data.length === 0}>
                    Export Excel
                </Button>
            </HStack>

            {/* Summary Cards */}
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                <Card.Root>
                    <Card.Body>
                        <Text color="gray.500" fontSize="sm">ยอดรับจริง (ชำระแล้ว)</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="green.500">
                            ฿{totalRevenue.toLocaleString()}
                        </Text>
                    </Card.Body>
                </Card.Root>
                <Card.Root>
                    <Card.Body>
                        <Text color="gray.500" fontSize="sm">ยอดรอชำระ</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="orange.500">
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
                                                    item.status === 'pending' ? 'yellow' : 'red'
                                            }
                                        >
                                            {item.status === 'paid' ? 'ชำระแล้ว' : item.status === 'pending' ? 'รอชำระ' : 'ยกเลิก'}
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
