import React from 'react';
import {
    Box,
    Grid,
    Heading,
    Text,
    Card,
    HStack,
    VStack,
    Icon,
    Badge,
} from '@chakra-ui/react';
import {
    LuDoorOpen,
    LuDollarSign,
    LuBell,
    LuWrench,
    LuUsers,
    LuTrendingUp,
    LuTrendingDown,
} from 'react-icons/lu';
import { formatCurrency } from '../../lib/utils';
import { reportService } from '../../services/reportService';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    colorScheme: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    badge?: {
        text: string;
        colorScheme: string;
    };
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    colorScheme,
    trend,
    badge,
}) => {
    return (
        <Card.Root>
            <Card.Body>
                <HStack justify="space-between" align="start">
                    <VStack align="start" gap={2}>
                        <Text color="gray.600" fontSize="sm" fontWeight="medium">
                            {title}
                        </Text>
                        <Heading size="2xl">{value}</Heading>
                        {trend && (
                            <HStack gap={1} fontSize="sm">
                                <Icon color={trend.isPositive ? 'success.500' : 'danger.500'}>
                                    {trend.isPositive ? <LuTrendingUp /> : <LuTrendingDown />}
                                </Icon>
                                <Text
                                    color={trend.isPositive ? 'success.600' : 'danger.600'}
                                    fontWeight="medium"
                                >
                                    {trend.value}%
                                </Text>
                                <Text color="gray.500">จากเดือนที่แล้ว</Text>
                            </HStack>
                        )}
                    </VStack>
                    <Box
                        p={3}
                        borderRadius="lg"
                        bg={`${colorScheme}.100`}
                        color={`${colorScheme}.600`}
                    >
                        <Icon fontSize="2xl">
                            {icon}
                        </Icon>
                    </Box>
                </HStack>
                {badge && (
                    <Badge colorPalette={badge.colorScheme} mt={3}>
                        {badge.text}
                    </Badge>
                )}
            </Card.Body>
        </Card.Root>
    );
};

