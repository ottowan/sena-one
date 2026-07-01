import React, { useState } from 'react';
import {
    Box,
    Card,
    Heading,
    Text,
    HStack,
    VStack,
    Badge,
    Icon,
} from '@chakra-ui/react';
import { LuPencil, LuTrash2, LuCalendar, LuRotateCcw, LuHistory, LuLock } from 'react-icons/lu';
import type { Room, RoomStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/button';
import { MeterHistoryDialog } from './MeterHistoryDialog';

import type { RentRate } from '../../types';

interface RoomCompactCardProps {
    room: Room;
    rentRates?: RentRate[];
    onEdit: (room: Room) => void;
    onDelete: (room: Room) => void;
    onRelease?: (room: Room) => void;
}

const getStatusColor = (status: RoomStatus): string => {
    switch (status) {
        case 'available':
            return 'green';
        case 'reserved':
            return 'yellow';
        case 'occupied':
            return 'blue';
        case 'maintenance':
            return 'red';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: RoomStatus): string => {
    switch (status) {
        case 'available':
            return 'ว่าง';
        case 'reserved':
            return 'จอง';
        case 'occupied':
            return 'มีผู้เข้าพัก';
        case 'maintenance':
            return 'ซ่อมบำรุง';
        default:
            return status;
    }
};

export const RoomCompactCard: React.FC<RoomCompactCardProps> = ({
    room,
    rentRates,
    onEdit,
    onDelete,
    onRelease,
}) => {
    const statusColor = getStatusColor(room.status);
    const statusLabel = getStatusLabel(room.status);
    const [historyOpen, setHistoryOpen] = useState(false);
    const isLocked = !!room.has_active_contract;

    const handleDelete = () => {
        if (isLocked) return;

        if (confirm(`ต้องการลบห้อง ${room.room_number} ใช่หรือไม่?`)) {
            onDelete(room);
        }
    };

    return (
        <>
            <Card.Root size="sm">
                <Card.Body p={3}>
                    <VStack align="stretch" gap={2}>
                        {/* Header */}
                        <HStack justify="space-between">
                            <VStack align="start" gap={0}>
                                <Heading size="sm">ห้อง {room.room_number}</Heading>
                                <Text color="gray.600" fontSize="xs">
                                    {room.room_type}
                                </Text>
                            </VStack>
                            <Badge colorPalette={statusColor} size="sm">
                                {statusLabel}
                            </Badge>
                        </HStack>

                        {/* Price - Only show if occupied */}
                        {room.status === 'occupied' ? (
                            <Text fontWeight="bold" color="brand.600" fontSize="sm">
                                {(() => {
                                    // Priority 1: Dynamic Rent
                                    if (room.current_tenant?.position_level && rentRates) {
                                        const rate = rentRates.find(r => r.position_level === room.current_tenant?.position_level);
                                        if (rate && rate.rent_amount > 0) return formatCurrency(rate.rent_amount);
                                    }
                                    // Priority 2: Contract Rent
                                    return formatCurrency(room.current_rent || 0);
                                })()}/เดือน
                            </Text>
                        ) : (
                            <Text color="gray.400" fontSize="sm">
                                -
                            </Text>
                        )}

                        {/* Dates - Only show if occupied */}
                        {room.status === 'occupied' && room.current_tenant && (
                            <VStack align="stretch" gap={1} fontSize="xs" color="gray.600">
                                <HStack gap={1}>
                                    <Icon fontSize="xs">
                                        <LuCalendar />
                                    </Icon>
                                    <Text>เริ่ม: 01/01/2024</Text>
                                </HStack>
                                <HStack gap={1}>
                                    <Icon fontSize="xs">
                                        <LuCalendar />
                                    </Icon>
                                    <Text>สิ้นสุด: 31/12/2024</Text>
                                </HStack>
                            </VStack>
                        )}

                        {/* Actions */}
                        <HStack gap={1} pt={1} borderTop="1px" borderColor="gray.200">
                            <Button
                                variant="ghost"
                                size="xs"
                                flex={1}
                                disabled={isLocked}
                                onClick={() => onEdit(room)}
                            >
                                <Icon fontSize="xs" mr={1}>
                                    {isLocked ? <LuLock /> : <LuPencil />}
                                </Icon>
                                แก้ไข
                            </Button>
                            {onRelease && room.status === 'occupied' && (
                                <Button
                                    variant="ghost"
                                    colorPalette="orange"
                                    size="xs"
                                    disabled={isLocked}
                                    onClick={() => onRelease(room)}
                                    title="บังคับคืนห้อง (Reset)"
                                >
                                    <Icon fontSize="xs">
                                        {isLocked ? <LuLock /> : <LuRotateCcw />}
                                    </Icon>
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                colorPalette="blue"
                                size="xs"
                                onClick={() => setHistoryOpen(true)}
                                title="ประวัติมิเตอร์"
                            >
                                <Icon fontSize="xs">
                                    <LuHistory />
                                </Icon>
                            </Button>
                            <Button
                                variant="ghost"
                                colorPalette="red"
                                size="xs"
                                disabled={isLocked}
                                onClick={handleDelete}
                            >
                                <Icon fontSize="xs">
                                    {isLocked ? <LuLock /> : <LuTrash2 />}
                                </Icon>
                            </Button>
                        </HStack>
                    </VStack>
                </Card.Body>
            </Card.Root>

            <MeterHistoryDialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                roomId={room.id}
                roomNumber={room.room_number}
            />
        </>
    );
};
