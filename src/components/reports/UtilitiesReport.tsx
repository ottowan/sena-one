import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    HStack,
    Input,
    Table,
    Text,
    VStack,
} from '@chakra-ui/react';
import { reportService } from '../../services/reportService';
import { toaster } from '../../components/ui/toaster';
import * as XLSX from 'xlsx';

export const UtilitiesReport: React.FC = () => {
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [month]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const result = await reportService.getUtilityReport(month);
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
            'เดือน': item.month,
            'ห้อง': item.room?.room_number,
            'ผู้เช่า': item.tenant_name,
            'น้ำ (เก่า)': item.water_prev,
            'น้ำ (ใหม่)': item.water_meter,
            'การใช้น้ำ (หน่วย)': item.water_usage,
            'ไฟ (เก่า)': item.elec_prev,
            'ไฟ (ใหม่)': item.electricity_meter,
            'การใช้ไฟ (หน่วย)': item.elec_usage,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Utility Report");
        XLSX.writeFile(wb, `utility_report_${month}.xlsx`);
    };

    return (
        <VStack gap={6} align="stretch" py={4}>
            {/* Filters */}
            <HStack wrap="wrap" justify="space-between">
                <HStack>
                    <Text fontWeight="medium" whiteSpace="nowrap">เลือกเดือน:</Text>
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        w="200px"
                    />
                </HStack>

                <Button colorPalette="green" onClick={handleExport} disabled={data.length === 0}>
                    Export Excel
                </Button>
            </HStack>

            {/* Table */}
            <Card.Root>
                <Card.Body overflowX="auto">
                    <Table.Root size="sm" interactive stickyHeader>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader rowSpan={2}>ห้อง</Table.ColumnHeader>
                                <Table.ColumnHeader rowSpan={2}>ผู้เช่า</Table.ColumnHeader>
                                <Table.ColumnHeader colSpan={3} textAlign="center" bg="blue.subtle">น้ำประปา (Water)</Table.ColumnHeader>
                                <Table.ColumnHeader colSpan={3} textAlign="center" bg="orange.subtle">ไฟฟ้า (Electricity)</Table.ColumnHeader>
                            </Table.Row>
                            <Table.Row>
                                {/* Water */}
                                <Table.ColumnHeader textAlign="right" bg="blue.subtle">ก่อนหน้า</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" bg="blue.subtle">ปัจจุบัน</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" bg="blue.muted" fontWeight="bold">ใช้ไป</Table.ColumnHeader>
                                {/* Elec */}
                                <Table.ColumnHeader textAlign="right" bg="orange.subtle">ก่อนหน้า</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" bg="orange.subtle">ปัจจุบัน</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" bg="orange.muted" fontWeight="bold">ใช้ไป</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {isLoading ? (
                                <Table.Row>
                                    <Table.Cell colSpan={8} textAlign="center" py={8}>กำลังโหลด...</Table.Cell>
                                </Table.Row>
                            ) : data.length === 0 ? (
                                <Table.Row>
                                    <Table.Cell colSpan={8} textAlign="center" py={8}>ไม่พบข้อมูล</Table.Cell>
                                </Table.Row>
                            ) : data.map((item, index) => (
                                <Table.Row key={item.id || index}>
                                    <Table.Cell fontWeight="medium">{item.room?.room_number}</Table.Cell>
                                    <Table.Cell>{item.tenant_name}</Table.Cell>

                                    <Table.Cell textAlign="right" color="fg.muted">{item.water_prev}</Table.Cell>
                                    <Table.Cell textAlign="right">{item.water_meter}</Table.Cell>
                                    <Table.Cell textAlign="right" fontWeight="bold" color="blue.fg">{item.water_usage}</Table.Cell>

                                    <Table.Cell textAlign="right" color="fg.muted">{item.elec_prev}</Table.Cell>
                                    <Table.Cell textAlign="right">{item.electricity_meter}</Table.Cell>
                                    <Table.Cell textAlign="right" fontWeight="bold" color="orange.fg">{item.elec_usage}</Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Card.Body>
            </Card.Root>
        </VStack>
    );
};
