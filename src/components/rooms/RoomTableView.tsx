import React from 'react';
import {
    Table,
    Badge,
    Icon,
    HStack,
} from '@chakra-ui/react';
import { LuPencil, LuTrash2 } from 'react-icons/lu';
import type { Room, RoomStatus } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../ui/button';

interface RoomTableViewProps {
    rooms: Room[];
    onEdit: (room: Room) => void;
    onDelete: (room: Room) => void;
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

export const RoomTableView: React.FC<RoomTableViewProps> = ({
    rooms,
    onEdit,
    onDelete,
}) => {
    return (
        <Table.Root size="sm" variant="outline">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>เลขห้อง</Table.ColumnHeader>
                    <Table.ColumnHeader>ประเภท</Table.ColumnHeader>
                    <Table.ColumnHeader>ชั้น</Table.ColumnHeader>
                    <Table.ColumnHeader>ขนาด</Table.ColumnHeader>
                    <Table.ColumnHeader>ค่าเช่า/เดือน</Table.ColumnHeader>
                    <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                    <Table.ColumnHeader>วันที่เริ่มพัก</Table.ColumnHeader>
                    <Table.ColumnHeader>วันที่สิ้นสุด</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {rooms.map((room) => (
                    <Table.Row key={room.id}>
                        <Table.Cell fontWeight="bold">{room.room_number}</Table.Cell>
                        <Table.Cell>{room.room_type}</Table.Cell>
                        <Table.Cell>ชั้น {room.floor}</Table.Cell>
                        <Table.Cell>{room.size_sqm} ตร.ม.</Table.Cell>
                        <Table.Cell fontWeight="medium" color="brand.fg">
                            {formatCurrency(room.monthly_rent)}
                        </Table.Cell>
                        <Table.Cell>
                            <Badge colorPalette={getStatusColor(room.status)} size="sm">
                                {getStatusLabel(room.status)}
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            {room.status === 'occupied' && room.current_tenant_id
                                ? '01/01/2024'
                                : '-'}
                        </Table.Cell>
                        <Table.Cell>
                            {room.status === 'occupied' && room.current_tenant_id
                                ? '31/12/2024'
                                : '-'}
                        </Table.Cell>
                        <Table.Cell>
                            <HStack gap={1} justify="center">
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => onEdit(room)}
                                >
                                    <Icon fontSize="sm">
                                        <LuPencil />
                                    </Icon>
                                </Button>
                                <Button
                                    variant="ghost"
                                    colorPalette="red"
                                    size="xs"
                                    onClick={() => onDelete(room)}
                                >
                                    <Icon fontSize="sm">
                                        <LuTrash2 />
                                    </Icon>
                                </Button>
                            </HStack>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
};
