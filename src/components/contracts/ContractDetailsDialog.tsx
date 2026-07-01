import React from 'react';
import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogBackdrop,
    DialogCloseTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { VStack, HStack, Text, Heading, Grid, Badge, Icon } from '@chakra-ui/react';
import {
    LuUser,
    LuPhone,
    LuMail,
    LuMapPin,
    LuCalendar,
    LuDollarSign,
    LuClock,
} from 'react-icons/lu';
import type { Contract, ContractStatus } from '../../types';
import { formatThaiShortDate } from '../../lib/utils';

interface ContractDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    contract: Contract | null;
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

export const ContractDetailsDialog: React.FC<ContractDetailsDialogProps> = ({
    open,
    onClose,
    contract,
}) => {
    if (!contract) return null;

    const statusColor = getStatusColor(contract.status);
    const statusLabel = getStatusLabel(contract.status);

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>รายละเอียดสัญญา</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <VStack align="stretch" gap={6}>
                        <HStack justify="space-between">
                            <Heading size="md">สถานะสัญญา</Heading>
                            <Badge colorPalette={statusColor} size="lg">
                                {statusLabel}
                            </Badge>
                        </HStack>

                        <VStack align="stretch" gap={3}>
                            <Heading size="md">ข้อมูลผู้เช่า</Heading>

                            <HStack gap={3}>
                                <Icon color="blue.500">
                                    <LuUser />
                                </Icon>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="gray.600">
                                        ชื่อผู้เช่า
                                    </Text>
                                    <Text fontWeight="medium">
                                        {contract.tenant?.full_name || '-'}
                                    </Text>
                                </VStack>
                            </HStack>

                            <HStack gap={3}>
                                <Icon color="blue.500">
                                    <LuPhone />
                                </Icon>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="gray.600">
                                        เบอร์โทร
                                    </Text>
                                    <Text fontWeight="medium">
                                        {contract.tenant?.phone || '-'}
                                    </Text>
                                </VStack>
                            </HStack>

                            {contract.tenant?.email && (
                                <HStack gap={3}>
                                    <Icon color="blue.500">
                                        <LuMail />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            อีเมล
                                        </Text>
                                        <Text fontWeight="medium">{contract.tenant.email}</Text>
                                    </VStack>
                                </HStack>
                            )}
                        </VStack>

                        <VStack align="stretch" gap={3}>
                            <Heading size="md">ข้อมูลห้อง</Heading>

                            <HStack gap={3}>
                                <Icon color="blue.500">
                                    <LuMapPin />
                                </Icon>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="gray.600">
                                        เลขห้อง
                                    </Text>
                                    <Text fontWeight="medium">
                                        {contract.room?.room_number || '-'}
                                    </Text>
                                </VStack>
                            </HStack>

                            {contract.room?.room_type && (
                                <HStack gap={3}>
                                    <Icon color="blue.500">
                                        <LuMapPin />
                                    </Icon>
                                    <VStack align="start" gap={0}>
                                        <Text fontSize="sm" color="gray.600">
                                            ประเภทห้อง
                                        </Text>
                                        <Text fontWeight="medium">{contract.room.room_type}</Text>
                                    </VStack>
                                </HStack>
                            )}
                        </VStack>

                        <VStack align="stretch" gap={3}>
                            <Heading size="md">รายละเอียดสัญญา</Heading>

                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <VStack align="start" gap={1}>
                                    <HStack gap={2}>
                                        <Icon color="blue.500" fontSize="sm">
                                            <LuCalendar />
                                        </Icon>
                                        <Text fontSize="sm" fontWeight="medium">
                                            วันที่เริ่มสัญญา
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
                                            วันที่สิ้นสุดสัญญา
                                        </Text>
                                    </HStack>
                                    <Text fontSize="sm" color="gray.600" pl={6}>
                                        {formatThaiShortDate(contract.end_date)}
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
                                        ฿{contract.monthly_rent?.toLocaleString() || '0'}
                                    </Text>
                                </VStack>

                                <VStack align="start" gap={1}>
                                    <HStack gap={2}>
                                        <Icon color="blue.500" fontSize="sm">
                                            <LuDollarSign />
                                        </Icon>
                                        <Text fontSize="sm" fontWeight="medium">
                                            ค่ามัดจำ
                                        </Text>
                                    </HStack>
                                    <Text fontSize="sm" color="gray.600" pl={6}>
                                        ฿{contract.deposit_amount?.toLocaleString() || '0'}
                                    </Text>
                                </VStack>
                            </Grid>
                        </VStack>

                        <VStack align="stretch" gap={3}>
                            <Heading size="md">ข้อมูลเพิ่มเติม</Heading>

                            <HStack gap={3}>
                                <Icon color="gray.500">
                                    <LuClock />
                                </Icon>
                                <VStack align="start" gap={0}>
                                    <Text fontSize="sm" color="gray.600">
                                        สร้างเมื่อ
                                    </Text>
                                    <Text fontSize="sm">
                                        {new Date(contract.created_at).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </Text>
                                </VStack>
                            </HStack>
                        </VStack>
                    </VStack>
                </DialogBody>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        ปิด
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
