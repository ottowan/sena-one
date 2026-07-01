import React from 'react';
import { Table, Badge, HStack, IconButton, Icon, VStack } from '@chakra-ui/react';
import {
    LuArrowDown,
    LuArrowRightLeft,
    LuArrowUp,
    LuArrowUpDown,
    LuEye,
    LuPencil,
    LuRefreshCw,
    LuX,
} from 'react-icons/lu';
import type { Contract, RentRate } from '../../types';
import { Tooltip } from '../ui/tooltip';
import { Button } from '../ui/button';
import { formatThaiShortDate } from '../../lib/utils';

type ContractSortKey = 'room_number' | 'start_date' | 'end_date';
type SortDirection = 'asc' | 'desc';

interface ContractTableProps {
    contracts: Contract[];
    rentRates?: RentRate[];
    sortKey: ContractSortKey;
    sortDirection: SortDirection;
    onSortChange: (key: ContractSortKey) => void;
    onView: (contract: Contract) => void;
    onEdit: (contract: Contract) => void;
    onRenew: (contract: Contract) => void;
    onTransfer: (contract: Contract) => void;
    onCancel: (contract: Contract) => void;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'active':
            return 'green';
        case 'expired':
            return 'gray';
        case 'terminated':
            return 'red';
        case 'renewed':
            return 'blue';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'active':
            return 'กำลังใช้งาน';
        case 'expired':
            return 'หมดอายุ';
        case 'terminated':
            return 'ยกเลิก';
        case 'renewed':
            return 'ต่ออายุแล้ว';
        default:
            return status;
    }
};

const addMonths = (date: Date, months: number): Date => {
    const result = new Date(date);
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + months);
    const lastDayOfMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
    result.setDate(Math.min(day, lastDayOfMonth));
    return result;
};

const formatRemainingDuration = (endDate: string): string => {
    const end = new Date(endDate);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (end.getTime() < today.getTime()) return 'หมดอายุแล้ว';
    if (end.getTime() === today.getTime()) return 'ครบกำหนดวันนี้';

    let cursor = new Date(today);
    let years = 0;
    let months = 0;

    while (addMonths(cursor, 12).getTime() <= end.getTime()) {
        cursor = addMonths(cursor, 12);
        years += 1;
    }

    while (addMonths(cursor, 1).getTime() <= end.getTime()) {
        cursor = addMonths(cursor, 1);
        months += 1;
    }

    const days = Math.ceil((end.getTime() - cursor.getTime()) / (1000 * 60 * 60 * 24));
    const parts = [
        years > 0 ? `${years} ปี` : '',
        months > 0 ? `${months} เดือน` : '',
        days > 0 ? `${days} วัน` : '',
    ].filter(Boolean);

    return `เหลือ ${parts.join(' ')}`;
};

const getExpiryHighlight = (contract: Contract) => {
    if (contract.status !== 'active') return undefined;

    const end = new Date(contract.end_date);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (end.getTime() <= addMonths(today, 1).getTime()) {
        return { bg: 'red.50', border: 'red.400', badge: 'red' };
    }
    if (end.getTime() <= addMonths(today, 2).getTime()) {
        return { bg: 'orange.50', border: 'orange.400', badge: 'orange' };
    }
    if (end.getTime() <= addMonths(today, 4).getTime()) {
        return { bg: 'yellow.50', border: 'yellow.400', badge: 'yellow' };
    }

    return undefined;
};

interface SortableHeaderProps {
    label: string;
    sortKey: ContractSortKey;
    activeSortKey: ContractSortKey;
    sortDirection: SortDirection;
    onSortChange: (key: ContractSortKey) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
    label,
    sortKey,
    activeSortKey,
    sortDirection,
    onSortChange,
}) => {
    const isActive = sortKey === activeSortKey;
    const SortIcon = !isActive
        ? LuArrowUpDown
        : sortDirection === 'asc'
            ? LuArrowUp
            : LuArrowDown;

    return (
        <Button
            variant="ghost"
            size="xs"
            px={1}
            fontWeight="semibold"
            colorPalette={isActive ? 'blue' : 'gray'}
            onClick={() => onSortChange(sortKey)}
        >
            {label}
            <Icon ml={1} fontSize="xs">
                <SortIcon />
            </Icon>
        </Button>
    );
};

