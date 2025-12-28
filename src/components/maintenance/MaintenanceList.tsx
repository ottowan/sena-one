import React from 'react';
import { Box, Card, VStack, HStack, Text, Badge, Icon, Grid, IconButton } from '@chakra-ui/react';
import { LuWrench, LuEye, LuClock, LuCheck, LuX, LuInfo, LuBuilding, LuUser } from 'react-icons/lu';
import { Tooltip } from '../ui/tooltip';
import type { MaintenanceRequest, MaintenanceStatus, MaintenancePriority } from '../../types';

interface MaintenanceListProps {
    requests: MaintenanceRequest[];
    onView: (request: MaintenanceRequest) => void;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'completed': return 'green';
        case 'in_progress': return 'blue';
        case 'pending': return 'yellow';
        case 'cancelled': return 'gray';
        default: return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'completed': return 'เสร็จสิ้น';
        case 'in_progress': return 'กำลังดำเนินการ';
        case 'pending': return 'รอรับเรื่อง';
        case 'cancelled': return 'ยกเลิก';
        default: return status;
    }
};

const getPriorityColor = (priority: string): string => {
    switch (priority) {
        case 'urgent': return 'red';
        case 'high': return 'orange';
        case 'medium': return 'yellow';
        case 'low': return 'gray';
        default: return 'gray';
    }
};

const getPriorityLabel = (priority: string): string => {
    switch (priority) {
        case 'urgent': return 'ด่วนที่สุด';
        case 'high': return 'สูง';
        case 'medium': return 'ปานกลาง';
        case 'low': return 'ต่ำ';
        default: return priority;
    }
};

export const MaintenanceList: React.FC<MaintenanceListProps> = ({
    requests,
    onView,
}) => {
    return (
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={6}>
            {requests.map((request) => (
                <Card.Root key={request.id} _hover={{ shadow: 'md' }} transition="all 0.2s">
                    <Card.Body>
                        <VStack align="stretch" gap={4}>
                            <HStack justify="space-between" align="start">
                                <VStack align="start" gap={1} flex={1}>
                                    <HStack gap={2}>
                                        <Badge colorPalette={getPriorityColor(request.priority)}>
                                            {getPriorityLabel(request.priority)}
                                        </Badge>
                                        <Badge colorPalette={getStatusColor(request.status)} variant="outline">
                                            {getStatusLabel(request.status)}
                                        </Badge>
                                    </HStack>
                                    <Text fontWeight="bold" fontSize="lg" lineClamp={1}>
                                        {request.title}
                                    </Text>
                                </VStack>
                                <Tooltip content="ดูรายละเอียด">
                                    <IconButton
                                        aria-label="View"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onView(request)}
                                    >
                                        <Icon>
                                            <LuEye />
                                        </Icon>
                                    </IconButton>
                                </Tooltip>
                            </HStack>

                            <Text color="gray.600" fontSize="sm" lineClamp={2} h="40px">
                                {request.description}
                            </Text>

                            <VStack align="stretch" gap={2} pt={2} borderTopWidth="1px" borderColor="gray.100">
                                <HStack color="gray.500" fontSize="sm">
                                    <Icon>
                                        <LuBuilding />
                                    </Icon>
                                    <Text>ห้อง {request.room?.room_number || '-'}</Text>
                                </HStack>
                                <HStack color="gray.500" fontSize="sm">
                                    <Icon>
                                        <LuUser />
                                    </Icon>
                                    <Text>{request.tenant?.full_name || 'ไม่ระบุ'}</Text>
                                </HStack>
                                <HStack color="gray.400" fontSize="xs" justify="space-between">
                                    <HStack gap={1}>
                                        <Icon>
                                            <LuClock />
                                        </Icon>
                                        <Text>
                                            {new Date(request.created_at).toLocaleDateString('th-TH')}
                                        </Text>
                                    </HStack>
                                    {request.images && request.images.length > 0 && (
                                        <Badge variant="surface" colorPalette="blue">
                                            {request.images.length} รูป
                                        </Badge>
                                    )}
                                </HStack>
                            </VStack>
                        </VStack>
                    </Card.Body>
                </Card.Root>
            ))}
        </Grid>
    );
};
