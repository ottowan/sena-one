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
import { formatThaiShortDate } from '../../lib/utils';

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
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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

const getExpiryHighlight = (contract: Contract) => {
    if (contract.status !== 'active') return undefined;

    const end = new Date(contract.end_date);
    const today = new Date();
    end.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (end.getTime() <= addMonths(today, 1).getTime()) return { bg: 'red.50', border: 'red.400' };
    if (end.getTime() <= addMonths(today, 2).getTime()) return { bg: 'orange.50', border: 'orange.400' };
    if (end.getTime() <= addMonths(today, 4).getTime()) return { bg: 'yellow.50', border: 'yellow.400' };
    return undefined;
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
    const expiryHighlight = getExpiryHighlight(contract);

    return (
        <Card.Root
            minW={0}
            bg={expiryHighlight?.bg}
            borderLeftWidth={expiryHighlight ? '4px' : undefined}
            borderLeftColor={expiryHighlight?.border}
        >
            <Card.Body>
                <VStack align="stretch" gap={4}>
                    <HStack justify="space-between" align="start" gap={3} wrap="wrap">
                        <VStack align="start" gap={1} minW={0} flex={1}>
                            <Heading size="lg" wordBreak="break-word">
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
                        <VStack align="end" gap={1} flexShrink={0}>
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

                    <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }} gap={3}>
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
                                {formatThaiShortDate(contract.start_date)}
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
                                {formatThaiShortDate(contract.end_date)}
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

                    <Grid
                        templateColumns="repeat(auto-fit, minmax(112px, 1fr))"
                        gap={2}
                        pt={2}
                        borderTop="1px"
                        borderColor="gray.200"
                    >
                        <Button variant="outline" size="sm" w="full" minW={0} onClick={() => onView(contract)}>
                            <Icon mr={2}>
                                <LuEye />
                            </Icon>
                            ดูรายละเอียด
                        </Button>
                        <Button
                            variant="outline"
                            colorPalette="blue"
                            size="sm"
                            w="full"
                            minW={0}
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
                                    w="full"
                                    minW={0}
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
                                    w="full"
                                    minW={0}
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
                                    w="full"
                                    minW={0}
                                    aria-label="ยกเลิกสัญญา"
                                    onClick={() => onCancel(contract)}
                                >
                                    <Icon>
                                        <LuX />
                                    </Icon>
                                </Button>
                            </>
                        )}
                    </Grid>
                </VStack>
            </Card.Body>
        </Card.Root>
    );
};
