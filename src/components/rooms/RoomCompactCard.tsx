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
import { LuPencil, LuTrash2, LuCalendar, LuRotateCcw, LuHistory, LuLock, LuEye, LuBoxes } from 'react-icons/lu';
import type { Room, RoomStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { MeterHistoryDialog } from './MeterHistoryDialog';
import { RoomEquipmentViewDialog } from './RoomEquipmentViewDialog';

import type { RentRate } from '../../types';

interface RoomCompactCardProps {
    room: Room;
    rentRates?: RentRate[];
    onView?: (room: Room) => void;
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
    onView,
    onEdit,
    onDelete,
    onRelease,
}) => {
    const statusColor = getStatusColor(room.status);
    const statusLabel = getStatusLabel(room.status);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
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
                                <Text color="fg.muted" fontSize="xs">
                                    {room.room_type}
                                </Text>
                            </VStack>
                            <Badge colorPalette={statusColor} size="sm">
                                {statusLabel}
                            </Badge>
                        </HStack>

                        {/* Price - Only show if occupied */}
                        {room.status === 'occupied' ? (
                            <Text fontWeight="bold" color="brand.fg" fontSize="sm">
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
                            <Text color="fg.subtle" fontSize="sm">
                                -
                            </Text>
                        )}

                        {/* Dates - Only show if occupied */}
                        {room.status === 'occupied' && room.current_tenant && (
                            <VStack align="stretch" gap={1} fontSize="xs" color="fg.muted">
                                <HStack gap={1}>
                                    <Icon fontSize="xs">
                                        <LuCalendar />
                                    </Icon>
                                    <Text>
                                        เริ่ม: {room.current_contract_start_date ? formatDate(room.current_contract_start_date) : '-'}
                                    </Text>
                                </HStack>
                                <HStack gap={1}>
                                    <Icon fontSize="xs">
                                        <LuCalendar />
                                    </Icon>
                                    <Text>
                                        สิ้นสุด: {room.current_contract_end_date ? formatDate(room.current_contract_end_date) : '-'}
                                    </Text>
                                </HStack>
                            </VStack>
                        )}

                        {/* Actions */}
                        <HStack gap={1} pt={1} borderTop="1px" borderColor="border.default">
                            {onView && (
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => onView(room)}
                                    title="ดูรายละเอียด"
                                >
                                    <Icon fontSize="xs">
                                        <LuEye />
                                    </Icon>
                                </Button>
                            )}
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
                                    onClick={() => onRelease(room)}
                                    title="บังคับคืนห้อง (Reset)"
                                >
                                    <Icon fontSize="xs">
                                        <LuRotateCcw />
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
                                colorPalette="purple"
                                size="xs"
                                onClick={() => setEquipmentOpen(true)}
                                title="ครุภัณฑ์ประจำห้อง"
                            >
                                <Icon fontSize="xs">
                                    <LuBoxes />
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

            <RoomEquipmentViewDialog
                open={equipmentOpen}
                onClose={() => setEquipmentOpen(false)}
                room={room}
            />
        </>
    );
};
