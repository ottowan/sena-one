import React, { useMemo } from 'react';
import { Badge, Box, HStack, Highlight, Icon, IconButton, Table, Text, VStack } from '@chakra-ui/react';
import { LuHash, LuPalette, LuPencil, LuPhone, LuTrash2, LuUser } from 'react-icons/lu';
import { Tooltip } from '../ui/tooltip';
import type { VehicleRegistration } from '../../types';
import { VEHICLE_TYPE_ICONS, VEHICLE_TYPE_LABELS } from './vehicleMeta';

interface VehicleTableProps {
    vehicles: VehicleRegistration[];
    onEdit: (vehicle: VehicleRegistration) => void;
    onDelete: (vehicle: VehicleRegistration) => void;
    searchTerm?: string;
}

const HighlightedText: React.FC<{ text: string; query?: string }> = ({ text, query }) =>
    query ? (
        <Highlight query={[query]} ignoreCase styles={{ bg: 'yellow.200', color: 'black', px: '0.5', borderRadius: 'sm' }}>
            {text}
        </Highlight>
    ) : (
        <>{text}</>
    );

export const VehicleTable: React.FC<VehicleTableProps> = ({ vehicles, onEdit, onDelete, searchTerm }) => {
    const groups = useMemo(() => {
        const map = new Map<string, VehicleRegistration[]>();
        vehicles.forEach((vehicle) => {
            const list = map.get(vehicle.room_id) || [];
            list.push(vehicle);
            map.set(vehicle.room_id, list);
        });
        return [...map.values()].sort((a, b) =>
            (a[0].room?.room_number || '').localeCompare(b[0].room?.room_number || '')
        );
    }, [vehicles]);

    return (
        <Box overflowX="auto">
        <Table.Root size="sm" variant="outline">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>ลำดับ</Table.ColumnHeader>
                    <Table.ColumnHeader>เลขที่ห้อง</Table.ColumnHeader>
                    <Table.ColumnHeader>เจ้าของรถ</Table.ColumnHeader>
                    <Table.ColumnHeader>ประเภทรถ</Table.ColumnHeader>
                    <Table.ColumnHeader>เลขทะเบียนรถ</Table.ColumnHeader>
                    <Table.ColumnHeader>ข้อมูลรถ</Table.ColumnHeader>
                    <Table.ColumnHeader>มีสติ๊กเกอร์</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {groups.map((group, groupIndex) =>
                    group.map((vehicle, i) => {
                        const TypeIcon = VEHICLE_TYPE_ICONS[vehicle.type];
                        const sameTypeCount = group.filter((v) => v.type === vehicle.type).length;
                        return (
                            <Table.Row key={vehicle.id}>
                                {i === 0 && (
                                    <>
                                        <Table.Cell rowSpan={group.length}>{groupIndex + 1}</Table.Cell>
                                        <Table.Cell rowSpan={group.length} fontWeight="medium">
                                            {group[0].room?.room_number || '-'}
                                        </Table.Cell>
                                        <Table.Cell rowSpan={group.length}>
                                            <VStack align="start" gap={0.5}>
                                                <HStack gap={1}>
                                                    <Icon color="fg.muted">
                                                        <LuUser />
                                                    </Icon>
                                                    <Text fontSize="sm">
                                                        {group[0].room?.current_tenant_name || '-'}
                                                    </Text>
                                                </HStack>
                                                <HStack gap={1}>
                                                    <Icon color="fg.muted">
                                                        <LuPhone />
                                                    </Icon>
                                                    <Text fontSize="sm" color="fg.muted">
                                                        {group[0].room?.current_tenant_phone || '-'}
                                                    </Text>
                                                </HStack>
                                            </VStack>
                                        </Table.Cell>
                                    </>
                                )}
                                <Table.Cell>
                                    <HStack gap={1}>
                                        <Text fontSize="sm">
                                            {VEHICLE_TYPE_LABELS[vehicle.type]} ({sameTypeCount})
                                        </Text>
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack gap={1}>
                                        <Text fontSize="sm">
                                            <HighlightedText text={`${vehicle.plate} ${vehicle.province}`} query={searchTerm} />
                                        </Text>
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack gap={1}>
                                        <Icon color="fg.muted">
                                            <LuPalette />
                                        </Icon>
                                        <Text fontSize="sm" color="fg.muted">
                                            {vehicle.brand || '-'}
                                            {vehicle.color ? ` (${vehicle.color})` : ''}
                                        </Text>
                                    </HStack>
                                </Table.Cell>
                                <Table.Cell>
                                    {vehicle.has_sticker ? (
                                        <Badge colorPalette="green">มี</Badge>
                                    ) : (
                                        <Badge colorPalette="gray">ไม่มี</Badge>
                                    )}
                                </Table.Cell>
                                <Table.Cell textAlign="center">
                                    <HStack gap={1} justify="center">
                                        <Tooltip content="แก้ไข">
                                            <IconButton
                                                aria-label="Edit"
                                                size="xs"
                                                variant="ghost"
                                                onClick={() => onEdit(vehicle)}
                                            >
                                                <Icon>
                                                    <LuPencil />
                                                </Icon>
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip content="ลบ">
                                            <IconButton
                                                aria-label="Delete"
                                                size="xs"
                                                variant="ghost"
                                                colorPalette="red"
                                                onClick={() => onDelete(vehicle)}
                                            >
                                                <Icon>
                                                    <LuTrash2 />
                                                </Icon>
                                            </IconButton>
                                        </Tooltip>
                                    </HStack>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })
                )}
            </Table.Body>
        </Table.Root>
        </Box>
    );
};
