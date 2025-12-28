import React from 'react';
import {
    Card,
    Heading,
    Text,
    HStack,
    VStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { LuPhone, LuMapPin, LuCar, LuPencil, LuTrash2, LuEye, LuLink } from 'react-icons/lu';
import type { Tenant } from '../../types';
import { Button } from '../ui/button';

interface TenantCardProps {
    tenant: Tenant;
    onView: (tenant: Tenant) => void;
    onEdit: (tenant: Tenant) => void;
    onDelete: (tenant: Tenant) => void;
}

const getStatusColor = (status: 'active' | 'inactive' | 'pending'): string => {
    switch (status) {
        case 'active':
            return 'green';
        case 'inactive':
            return 'gray';
        case 'pending':
            return 'yellow';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: 'active' | 'inactive' | 'pending'): string => {
    switch (status) {
        case 'active':
            return 'กำลังเช่า';
        case 'inactive':
            return 'ไม่ได้เช่า';
        case 'pending':
            return 'รอดำเนินการ';
        default:
            return status;
    }
};

export const TenantCard: React.FC<TenantCardProps> = ({
    tenant,
    onView,
    onEdit,
    onDelete,
}) => {
    const statusColor = getStatusColor(tenant.status);
    const statusLabel = getStatusLabel(tenant.status);
    const vehicleCount = tenant.vehicles?.length || 0;
    const vehiclePlates = tenant.vehicles?.map(v => v.plate).join(', ') || '';

    return (
        <Card.Root>
            <Card.Body>
                <VStack align="stretch" gap={4}>
                    {/* Header */}
                    <HStack justify="space-between" align="start">
                        <VStack align="start" gap={1}>
                            <Heading size="lg">{tenant.full_name}</Heading>
                            <HStack gap={2}>
                                <Icon color="gray.500" fontSize="sm">
                                    <LuPhone />
                                </Icon>
                                <Text color="gray.600" fontSize="sm">
                                    {tenant.phone}
                                </Text>
                            </HStack>
                        </VStack>
                        <HStack gap={2}>
                            {tenant.user_id && (
                                <Badge colorPalette="blue" variant="solid" size="lg">
                                    <Icon mr={1}>
                                        <LuLink />
                                    </Icon>
                                    Linked
                                </Badge>
                            )}
                            <Badge colorPalette={statusColor} size="lg">
                                {statusLabel}
                            </Badge>
                        </HStack>
                    </HStack>

                    {/* Details */}
                    <VStack align="stretch" gap={2}>
                        {tenant.email && (
                            <Text fontSize="sm" color="gray.600">
                                📧 {tenant.email}
                            </Text>
                        )}

                        {tenant.room && (
                            <HStack gap={2}>
                                <Icon color="gray.500" fontSize="sm">
                                    <LuMapPin />
                                </Icon>
                                <Text fontSize="sm" color="gray.600">
                                    ห้อง: {tenant.room.room_number}
                                </Text>
                            </HStack>
                        )}

                        {vehicleCount > 0 && (
                            <HStack gap={2} align="start">
                                <Icon color="gray.500" fontSize="sm" mt={0.5}>
                                    <LuCar />
                                </Icon>
                                <Text fontSize="sm" color="gray.600">
                                    รถ: {vehiclePlates}
                                </Text>
                            </HStack>
                        )}

                        {tenant.move_in_date && (
                            <Text fontSize="sm" color="gray.600">
                                เริ่มเช่า: {new Date(tenant.move_in_date).toLocaleDateString('th-TH')}
                            </Text>
                        )}
                    </VStack>

                    {/* Actions */}
                    <HStack gap={2} pt={2} borderTop="1px" borderColor="gray.200">
                        <Button
                            variant="outline"
                            size="sm"
                            flex={1}
                            onClick={() => onView(tenant)}
                        >
                            <Icon mr={2}>
                                <LuEye />
                            </Icon>
                            ดูรายละเอียด
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(tenant)}
                        >
                            <Icon>
                                <LuPencil />
                            </Icon>
                        </Button>
                        <Button
                            variant="outline"
                            colorPalette="red"
                            size="sm"
                            onClick={() => onDelete(tenant)}
                        >
                            <Icon>
                                <LuTrash2 />
                            </Icon>
                        </Button>
                    </HStack>
                </VStack>
            </Card.Body >
        </Card.Root >
    );
};
