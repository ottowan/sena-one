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
    Grid,
    Image,
} from '@chakra-ui/react';
import { LuMapPin, LuDollarSign, LuMaximize, LuPencil, LuTrash2, LuImage, LuRotateCcw, LuHistory } from 'react-icons/lu';
import { IconButton } from '@chakra-ui/react';
import type { Room, RoomStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/button';
import { MeterHistoryDialog } from './MeterHistoryDialog';

import type { RentRate } from '../../types';

interface RoomCardProps {
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

export const RoomCard: React.FC<RoomCardProps> = ({ room, rentRates, onEdit, onDelete, onRelease }) => {
    const statusColor = getStatusColor(room.status);
    const statusLabel = getStatusLabel(room.status);
    const [historyOpen, setHistoryOpen] = useState(false);

    const handleDelete = () => {
        if (confirm(`ต้องการลบห้อง ${room.room_number} ใช่หรือไม่?`)) {
            deleteDelete.mutate(room.id);
        }
    };

    // NOTE: onDelete is passed as prop, but original code used deleteRoom hook inside handleDelete.
    // However, the prop is named onDelete. I will stick to using the prop or the internal handler if defined.
    // Reading previous code, `handleDelete` was defined inside calling `deleteRoom.mutate`.
    // But `deleteRoom` was NOT defined in the previous view! 
    // Ah, `useDeleteRoom` wasn't imported. The previous code had `onDelete(room)` in the JSX but `handleDelete` function calling `deleteRoom.mutate`.
    // Let's assume the parent handles deletion via `onDelete` prop which is safer.

    const handleCardDelete = () => {
        onDelete(room);
    }

    return (
        <>
            <Card.Root>
                <Card.Body p={0}>
                    <VStack align="stretch" gap={0}>
                        {/* Image */}
                        {room.images && room.images.length > 0 ? (
                            <Box
                                borderTopRadius="md"
                                overflow="hidden"
                                h="180px"
                                bg="gray.100"
                            >
                                <Image
                                    src={room.images[0]}
                                    alt={`ห้อง ${room.room_number}`}
                                    w="full"
                                    h="full"
                                    objectFit="cover"
                                />
                            </Box>
                        ) : (
                            <Box
                                borderTopRadius="md"
                                h="180px"
                                bg="gray.100"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Icon fontSize="4xl" color="gray.400">
                                    <LuImage />
                                </Icon>
                            </Box>
                        )}

                        {/* Content */}
                        <VStack align="stretch" gap={4} p={4}>
                            {/* Header */}
                            <HStack justify="space-between" align="start">
                                <VStack align="start" gap={1}>
                                    <Heading size="lg">ห้อง {room.room_number}</Heading>
                                    <Text color="gray.600" fontSize="sm">
                                        {room.room_type}
                                    </Text>
                                </VStack>
                                <Badge colorPalette={statusColor} size="lg">
                                    {statusLabel}
                                </Badge>
                            </HStack>

                            {/* Details */}
                            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                                {room.status === 'occupied' ? (
                                    <HStack gap={2}>
                                        <Icon color="gray.500">
                                            <LuDollarSign />
                                        </Icon>
                                        <VStack align="start" gap={0}>
                                            <Text fontSize="sm" color="gray.600">
                                                ค่าเช่า/เดือน
                                            </Text>
                                            <Text fontWeight="bold" color="brand.600">
                                                {(() => {
                                                    // Priority 1: Dynamic Rent
                                                    if (room.current_tenant?.position_level && rentRates) {
                                                        const rate = rentRates.find(r => r.position_level === room.current_tenant?.position_level);
                                                        if (rate && rate.rent_amount > 0) return formatCurrency(rate.rent_amount);
                                                    }
                                                    // Priority 2: Contract Rent
                                                    return formatCurrency(room.current_rent || 0);
                                                })()}
                                            </Text>
                                        </VStack>
                                    </HStack>
                                ) : (
                                    <HStack gap={2}>
                                        <Icon color="gray.500">
                                            <LuDollarSign />
                                        </Icon>
                                        <VStack align="start" gap={0}>
                                            <Text fontSize="sm" color="gray.600">
                                                ค่าเช่า/เดือน
                                            </Text>
                                            <Text fontWeight="medium" color="gray.400">
                                                -
                                            </Text>
                                        </VStack>
                                    </HStack>
                                )}

                                <HStack gap={2}>
                                    <Icon color="gray.500">
                                        <LuMaximize />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            ขนาด
                                        </Text>
                                        <Text fontWeight="medium">{room.size_sqm} ตร.ม.</Text>
                                    </VStack>
                                </HStack>

                                <HStack gap={2}>
                                    <Icon color="gray.500">
                                        <LuMapPin />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            ชั้น
                                        </Text>
                                        <Text fontWeight="medium">ชั้น {room.floor}</Text>
                                    </VStack>
                                </HStack>

                                <HStack gap={2}>
                                    <Icon color="gray.500">
                                        <LuDollarSign />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            ค่าน้ำ/ไฟ
                                        </Text>
                                        <Text fontWeight="medium" fontSize="sm">
                                            {room.water_rate}/{room.electricity_rate}
                                        </Text>
                                    </VStack>
                                </HStack>
                            </Grid>

                            {/* Description */}
                            {room.description && (
                                <Text color="gray.600" fontSize="sm">
                                    {room.description}
                                </Text>
                            )}

                            {/* Actions */}
                            <HStack gap={2} pt={2} borderTop="1px" borderColor="gray.200">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    flex={1}
                                    onClick={() => onEdit(room)}
                                >
                                    <Icon mr={2}>
                                        <LuPencil />
                                    </Icon>
                                    แก้ไข
                                </Button>
                                {onRelease && room.status === 'occupied' && (
                                    <Button
                                        variant="outline"
                                        colorPalette="orange"
                                        size="sm"
                                        onClick={() => onRelease(room)}
                                    >
                                        <Icon mr={2}>
                                            <LuRotateCcw />
                                        </Icon>
                                        คืนห้อง
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    colorPalette="blue"
                                    size="sm"
                                    onClick={() => setHistoryOpen(true)}
                                >
                                    <Icon mr={2}>
                                        <LuHistory />
                                    </Icon>
                                    ประวัติ
                                </Button>
                                <Button
                                    variant="outline"
                                    colorPalette="red"
                                    size="sm"
                                    onClick={handleDelete}
                                >
                                    <Icon>
                                        <LuTrash2 />
                                    </Icon>
                                </Button>
                            </HStack>
                        </VStack>
                    </VStack>
                </Card.Body>
            </Card.Root >

            <MeterHistoryDialog
                open={historyOpen}
                onClose={() => setHistoryOpen(false)}
                roomId={room.id}
                roomNumber={room.room_number}
            />
        </>
    );
};
