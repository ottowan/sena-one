import React from 'react';
import { Table, Badge, HStack, IconButton, Icon } from '@chakra-ui/react';
import { LuEye, LuPencil, LuRefreshCw, LuArrowRightLeft, LuX } from 'react-icons/lu';
import type { Contract, RentRate } from '../../types';
import { Tooltip } from '../ui/tooltip';

interface ContractTableProps {
    contracts: Contract[];
    rentRates?: RentRate[];
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

export const ContractTable: React.FC<ContractTableProps> = ({
    contracts,
    rentRates,
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
                    <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                    <Table.ColumnHeader>วันที่เริ่ม</Table.ColumnHeader>
                    <Table.ColumnHeader>วันที่สิ้นสุด</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">ค่าเช่า/เดือน</Table.ColumnHeader>
                    <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">จัดการ</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {contracts.map((contract) => (
                    <Table.Row key={contract.id}>
                        <Table.Cell fontWeight="medium">
                            {contract.tenant?.full_name || '-'}
                        </Table.Cell>
                        <Table.Cell>{contract.room?.room_number || '-'}</Table.Cell>
                        <Table.Cell>
                            {new Date(contract.start_date).toLocaleDateString('th-TH')}
                        </Table.Cell>
                        <Table.Cell>
                            {new Date(contract.end_date).toLocaleDateString('th-TH')}
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                            {(() => {
                                // Priority 1: Dynamic Rent from Position Setting
                                if (contract.tenant?.position_level && rentRates) {
                                    const rate = rentRates.find(r => r.position_level === contract.tenant?.position_level);
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
                ))}
            </Table.Body>
        </Table.Root>
    );
};