export const DashboardPage: React.FC = () => {
    const [stats, setStats] = React.useState<any>({
        totalRooms: 0,
        availableRooms: 0,
        occupiedRooms: 0,
        maintenanceRooms: 0,
        monthlyRevenue: 0,
        overduePayments: 0,
        activeTenants: 0,
        openMaintenanceRequests: 0,
    });
    const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
    const [statsLoading, setStatsLoading] = React.useState(true);
    const [activityLoading, setActivityLoading] = React.useState(true);

    React.useEffect(() => {
        let cancelled = false;

        const fetchStats = async () => {
            try {
                const statsData = await reportService.getDashboardStats();
                if (!cancelled) setStats(statsData);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                if (!cancelled) setStatsLoading(false);
            }
        };

        const fetchRecentActivity = async () => {
            try {
                const activityData = await reportService.getRecentActivity();
                if (!cancelled) setRecentActivity(activityData);
            } catch (error) {
                console.error('Error fetching recent activity:', error);
            } finally {
                if (!cancelled) setActivityLoading(false);
            }
        };

        void fetchStats();
        void fetchRecentActivity();

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <VStack align="stretch" gap={8} p={6}>
            <Box>
                <Heading size="2xl" mb={2}>
                    แดชบอร์ด
                </Heading>
                <Text color="gray.600" fontSize="lg">
                    ภาพรวมระบบจัดการหอพัก Sena-One
                </Text>
                {statsLoading && (
                    <Text color="gray.500" fontSize="sm" mt={2}>
                        กำลังอัปเดตข้อมูลสรุป...
                    </Text>
                )}
            </Box>

            <Grid
                templateColumns={{
                    base: '1fr',
                    md: 'repeat(2, 1fr)',
                    lg: 'repeat(4, 1fr)',
                }}
                gap={6}
            >
                <StatCard
                    title="ห้องว่าง"
                    value={stats.availableRooms}
                    icon={<LuDoorOpen />}
                    colorScheme="success"
                    badge={{
                        text: `${stats.totalRooms} ห้องทั้งหมด`,
                        colorScheme: 'gray',
                    }}
                />

                <StatCard
                    title="รายได้เดือนนี้"
                    value={formatCurrency(stats.monthlyRevenue)}
                    icon={<LuDollarSign />}
                    colorScheme="brand"
                />

                <StatCard
                    title="ค้างชำระ"
                    value={stats.overduePayments}
                    icon={<LuBell />}
                    colorScheme="danger"
                    badge={{
                        text: 'ต้องติดตาม',
                        colorScheme: 'red',
                    }}
                />

                <StatCard
                    title="แจ้งซ่อมค้างอยู่"
                    value={stats.openMaintenanceRequests}
                    icon={<LuWrench />}
                    colorScheme="warning"
                />
            </Grid>

            <Grid
                templateColumns={{
                    base: '1fr',
                    md: 'repeat(2, 1fr)',
                }}
                gap={6}
            >
                <Card.Root>
                    <Card.Header>
                        <Heading size="md">สรุปห้องพัก</Heading>
                    </Card.Header>
                    <Card.Body>
                        <VStack align="stretch" gap={4}>
                            <HStack justify="space-between">
                                <HStack gap={2}>
                                    <Box w={3} h={3} borderRadius="full" bg="success.500" />
                                    <Text>ห้องว่าง</Text>
                                </HStack>
                                <Text fontWeight="bold">{stats.availableRooms} ห้อง</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <HStack gap={2}>
                                    <Box w={3} h={3} borderRadius="full" bg="brand.500" />
                                    <Text>มีผู้เข้าพัก</Text>
                                </HStack>
                                <Text fontWeight="bold">{stats.occupiedRooms} ห้อง</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <HStack gap={2}>
                                    <Box w={3} h={3} borderRadius="full" bg="warning.500" />
                                    <Text>ซ่อมบำรุง</Text>
                                </HStack>
                                <Text fontWeight="bold">{stats.maintenanceRooms || 0} ห้อง</Text>
                            </HStack>
                            <HStack justify="space-between">
                                <HStack gap={2}>
                                    <Box w={3} h={3} borderRadius="full" bg="gray.300" />
                                    <Text>ห้องทั้งหมด</Text>
                                </HStack>
                                <Text fontWeight="bold">{stats.totalRooms} ห้อง</Text>
                            </HStack>
                        </VStack>
                    </Card.Body>
                </Card.Root>

                <Card.Root>
                    <Card.Header>
                        <Heading size="md">ผู้เช่า</Heading>
                    </Card.Header>
                    <Card.Body>
                        <VStack align="stretch" gap={4}>
                            <HStack justify="space-between">
                                <HStack gap={2}>
                                    <Icon color="brand.500">
                                        <LuUsers />
                                    </Icon>
                                    <Text>ผู้เช่าทั้งหมด</Text>
                                </HStack>
                                <Text fontWeight="bold" fontSize="2xl">
                                    {stats.activeTenants}
                                </Text>
                            </HStack>
                            <Text color="gray.600" fontSize="sm">
                                อัตราการเข้าพัก: {stats.totalRooms > 0 ? ((stats.occupiedRooms / stats.totalRooms) * 100).toFixed(1) : 0}%
                            </Text>
                        </VStack>
                    </Card.Body>
                </Card.Root>
            </Grid>

            <Card.Root>
                <Card.Header>
                    <Heading size="md">กิจกรรมล่าสุด</Heading>
                </Card.Header>
                <Card.Body>
                    <VStack align="stretch" gap={4}>
                        {activityLoading ? (
                            <Text color="gray.500" textAlign="center">
                                กำลังโหลดกิจกรรมล่าสุด...
                            </Text>
                        ) : recentActivity.length === 0 ? (
                            <Text color="gray.500" textAlign="center">
                                ไม่มีกิจกรรมล่าสุด
                            </Text>
                        ) : (
                            recentActivity.map((activity) => (
                                <HStack key={`${activity.type}-${activity.id}`} gap={4} p={4} bg="gray.50" borderRadius="md">
                                    <Box
                                        w={10}
                                        h={10}
                                        borderRadius="full"
                                        bg={activity.type === 'payment' ? 'success.100' : 'warning.100'}
                                        color={activity.type === 'payment' ? 'success.600' : 'warning.600'}
                                        display="flex"
                                        alignItems="center"
                                        justifyContent="center"
                                    >
                                        <Icon>
                                            {activity.type === 'payment' ? <LuDollarSign /> : <LuWrench />}
                                        </Icon>
                                    </Box>
                                    <VStack align="start" gap={0} flex={1}>
                                        <Text fontWeight="medium">{activity.title}</Text>
                                        <Text color="gray.600" fontSize="sm">
                                            {activity.description}
                                        </Text>
                                    </VStack>
                                    <Text color="gray.500" fontSize="sm">
                                        {new Date(activity.timestamp).toLocaleDateString('th-TH')}
                                    </Text>
                                </HStack>
                            ))
                        )}
                    </VStack>
                </Card.Body>
            </Card.Root>
        </VStack>
    );
};
