import React from 'react';
import { Box, Grid, Heading, Text, HStack, VStack, Badge, Icon, Image } from '@chakra-ui/react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
    DialogActionTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { LuMapPin, LuMaximize, LuDollarSign, LuUser, LuPhone } from 'react-icons/lu';
import type { Room, RoomStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { EquipmentList } from './EquipmentList';

interface RoomDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    room: Room | null;
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

export const RoomDetailsDialog: React.FC<RoomDetailsDialogProps> = ({ open, onClose, room }) => {
    if (!room) return null;

    const statusColor = getStatusColor(room.status);
    const statusLabel = getStatusLabel(room.status);

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogContent maxH="90vh" overflowY="auto">
                <DialogHeader>
                    <DialogTitle>รายละเอียดห้องพัก {room.room_number}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <VStack align="stretch" gap={6}>
                        {/* Header */}
                        <HStack justify="space-between" align="start">
                            <VStack align="start" gap={1}>
                                <Heading size="xl">ห้อง {room.room_number}</Heading>
                                <Text color="fg.muted">{room.room_type}</Text>
                            </VStack>
                            <Badge colorPalette={statusColor} size="lg">
                                {statusLabel}
                            </Badge>
                        </HStack>

                        {/* Images */}
                        {room.images && room.images.length > 0 && (
                            <Grid templateColumns="repeat(3, 1fr)" gap={3}>
                                {room.images.map((src, index) => (
                                    <Box
                                        key={index}
                                        borderRadius="md"
                                        overflow="hidden"
                                        borderWidth="1px"
                                        borderColor="border.default"
                                        h="120px"
                                    >
                                        <Image
                                            src={src}
                                            alt={`ห้อง ${room.room_number} รูปที่ ${index + 1}`}
                                            w="full"
                                            h="full"
                                            objectFit="cover"
                                        />
                                    </Box>
                                ))}
                            </Grid>
                        )}

                        {/* ข้อมูลทั่วไป */}
                        <VStack align="stretch" gap={3}>
                            <Heading size="md">ข้อมูลทั่วไป</Heading>
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <HStack gap={3}>
                                    <Icon color="blue.fg">
                                        <LuMaximize />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            ขนาด
                                        </Text>
                                        <Text fontWeight="medium">{room.size_sqm} ตร.ม.</Text>
                                    </VStack>
                                </HStack>

                                <HStack gap={3}>
                                    <Icon color="blue.fg">
                                        <LuMapPin />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            ชั้น
                                        </Text>
                                        <Text fontWeight="medium">ชั้น {room.floor}</Text>
                                    </VStack>
                                </HStack>
                            </Grid>
                        </VStack>

                        {/* ค่าเช่าและค่าน้ำไฟ */}
                        <VStack align="stretch" gap={3}>
                            <Heading size="md">ค่าเช่าและค่าน้ำไฟ</Heading>
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <HStack gap={3}>
                                    <Icon color="green.fg">
                                        <LuDollarSign />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            ค่าเช่า/เดือน
                                        </Text>
                                        <Text fontWeight="medium">
                                            {room.status === 'occupied'
                                                ? formatCurrency(room.current_rent || room.monthly_rent)
                                                : '-'}
                                        </Text>
                                    </VStack>
                                </HStack>

                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="fg.muted">
                                        อัตราน้ำ/ไฟ (บาท/หน่วย)
                                    </Text>
                                    <Text fontWeight="medium">
                                        {room.water_rate} / {room.electricity_rate}
                                    </Text>
                                </VStack>
                            </Grid>

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="fg.muted">
                                        มิเตอร์น้ำปัจจุบัน
                                    </Text>
                                    <Text fontWeight="medium">{room.current_water_meter ?? '-'}</Text>
                                </VStack>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="fg.muted">
                                        มิเตอร์ไฟปัจจุบัน
                                    </Text>
                                    <Text fontWeight="medium">{room.current_electricity_meter ?? '-'}</Text>
                                </VStack>
                            </Grid>
                        </VStack>

                        {/* ผู้เช่าปัจจุบัน */}
                        {room.current_tenant && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">ผู้เช่าปัจจุบัน</Heading>
                                <HStack gap={3}>
                                    <Icon color="blue.fg">
                                        <LuUser />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontWeight="medium">{room.current_tenant.full_name}</Text>
                                        <HStack gap={1} color="fg.muted" fontSize="sm">
                                            <Icon fontSize="xs">
                                                <LuPhone />
                                            </Icon>
                                            <Text>{room.current_tenant.phone}</Text>
                                        </HStack>
                                    </VStack>
                                </HStack>

                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            วันที่เริ่มสัญญา
                                        </Text>
                                        <Text fontWeight="medium">
                                            {room.current_contract_start_date
                                                ? formatDate(room.current_contract_start_date)
                                                : '-'}
                                        </Text>
                                    </VStack>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="fg.muted">
                                            วันที่สิ้นสุดสัญญา
                                        </Text>
                                        <Text fontWeight="medium">
                                            {room.current_contract_end_date
                                                ? formatDate(room.current_contract_end_date)
                                                : '-'}
                                        </Text>
                                    </VStack>
                                </Grid>
                            </VStack>
                        )}

                        {/* ครุภัณฑ์ประจำห้อง (อ่านอย่างเดียว - จัดการที่หน้าทะเบียนคุมครุภัณฑ์) */}
                        {room.equipment && room.equipment.length > 0 && (
                            <VStack align="stretch" gap={3}>
                                <Heading size="md">ครุภัณฑ์ประจำห้อง ({room.equipment.length} รายการ)</Heading>
                                <EquipmentList equipment={room.equipment} />
                            </VStack>
                        )}

                        {/* รายละเอียดเพิ่มเติม */}
                        {room.description && (
                            <VStack align="stretch" gap={2}>
                                <Heading size="md">รายละเอียดเพิ่มเติม</Heading>
                                <Text color="fg.default">{room.description}</Text>
                            </VStack>
                        )}
                    </VStack>
                </DialogBody>

                <DialogFooter>
                    <DialogActionTrigger asChild>
                        <Button variant="outline" onClick={onClose}>
                            ปิด
                        </Button>
                    </DialogActionTrigger>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
