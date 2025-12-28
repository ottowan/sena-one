import React from 'react';
import {
    Card,
    Heading,
    Text,
    HStack,
    VStack,
    Badge,
    Icon,
    Grid,
} from '@chakra-ui/react';
import {
    LuUser,
    LuMapPin,
    LuCalendar,
    LuDollarSign,
    LuEye,
    LuRefreshCw,
    LuX,
    LuArrowRightLeft,
    LuPencil,
} from 'react-icons/lu';
import type { Contract, ContractStatus, RentRate } from '../../types';
import { Button } from '../ui/button';

interface ContractCardProps {
    contract: Contract;
    rentRates?: RentRate[];
    onView: (contract: Contract) => void;
    onEdit: (contract: Contract) => void;
    onRenew: (contract: Contract) => void;
    onTransfer: (contract: Contract) => void;
    onCancel: (contract: Contract) => void;
}

const getStatusColor = (status: ContractStatus): string => {
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

const getStatusLabel = (status: ContractStatus): string => {
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

const getDaysUntilExpiry = (endDate: string): number => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export const ContractCard: React.FC<ContractCardProps> = ({
    contract,
    rentRates,
    onView,
    onEdit,
    onRenew,
    onTransfer,
    onCancel,
}) => {
    const statusColor = getStatusColor(contract.status);
    const statusLabel = getStatusLabel(contract.status);
    const daysUntilExpiry = getDaysUntilExpiry(contract.end_date);
    const isExpiringSoon = contract.status === 'active' && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry <= 0;

    return (
        <Card.Root>
            <Card.Body>
                <VStack align="stretch" gap={4}>
                    {/* Header */}
                    <HStack justify="space-between" align="start">
                        <VStack align="start" gap={1}>
                            <Heading size="lg">
                                {contract.tenant?.full_name || 'ไม่ระบุผู้เช่า'}
                            </Heading>
                            <HStack gap={2}>
                                <Icon color="gray.500" fontSize="sm">
                                    <LuUser />
                                </Icon>
                                <Text color="gray.600" fontSize="sm">
                                    {contract.tenant?.phone || '-'}
                                </Text>
                            </HStack>
                        </VStack>
                        <VStack align="end" gap={1}>
                            <Badge colorPalette={statusColor} size="lg">
                                {statusLabel}
                            </Badge>
                            {isExpiringSoon && (
                                <Badge colorPalette="orange" size="sm">
                                    เหลือ {daysUntilExpiry} วัน
                                </Badge>
                            )}
                            {isExpired && contract.status === 'active' && (
                                <Badge colorPalette="red" size="sm">
                                    หมดอายุแล้ว
                                </Badge>
                            )}
                        </VStack>
                    </HStack>

                    {/* Details */}
                    <Grid templateColumns="repeat(2, 1fr)" gap={3}>
                        <VStack align="start" gap={1}>
                            <HStack gap={2}>
                                <Icon color="blue.500" fontSize="sm">
                                    <LuMapPin />
                                </Icon>
                                <Text fontSize="sm" fontWeight="medium">
                                    ห้อง
                                </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.600" pl={6}>
                                {contract.room?.room_number || '-'}
                            </Text>
                        </VStack>

                        <VStack align="start" gap={1}>
                            <HStack gap={2}>
                                <Icon color="blue.500" fontSize="sm">
                                    <LuDollarSign />
                                </Icon>
                                <Text fontSize="sm" fontWeight="medium">
                                    ค่าเช่า/เดือน
                                </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.600" pl={6}>
                                {(() => {
                                    // Priority 1: Dynamic Rent from Position Setting
                                    if (contract.tenant?.position_level && rentRates) {
                                        const rate = rentRates.find(r => r.position_level === contract.tenant?.position_level);
                                        if (rate && rate.rent_amount > 0) return `฿${rate.rent_amount.toLocaleString()}`;
                                    }
                                    return `฿${contract.monthly_rent?.toLocaleString() || '0'}`;
                                })()}
                            </Text>
                        </VStack>

                        <VStack align="start" gap={1}>
                            <HStack gap={2}>
                                <Icon color="blue.500" fontSize="sm">
                                    <LuCalendar />
                                </Icon>
                                <Text fontSize="sm" fontWeight="medium">
                                    เริ่มสัญญา
                                </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.600" pl={6}>
                                {new Date(contract.start_date).toLocaleDateString('th-TH')}
                            </Text>
                        </VStack>

                        <VStack align="start" gap={1}>
                            <HStack gap={2}>
                                <Icon color="blue.500" fontSize="sm">
                                    <LuCalendar />
                                </Icon>
                                <Text fontSize="sm" fontWeight="medium">
                                    สิ้นสุดสัญญา
                                </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.600" pl={6}>
                                {new Date(contract.end_date).toLocaleDateString('th-TH')}
                            </Text>
                        </VStack>
                    </Grid>

                    <VStack align="start" gap={1}>
                        <Text fontSize="sm" fontWeight="medium">
                            ค่ามัดจำ
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                            ฿{contract.deposit_amount?.toLocaleString() || '0'}
                        </Text>
                    </VStack>

                    {/* Actions */}
                    <HStack gap={2} pt={2} borderTop="1px" borderColor="gray.200">
                        <Button variant="outline" size="sm" flex={1} onClick={() => onView(contract)}>
                            <Icon mr={2}>
                                <LuEye />
                            </Icon>
                            ดูรายละเอียด
                        </Button>
                        <Button
                            variant="outline"
                            colorPalette="blue"
                            size="sm"
                            onClick={() => onEdit(contract)}
                        >
                            <Icon mr={1}>
                                <LuPencil />
                            </Icon>
                            แก้ไข
                        </Button>
                        {contract.status === 'active' && (
                            <>
                                <Button
                                    variant="outline"
                                    colorPalette="blue"
                                    size="sm"
                                    onClick={() => onRenew(contract)}
                                >
                                    <Icon mr={1}>
                                        <LuRefreshCw />
                                    </Icon>
                                    ต่อสัญญา
                                </Button>
                                <Button
                                    variant="outline"
                                    colorPalette="purple"
                                    size="sm"
                                    onClick={() => onTransfer(contract)}
                                >
                                    <Icon mr={1}>
                                        <LuArrowRightLeft />
                                    </Icon>
                                    ย้ายห้อง
                                </Button>
                                <Button
                                    variant="outline"
                                    colorPalette="red"
                                    size="sm"
                                    onClick={() => onCancel(contract)}
                                >
                                    <Icon>
                                        <LuX />
                                    </Icon>
                                </Button>
                            </>
                        )}
                    </HStack>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
};
