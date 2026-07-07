import React from 'react';
import { Table, Badge, HStack, IconButton, Icon, Box, Text } from '@chakra-ui/react';
import { LuEye, LuPencil, LuTrash2, LuLink, LuUser } from 'react-icons/lu';
import type { Tenant } from '../../types';
import { Tooltip } from '../ui/tooltip';

interface TenantTableProps {
    tenants: Tenant[];
    onView: (tenant: Tenant) => void;
    onEdit: (tenant: Tenant) => void;
    onDelete: (tenant: Tenant) => void;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'active':
            return 'green';
        case 'inactive':
            return 'gray';
        case 'pending':
            return 'yellow';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'active':
            return 'กำลังเช่า';
        case 'inactive':
            return 'ไม่ได้เช่า';
        case 'pending':
            return 'รอดำเนินการ';
        default:
            return status;
    }
};

export const TenantTable: React.FC<TenantTableProps> = ({ tenants, onView, onEdit, onDelete }) => {
    return (
        <Box overflowX="auto">
        <Table.Root size="sm" variant="outline">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                    <Table.ColumnHeader>ชื่อ-นามสกุล</Table.ColumnHeader>
                    <Table.ColumnHeader>เบอร์โทร</Table.ColumnHeader>
                    <Table.ColumnHeader>อีเมล</Table.ColumnHeader>
                    <Table.ColumnHeader>บัญชี</Table.ColumnHeader>
                    <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                    <Table.ColumnHeader>วันที่เข้าพัก</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {tenants.map((tenant) => (
                    <Table.Row key={tenant.id}>
                        <Table.Cell fontWeight="medium">
                            {tenant.room ? tenant.room.room_number : '-'}
                        </Table.Cell>
                        <Table.Cell>{tenant.full_name}</Table.Cell>
                        <Table.Cell>{tenant.phone}</Table.Cell>
                        <Table.Cell>{tenant.email || '-'}</Table.Cell>
                        <Table.Cell>
                            {tenant.user_id ? (
                                <Badge colorPalette="blue" variant="subtle">
                                    <Icon mr={1}>
                                        <LuLink />
                                    </Icon>
                                    Linked
                                </Badge>
                            ) : (
                                <Text fontSize="xs" color="gray.400">-</Text>
                            )}
                        </Table.Cell>
                        <Table.Cell>
                            <Badge colorPalette={getStatusColor(tenant.status)}>
                                {getStatusLabel(tenant.status)}
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            {tenant.move_in_date
                                ? new Date(tenant.move_in_date).toLocaleDateString('th-TH')
                                : '-'}
                        </Table.Cell>
                        <Table.Cell>
                            <HStack gap={1} justify="center">
                                <Tooltip content="ดูรายละเอียด">
                                    <IconButton
                                        aria-label="View"
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => onView(tenant)}
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
                                        onClick={() => onEdit(tenant)}
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
                                        onClick={() => onDelete(tenant)}
                                    >
                                        <Icon>
                                            <LuTrash2 />
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
    );
};