export const ContractTable: React.FC<ContractTableProps> = ({
    contracts,
    rentRates,
    sortKey,
    sortDirection,
    onSortChange,
    onView,
    onEdit,
    onRenew,
    onTransfer,
    onCancel,
}) => {
    return (
        <Table.Root size="sm" variant="outline">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>ผู้เช่า</Table.ColumnHeader>
                    <Table.ColumnHeader>
                        <SortableHeader
                            label="ห้อง"
                            sortKey="room_number"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSortChange={onSortChange}
                        />
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                        <SortableHeader
                            label="วันที่เริ่ม"
                            sortKey="start_date"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSortChange={onSortChange}
                        />
                    </Table.ColumnHeader>
                    <Table.ColumnHeader>
                        <SortableHeader
                            label="วันที่สิ้นสุด"
                            sortKey="end_date"
                            activeSortKey={sortKey}
                            sortDirection={sortDirection}
                            onSortChange={onSortChange}
                        />
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">ค่าเช่า/เดือน</Table.ColumnHeader>
                    <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {contracts.map((contract) => {
                    const expiryHighlight = getExpiryHighlight(contract);
                    const remainingDuration = contract.status === 'active'
                        ? formatRemainingDuration(contract.end_date)
                        : null;

                    return (
                        <Table.Row
                            key={contract.id}
                            bg={expiryHighlight?.bg}
                            borderLeftWidth={expiryHighlight ? '4px' : undefined}
                            borderLeftColor={expiryHighlight?.border}
                        >
                            <Table.Cell fontWeight="medium">
                                {contract.tenant?.full_name || '-'}
                            </Table.Cell>
                            <Table.Cell>{contract.room?.room_number || '-'}</Table.Cell>
                            <Table.Cell>
                                {formatThaiShortDate(contract.start_date)}
                            </Table.Cell>
                            <Table.Cell>
                                <VStack align="start" gap={1}>
                                    <span>{formatThaiShortDate(contract.end_date)}</span>
                                    {remainingDuration && (
                                        <Badge colorPalette={expiryHighlight?.badge || 'gray'} size="xs">
                                            {remainingDuration}
                                        </Badge>
                                    )}
                                </VStack>
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                                {(() => {
                                    if (contract.tenant?.position_level && rentRates) {
                                        const rate = rentRates.find(
                                            (r) => r.position_level === contract.tenant?.position_level
                                        );
                                        if (rate && rate.rent_amount > 0) return `฿${rate.rent_amount.toLocaleString()}`;
                                    }
                                    return `฿${contract.monthly_rent.toLocaleString()}`;
                                })()}
                            </Table.Cell>
                            <Table.Cell>
                                <Badge colorPalette={getStatusColor(contract.status)}>
                                    {getStatusLabel(contract.status)}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell>
                                <HStack gap={1} justify="center">
                                    <Tooltip content="ดูรายละเอียด">
                                        <IconButton
                                            aria-label="View"
                                            size="xs"
                                            variant="ghost"
                                            onClick={() => onView(contract)}
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
                                            colorPalette="blue"
                                            onClick={() => onEdit(contract)}
                                        >
                                            <Icon>
                                                <LuPencil />
                                            </Icon>
                                        </IconButton>
                                    </Tooltip>
                                    {contract.status === 'active' && (
                                        <>
                                            <Tooltip content="ต่อสัญญา">
                                                <IconButton
                                                    aria-label="Renew"
                                                    size="xs"
                                                    variant="ghost"
                                                    colorPalette="blue"
                                                    onClick={() => onRenew(contract)}
                                                >
                                                    <Icon>
                                                        <LuRefreshCw />
                                                    </Icon>
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip content="ย้ายห้อง">
                                                <IconButton
                                                    aria-label="Transfer"
                                                    size="xs"
                                                    variant="ghost"
                                                    colorPalette="purple"
                                                    onClick={() => onTransfer(contract)}
                                                >
                                                    <Icon>
                                                        <LuArrowRightLeft />
                                                    </Icon>
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip content="ยกเลิก">
                                                <IconButton
                                                    aria-label="Cancel"
                                                    size="xs"
                                                    variant="ghost"
                                                    colorPalette="red"
                                                    onClick={() => onCancel(contract)}
                                                >
                                                    <Icon>
                                                        <LuX />
                                                    </Icon>
                                                </IconButton>
                                            </Tooltip>
                                        </>
                                    )}
                                </HStack>
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
        </Table.Root>
    );
};
