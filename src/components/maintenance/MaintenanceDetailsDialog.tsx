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
import { VStack, HStack, Text, Badge, Box, Separator, Image, Grid } from '@chakra-ui/react';
import type { MaintenanceRequest, MaintenanceStatus } from '../../types';
import { useUpdateMaintenanceStatus } from '../../hooks/useMaintenance';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';

interface MaintenanceDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    request?: MaintenanceRequest | null;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'completed': return 'green';
        case 'in_progress': return 'blue';
        case 'pending': return 'yellow';
        case 'cancelled': return 'gray';
        default: return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'completed': return 'เสร็จสิ้น';
        case 'in_progress': return 'กำลังดำเนินการ';
        case 'pending': return 'รอรับเรื่อง';
        case 'cancelled': return 'ยกเลิก';
        default: return status;
    }
};

export const MaintenanceDetailsDialog: React.FC<MaintenanceDetailsDialogProps> = ({
    open,
    onClose,
    request,
}) => {
    const updateStatus = useUpdateMaintenanceStatus();

    if (!request) return null;

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as MaintenanceStatus;
        if (newStatus) {
            updateStatus.mutate({ id: request.id, status: newStatus });
        }
    };

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <HStack justify="space-between" align="center" pr={8}>
                        <DialogTitle>รายละเอียดแจ้งซ่อม</DialogTitle>
                        <Badge colorPalette={getStatusColor(request.status)} size="lg">
                            {getStatusLabel(request.status)}
                        </Badge>
                    </HStack>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <VStack align="stretch" gap={6}>
                        {/* Info Header */}
                        <Box p={4} bg="gray.50" borderRadius="md">
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.500" fontSize="sm">ห้อง</Text>
                                    <Text fontWeight="medium" fontSize="lg">
                                        {request.room?.room_number}
                                    </Text>
                                </VStack>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.500" fontSize="sm">ผู้แจ้ง</Text>
                                    <Text fontWeight="medium">
                                        {request.tenant?.full_name || 'ไม่ระบุ'}
                                    </Text>
                                </VStack>
                            </Grid>
                        </Box>

                        <VStack align="stretch" gap={2}>
                            <Text fontWeight="bold" fontSize="lg">{request.title}</Text>
                            <Text color="gray.600" whiteSpace="pre-wrap">
                                {request.description}
                            </Text>
                        </VStack>

                        {/* Images */}
                        {request.images && request.images.length > 0 && (
                            <VStack align="stretch" gap={2}>
                                <Text fontWeight="medium">รูปภาพประกอบ</Text>
                                <Grid templateColumns="repeat(3, 1fr)" gap={2}>
                                    {request.images.map((url, index) => (
                                        <Box key={index} borderRadius="md" overflow="hidden" aspectRatio={1}>
                                            <Image
                                                src={url}
                                                alt={`Evidence ${index + 1}`}
                                                objectFit="cover"
                                                w="full"
                                                h="full"
                                                cursor="pointer"
                                                onClick={() => window.open(url, '_blank')}
                                            />
                                        </Box>
                                    ))}
                                </Grid>
                            </VStack>
                        )}

                        <Separator />

                        <VStack align="stretch" gap={2}>
                            <Text fontWeight="medium">อัปเดตสถานะ</Text>
                            <NativeSelectRoot>
                                <NativeSelectField
                                    value={request.status}
                                    onChange={handleStatusChange}
                                >
                                    <option value="pending">รอรับเรื่อง</option>
                                    <option value="in_progress">กำลังดำเนินการ</option>
                                    <option value="completed">ดำเนินการเสร็จสิ้น</option>
                                    <option value="cancelled">ยกเลิก</option>
                                </NativeSelectField>
                            </NativeSelectRoot>
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
