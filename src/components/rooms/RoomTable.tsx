import React from 'react';
import { Table, Badge, HStack, IconButton, Icon } from '@chakra-ui/react';
import { LuEye, LuLock, LuPencil, LuTrash2 } from 'react-icons/lu';
import type { Room } from '../../types';
import { Tooltip } from '../ui/tooltip';
import type { RentRate } from '../../types';

interface RoomTableProps {
    rooms: Room[];
    rentRates?: RentRate[];
    onView: (room: Room) => void;
    onEdit: (room: Room) => void;
    onDelete: (room: Room) => void;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'available':
            return 'green';
        case 'occupied':
            return 'blue';
        case 'reserved':
            return 'yellow';
        case 'maintenance':
            return 'red';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'available':
            return 'ว่าง';
        case 'occupied':
            return 'มีผู้เช่า';
        case 'reserved':
            return 'จอง';
        case 'maintenance':
            return 'ซ่อมแซม';
        default:
            return status;
    }
};

export const RoomTable: React.FC<RoomTableProps> = ({ rooms, rentRates, onView, onEdit, onDelete }) => {
    return (
        <Table.Root size="sm" variant="outline">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>เลขห้อง</Table.ColumnHeader>
                    <Table.ColumnHeader>ประเภท</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">ชั้น</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">ขนาด (ตร.ม.)</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">ค่าเช่า/เดือน</Table.ColumnHeader>
                    <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                    <Table.ColumnHeader>ผู้เช่า</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {rooms.map((room) => {
                    const isLocked = !!room.has_active_contract;

                    return (
                    <Table.Row key={room.id}>
                        <Table.Cell fontWeight="medium">{room.room_number}</Table.Cell>
                        <Table.Cell>{room.room_type}</Table.Cell>
                        <Table.Cell textAlign="center">{room.floor}</Table.Cell>
                        <Table.Cell textAlign="right">{room.size_sqm.toLocaleString()}</Table.Cell>
                        <Table.Cell textAlign="right">
                            {(() => {
                                if (room.status !== 'occupied') return '-';

                                // Priority 1: Dynamic Rent from Position Setting
                                if (room.current_tenant?.position_level && rentRates) {
                                    const rate = rentRates.find(r => r.position_level === room.current_tenant?.position_level);
                                    if (rate && rate.rent_amount > 0) return `฿${rate.rent_amount.toLocaleString()}`;
                                }

                                // Priority 2: Contract Rent (Snapshot)
                                if (room.current_rent) return `฿${room.current_rent.toLocaleString()}`;

                                return '-';
                            })()}
                        </Table.Cell>
                        <Table.Cell>
                            <Badge colorPalette={getStatusColor(room.status)}>
                                {getStatusLabel(room.status)}
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            {room.current_tenant ? (
                                <div>
                                    <div>{room.current_tenant.full_name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'gray' }}>
                                        {room.current_tenant.phone}
                                    </div>
                                </div>
                            ) : (
                                '-'
                            )}
                        </Table.Cell>
                        <Table.Cell>
                            <HStack gap={1} justify="center">
                                <Tooltip content="ดูรายละเอียด">
                                    <IconButton
                                        aria-label="View"
                                        size="xs"
                                        variant="ghost"
                                        disabled={isLocked}
                                        onClick={() => onView(room)}
                                    >
                                        <Icon>
                                            {isLocked ? <LuLock /> : <LuEye />}
                                        </Icon>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip content="แก้ไข">
                                    <IconButton
                                        aria-label="Edit"
                                        size="xs"
                                        variant="ghost"
                                        disabled={isLocked}
                                        onClick={() => onEdit(room)}
                                    >
                                        <Icon>
                                            {isLocked ? <LuLock /> : <LuPencil />}
                                        </Icon>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip content="ลบ">
                                    <IconButton
                                        aria-label="Delete"
                                        size="xs"
                                        variant="ghost"
                                        colorPalette="red"
                                        disabled={isLocked}
                                        onClick={() => onDelete(room)}
                                    >
                                        <Icon>
                                            {isLocked ? <LuLock /> : <LuTrash2 />}
                                        </Icon>
                                    </IconButton>
                                </Tooltip>
                            </HStack>
                        </Table.Cell>
                    </Table.Row>
                    );
                })}
            </Table.Body>
        </Table.Root>
    );
};
