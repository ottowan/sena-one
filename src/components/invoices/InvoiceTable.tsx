import React from 'react';
import { Table, Badge, HStack, IconButton, Icon } from '@chakra-ui/react';
import { LuEye, LuTrash2, LuDownload } from 'react-icons/lu';
import type { Invoice } from '../../types';
import { Tooltip } from '../ui/tooltip';
import { Checkbox } from '../ui/checkbox';

interface InvoiceTableProps {
    invoices: Invoice[];
    onView: (invoice: Invoice) => void;
    onDelete?: (invoice: Invoice) => void;
    onExportRoom?: (roomNumber: string) => void;
    selectedInvoices?: string[];
    selectedInvoiceSet?: Set<string>;
    onSelectInvoice?: (id: string) => void;
    onSelectAll?: () => void;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'paid':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'overdue':
            return 'red';
        case 'cancelled':
            return 'gray';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'paid':
            return 'ชำระแล้ว';
        case 'pending':
            return 'รอชำระ';
        case 'overdue':
            return 'เกินกำหนด';
        case 'cancelled':
            return 'ยกเลิก';
        default:
            return status;
    }
};

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
    invoices,
    onView,
    onDelete,
    onExportRoom,
    selectedInvoices = [],
    selectedInvoiceSet,
    onSelectInvoice,
    onSelectAll,
}) => {
    const selectedSet = selectedInvoiceSet || new Set(selectedInvoices);

    return (
        <Table.Root size="sm" variant="outline">
            <Table.Header>
                <Table.Row>
                    {onSelectAll && (
                        <Table.ColumnHeader width="50px">
                            <Checkbox
                                checked={selectedInvoices.length === invoices.length && invoices.length > 0}
                                onCheckedChange={onSelectAll}
                            />
                        </Table.ColumnHeader>
                    )}
                    <Table.ColumnHeader>เดือน/ปี</Table.ColumnHeader>
                    <Table.ColumnHeader>ผู้เช่า</Table.ColumnHeader>
                    <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">ค่าเช่า</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">ยอดรวม</Table.ColumnHeader>
                    <Table.ColumnHeader>กำหนดชำระ</Table.ColumnHeader>
                    <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {invoices.map((invoice) => (
                    <Table.Row key={invoice.id}>
                        {onSelectInvoice && (
                            <Table.Cell>
                                <Checkbox
                                    checked={selectedSet.has(invoice.id)}
                                    onCheckedChange={() => onSelectInvoice(invoice.id)}
                                />
                            </Table.Cell>
                        )}
                        <Table.Cell fontWeight="medium">
                            {new Date(invoice.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                        </Table.Cell>
                        <Table.Cell>{invoice.tenant?.full_name || '-'}</Table.Cell>
                        <Table.Cell>{invoice.room?.room_number || '-'}</Table.Cell>
                        <Table.Cell textAlign="right">
                            ฿{invoice.rent_amount.toLocaleString()}
                        </Table.Cell>
                        <Table.Cell textAlign="right" fontWeight="bold">
                            ฿{invoice.total_amount.toLocaleString()}
                        </Table.Cell>
                        <Table.Cell>
                            {new Date(invoice.due_date).toLocaleDateString('th-TH')}
                        </Table.Cell>
                        <Table.Cell>
                            <Badge colorPalette={getStatusColor(invoice.status)}>
                                {getStatusLabel(invoice.status)}
                            </Badge>
                        </Table.Cell>
                        <Table.Cell>
                            <HStack gap={1} justify="center">
                                <Tooltip content="ดูรายละเอียด">
                                    <IconButton
                                        aria-label="View"
                                        size="xs"
                                        variant="ghost"
                                        onClick={() => onView(invoice)}
                                    >
                                        <Icon>
                                            <LuEye />
                                        </Icon>
                                    </IconButton>
                                </Tooltip>
                                {onExportRoom && invoice.room?.room_number && (
                                    <Tooltip content={`Export ประวัติห้อง ${invoice.room.room_number}`}>
                                        <IconButton
                                            aria-label="Export Room"
                                            size="xs"
                                            variant="ghost"
                                            colorPalette="green"
                                            onClick={() => onExportRoom(invoice.room!.room_number)}
                                        >
                                            <Icon>
                                                <LuDownload />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {onDelete && invoice.status !== 'paid' && (
                                    <Tooltip content="ลบ">
                                        <IconButton
                                            aria-label="Delete"
                                            size="xs"
                                            variant="ghost"
                                            colorPalette="red"
                                            onClick={() => onDelete(invoice)}
                                        >
                                            <Icon>
                                                <LuTrash2 />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </HStack>
                        </Table.Cell>
                    </Table.Row>
                ))}
            </Table.Body>
        </Table.Root>
    );
};
