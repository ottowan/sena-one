import React from 'react';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import type { RevenueStats } from '../../services/reportService';

interface RevenueChartProps {
    stats: RevenueStats[];
}

export const RevenueChart: React.FC<RevenueChartProps> = ({ stats }) => {
    const maxAmount = Math.max(...stats.map(s => s.amount), 1); // Avoid div by zero

    return (
        <Box w="full" h="300px" p={4}>
            <HStack align="flex-end" justify="space-between" h="full" w="full" gap={4}>
                {stats.length === 0 ? (
                    <Text color="gray.500" w="full" textAlign="center">ไม่มีข้อมูลรายรับ</Text>
                ) : (
                    stats.map((stat) => {
                        const heightPercentage = (stat.amount / maxAmount) * 100;
                        return (
                            <VStack key={stat.month} flex={1} h="full" justify="flex-end" gap={2}>
                                <Text fontSize="xs" color="gray.500">฿{stat.amount.toLocaleString()}</Text>
                                <Box
                                    w="full"
                                    maxW="40px"
                                    h={`${heightPercentage}%`}
                                    bg="blue.500"
                                    borderTopRadius="md"
                                    transition="height 0.3s"
                                    _hover={{ bg: 'blue.600' }}
                                />
                                <Text fontSize="xs" fontWeight="medium">
                                    {new Date(stat.month).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })}
                                </Text>
                            </VStack>
                        );
                    })
                )}
            </HStack>
        </Box>
    );
};
