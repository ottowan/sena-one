import React, { useMemo } from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import type { RoomStatusStats } from '../../services/reportService';

interface RoomStatusChartProps {
    stats: RoomStatusStats;
}

const COLORS = {
    available: 'green.400',
    occupied: 'blue.400',
    maintenance: 'red.400',
    reserved: 'yellow.400'
};

const LABELS = {
    available: 'ว่าง',
    occupied: 'มีผู้เช่า',
    maintenance: 'ซ่อมบำรุง',
    reserved: 'จองแล้ว'
};

export const RoomStatusChart: React.FC<RoomStatusChartProps> = ({ stats }) => {
    const total = Object.values(stats).reduce((a, b) => a + b, 0);

    const segments = useMemo(() => {
        if (total === 0) return [];
        let accumulated = 0;
        return Object.entries(stats).map(([key, value]) => {
            const percentage = (value / total) * 100;
            const segment = {
                key,
                value,
                percentage,
                start: accumulated
            };
            accumulated += percentage;
            return segment;
        });
    }, [stats, total]);

    // Simple CSS Conic Gradient for Donut Chart
    const scenicGradient = segments.map(s => {
        const color = COLORS[s.key as keyof typeof COLORS].replace('.400', ''); // Simplified map logic needed for real CSS
        // Map Chakra color tokens to standard colors for CSS gradient:
        const colorMap: any = {
            available: '#48BB78', // green.400
            occupied: '#4299E1', // blue.400
            maintenance: '#F56565', // red.400
            reserved: '#ECC94B'  // yellow.400
        };
        return `${colorMap[s.key]} ${s.start}% ${s.start + s.percentage}%`;
    }).join(', ');

    const background = total > 0
        ? `conic-gradient(${scenicGradient})`
        : '#E2E8F0'; // Gray if empty

    return (
        <HStack align="center" justify="center" gap={8} wrap="wrap">
            {/* Chart */}
            <Box position="relative" w="200px" h="200px">
                <Box
                    w="100%"
                    h="100%"
                    borderRadius="full"
                    style={{ background }}
                />
                <Box
                    position="absolute"
                    top="50%"
                    left="50%"
                    transform="translate(-50%, -50%)"
                    w="140px"
                    h="140px"
                    bg="white"
                    borderRadius="full"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                >
                    <Text fontSize="3xl" fontWeight="bold">{total}</Text>
                    <Text fontSize="sm" color="gray.500">ห้องทั้งหมด</Text>
                </Box>
            </Box>

            {/* Legend */}
            <VStack align="start" gap={3}>
                {Object.entries(stats).map(([key, value]) => (
                    <HStack key={key}>
                        <Box w={3} h={3} borderRadius="full" bg={COLORS[key as keyof typeof COLORS]} />
                        <Text color="gray.600" minW="80px">{LABELS[key as keyof typeof LABELS]}</Text>
                        <Text fontWeight="bold">{value}</Text>
                        <Text fontSize="xs" color="gray.400">
                            ({total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)
                        </Text>
                    </HStack>
                ))}
            </VStack>
        </HStack>
    );
};
