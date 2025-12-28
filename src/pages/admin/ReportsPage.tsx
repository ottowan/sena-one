import React, { useEffect, useState } from 'react';
import { Box, Heading, Text, VStack, Grid, Card, Tabs } from '@chakra-ui/react';
import { RoomStatusChart } from '../../components/reports/RoomStatusChart';
import { RevenueChart } from '../../components/reports/RevenueChart';
import { FinancialReport } from '../../components/reports/FinancialReport';
import { UtilitiesReport } from '../../components/reports/UtilitiesReport';
import { reportService } from '../../services/reportService';
import type { RoomStatusStats, RevenueStats } from '../../services/reportService';
import { toaster } from '../../components/ui/toaster';
import { LuLayoutDashboard, LuDollarSign, LuActivity } from 'react-icons/lu';

const ReportsPage: React.FC = () => {
    // Overview Data State
    const [roomStats, setRoomStats] = useState<RoomStatusStats | null>(null);
    const [revenueStats, setRevenueStats] = useState<RevenueStats[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [rooms, revenue] = await Promise.all([
                    reportService.getRoomStatusStats(),
                    reportService.getRevenueStats()
                ]);
                setRoomStats(rooms);
                setRevenueStats(revenue);
            } catch (error) {
                console.error('Error fetching reports:', error);
                toaster.create({
                    title: 'เกิดข้อผิดพลาดในการโหลดรายงาน',
                    type: 'error'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <Box p={6}>
            <Heading size="lg" mb={6}>รายงานและสถิติ (Reports & Statistics)</Heading>

            <Tabs.Root defaultValue="overview" variant="enclosed">
                <Tabs.List mb={4}>
                    <Tabs.Trigger value="overview">
                        <LuLayoutDashboard /> ภาพรวม (Overview)
                    </Tabs.Trigger>
                    <Tabs.Trigger value="financial">
                        <LuDollarSign /> การเงิน (Financial)
                    </Tabs.Trigger>
                    <Tabs.Trigger value="utilities">
                        <LuActivity /> สาธารณูปโภค (Utilities)
                    </Tabs.Trigger>
                </Tabs.List>

                {/* OVERVIEW TAB */}
                <Tabs.Content value="overview">
                    {isLoading ? (
                        <Box p={6}>กำลังโหลดข้อมูล...</Box>
                    ) : (
                        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
                            {/* Room Status Chart */}
                            <Card.Root>
                                <Card.Body>
                                    <Card.Title mb={4}>สถานะห้องพัก</Card.Title>
                                    {roomStats && <RoomStatusChart stats={roomStats} />}
                                </Card.Body>
                            </Card.Root>

                            {/* Revenue Chart */}
                            <Card.Root>
                                <Card.Body>
                                    <Card.Title mb={4}>รายรับ 6 เดือนย้อนหลัง</Card.Title>
                                    <RevenueChart stats={revenueStats} />
                                </Card.Body>
                            </Card.Root>
                        </Grid>
                    )}
                </Tabs.Content>

                {/* FINANCIAL TAB */}
                <Tabs.Content value="financial">
                    <FinancialReport />
                </Tabs.Content>

                {/* UTILITIES TAB */}
                <Tabs.Content value="utilities">
                    <UtilitiesReport />
                </Tabs.Content>
            </Tabs.Root>
        </Box>
    );
};

export default ReportsPage;
