import React, { useMemo, useState } from 'react';
import { Badge, Box, Button, Card, HStack, Icon, IconButton, Table, Text, VStack } from '@chakra-ui/react';
import { LuEye, LuPencil } from 'react-icons/lu';
import { Tooltip } from '../ui/tooltip';
import { RoomEquipmentViewDialog } from '../rooms/RoomEquipmentViewDialog';
import type { Room } from '../../types';
import { isMissingAssetNumber } from '../../lib/assetImport';

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
            <VStack align="stretch" gap={3} display={{ base: 'flex', md: 'none' }}>
                {sortedRooms.map(room => {
                    const numbered = room.equipment?.filter(item => !isMissingAssetNumber(item.asset_number)) || [];
                    return <Card.Root key={room.id}><Card.Body p={4} gap={3}>
                        <HStack justify="space-between"><Text fontWeight="semibold">ห้อง {room.room_number}</Text><Badge colorPalette="brand">ระบุเลข {numbered.length} / {room.equipment?.length || 0}</Badge></HStack>
                        <Text fontSize="xs" color="fg.muted" overflowWrap="anywhere">{numbered.slice(0, 2).map(item => item.asset_number).join(' · ') || 'ยังไม่มีเลขครุภัณฑ์'}</Text>
                        <HStack><Button size="sm" colorPalette="brand" variant="subtle" flex={1} onClick={() => setViewRoom(room)} aria-label={`ดูครุภัณฑ์ห้อง ${room.room_number}`}><LuEye /> ดูครุภัณฑ์และเลขทะเบียน</Button><IconButton size="sm" variant="ghost" aria-label={`แก้ไขครุภัณฑ์ห้อง ${room.room_number}`} onClick={() => onEdit(room)}><LuPencil /></IconButton></HStack>
                    </Card.Body></Card.Root>;
                })}
            </VStack>
            <Box overflowX="auto" display={{ base: 'none', md: 'block' }}>
            <Table.Root size="sm" variant="outline">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeader>ลำดับ</Table.ColumnHeader>
                        <Table.ColumnHeader>เลขที่ห้อง</Table.ColumnHeader>
                        <Table.ColumnHeader>จำนวนครุภัณฑ์ทั้งหมด</Table.ColumnHeader>
                        <Table.ColumnHeader>เลขครุภัณฑ์ที่ระบุแล้ว</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {sortedRooms.map((room, index) => (
                        <Table.Row key={room.id}>
                            <Table.Cell>{index + 1}</Table.Cell>
                            <Table.Cell fontWeight="medium">{room.room_number}</Table.Cell>
                            <Table.Cell>{room.equipment?.length || 0}</Table.Cell>
                            <Table.Cell>
                                <Badge colorPalette="brand">{room.equipment?.filter(item => !isMissingAssetNumber(item.asset_number)).length || 0} / {room.equipment?.length || 0} รายการ</Badge>
                                <Text fontSize="xs" color="fg.muted" mt={1}>{room.equipment?.filter(item => !isMissingAssetNumber(item.asset_number)).slice(0, 2).map(item => item.asset_number).join(' · ') || 'ยังไม่มีเลขครุภัณฑ์'}</Text>
                            </Table.Cell>
                            <Table.Cell textAlign="center">
                                <HStack gap={1} justify="center">
                                    <Tooltip content="ดูรายการ">
                                        <Button
                                            aria-label={`ดูครุภัณฑ์ห้อง ${room.room_number}`}
                                            size="sm"
                                            colorPalette="brand"
                                            variant="subtle"
                                            onClick={() => setViewRoom(room)}
                                        >
                                            <Icon>
                                                <LuEye />
                                            </Icon>
                                            ดูครุภัณฑ์
                                        </Button>
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
