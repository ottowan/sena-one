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
import { LuMapPin, LuDollarSign, LuMaximize, LuPencil, LuTrash2, LuImage, LuRotateCcw, LuHistory, LuLock, LuEye, LuBoxes } from 'react-icons/lu';
import type { Room, RoomStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/button';
import { Tooltip } from '../ui/tooltip';
import { MeterHistoryDialog } from './MeterHistoryDialog';
import { RoomEquipmentViewDialog } from './RoomEquipmentViewDialog';

import type { RentRate } from '../../types';

interface RoomCardProps {
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

export const RoomCard: React.FC<RoomCardProps> = ({ room, rentRates, onView, onEdit, onDelete, onRelease }) => {
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
            <Card.Root>
                <Card.Body p={0}>
                    <VStack align="stretch" gap={0}>
                        {/* Image */}
                        {room.images && room.images.length > 0 ? (
                            <Box
                                borderTopRadius="md"
                                overflow="hidden"
                                h="180px"
                                bg="bg.muted"
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
                                bg="bg.muted"
                                display="flex"
                                alignItems="center"
                                justifyContent="center"
                            >
                                <Icon fontSize="4xl" color="fg.subtle">
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
                                    <Text color="fg.muted" fontSize="sm">
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
                                        <Icon color="fg.muted">
                                            <LuDollarSign />
                                        </Icon>
                                        <VStack align="start" gap={0}>
                                            <Text fontSize="sm" color="fg.muted">
                                                ค่าเช่า/เดือน
                                            </Text>
                                            <Text fontWeight="bold" color="brand.fg">
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
                                        <Icon color="fg.muted">
                                            <LuDollarSign />
                                        </Icon>
                                        <VStack align="start" gap={0}>
                                            <Text fontSize="sm" color="fg.muted">
                                                ค่าเช่า/เดือน
                                            </Text>
                                            <Text fontWeight="medium" color="fg.subtle">
                                                -
                                            </Text>
                                        </VStack>
                                    </HStack>
                                )}

                                <HStack gap={2}>
                                    <Icon color="fg.muted">
                                        <LuMaximize />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            ขนาด
                                        </Text>
                                        <Text fontWeight="medium">{room.size_sqm} ตร.ม.</Text>
                                    </VStack>
                                </HStack>

                                <HStack gap={2}>
                                    <Icon color="fg.muted">
                                        <LuMapPin />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            ชั้น
                                        </Text>
                                        <Text fontWeight="medium">ชั้น {room.floor}</Text>
                                    </VStack>
                                </HStack>

                                <HStack gap={2}>
                                    <Icon color="fg.muted">
                                        <LuDollarSign />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
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
                                <Text color="fg.muted" fontSize="sm">
                                    {room.description}
                                </Text>
                            )}

                            {/* Actions */}
                            <HStack gap={2} pt={2} borderTop="1px" borderColor="border.default">
                                {onView && (
                                    <Tooltip content="ดูรายละเอียด">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onView(room)}
                                        >
                                            <Icon>
                                                <LuEye />
                                            </Icon>
                                        </Button>
                                    </Tooltip>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    flex={1}
                                    disabled={isLocked}
                                    onClick={() => onEdit(room)}
                                >
                                    <Icon mr={2}>
                                        {isLocked ? <LuLock /> : <LuPencil />}
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
                                <Tooltip content="ครุภัณฑ์ประจำห้อง">
                                    <Button
                                        variant="outline"
                                        colorPalette="purple"
                                        size="sm"
                                        onClick={() => setEquipmentOpen(true)}
                                    >
                                        <Icon>
                                            <LuBoxes />
                                        </Icon>
                                    </Button>
                                </Tooltip>
                                <Button
                                    variant="outline"
                                    colorPalette="red"
                                    size="sm"
                                    disabled={isLocked}
                                    onClick={handleDelete}
                                >
                                    <Icon>
                                        {isLocked ? <LuLock /> : <LuTrash2 />}
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

            <RoomEquipmentViewDialog
                open={equipmentOpen}
                onClose={() => setEquipmentOpen(false)}
                room={room}
            />
        </>
    );
};
