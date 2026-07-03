import React, { useMemo, useState } from 'react';
import { Box, HStack, Icon, IconButton, Table } from '@chakra-ui/react';
import { LuEye, LuPencil } from 'react-icons/lu';
import { Tooltip } from '../ui/tooltip';
import { RoomEquipmentViewDialog } from '../rooms/RoomEquipmentViewDialog';
import type { Room } from '../../types';

interface EquipmentTableProps {
    rooms: Room[];
    onEdit: (room: Room) => void;
}

export const EquipmentTable: React.FC<EquipmentTableProps> = ({ rooms, onEdit }) => {
    const [viewRoom, setViewRoom] = useState<Room | null>(null);

    const sortedRooms = useMemo(
        () => [...rooms].sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })),
        [rooms]
    );

    return (
        <>
            <Box overflowX="auto">
            <Table.Root size="sm" variant="outline">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ลำดับ</Table.ColumnHeader>
                        <Table.ColumnHeader>เลขที่ห้อง</Table.ColumnHeader>
                        <Table.ColumnHeader>จำนวนครุภัณฑ์ทั้งหมด</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {sortedRooms.map((room, index) => (
                        <Table.Row key={room.id}>
                            <Table.Cell>{index + 1}</Table.Cell>
                            <Table.Cell fontWeight="medium">{room.room_number}</Table.Cell>
                            <Table.Cell>{room.equipment?.length || 0}</Table.Cell>
                            <Table.Cell textAlign="center">
                                <HStack gap={1} justify="center">
                                    <Tooltip content="ดูรายการ">
                                        <IconButton
                                            aria-label="View list"
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => setViewRoom(room)}
                                        >
                                            <Icon>
                                                <LuEye />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip content="แก้ไข">
                                        <IconButton
                                            aria-label="Edit"
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => onEdit(room)}
                                        >
                                            <Icon>
                                                <LuPencil />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                </HStack>
                            </Table.Cell>
                        </Table.Row>
                    ))}
                </Table.Body>
            </Table.Root>
            </Box>

            <RoomEquipmentViewDialog open={!!viewRoom} onClose={() => setViewRoom(null)} room={viewRoom} />
        </>
    );
};
