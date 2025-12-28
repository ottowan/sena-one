import React, { useState } from 'react';
import {
    Box,
    Heading,
    Button,
    HStack,
    VStack,
    Text,
    Table,
    Badge,
    IconButton,
    Tabs,
    Card,
    Stack
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LuPlus, LuPencil, LuTrash2, LuCircleCheck, LuClock } from 'react-icons/lu';
import { maintenanceService } from '../../services/maintenanceService';
import { MaintenanceRequestDialog } from '../../components/maintenance/MaintenanceRequestDialog';
import { MaintenanceStatusBadge } from '../../components/maintenance/MaintenanceStatusBadge';
import { toaster } from '../../components/ui/toaster';
import { EmptyState } from '../../components/ui/empty-state';
import { MaintenanceStatus, type MaintenanceRequest } from '../../types';

export const MaintenancePage: React.FC = () => {
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [requestToEdit, setRequestToEdit] = useState<MaintenanceRequest | null>(null);

    const { data: requests, isLoading } = useQuery({
        queryKey: ['maintenance-requests', selectedStatus],
        queryFn: () => maintenanceService.getMaintenanceRequests(selectedStatus === 'all' ? undefined : selectedStatus),
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: MaintenanceStatus }) =>
            maintenanceService.updateMaintenanceRequest(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            toaster.create({ title: 'อัปเดตสถานะสำเร็จ', type: 'success' });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: maintenanceService.deleteMaintenanceRequest,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] });
            toaster.create({ title: 'ลบรายการสำเร็จ', type: 'success' });
        },
    });

    const handleEdit = (request: MaintenanceRequest) => {
        setRequestToEdit(request);
        setIsDialogOpen(true);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('ยืนยันลบรายการแจ้งซ่อมนี้?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleUpdateStatus = (id: string, status: MaintenanceStatus) => {
        updateStatusMutation.mutate({ id, status });
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setRequestToEdit(null);
    };

    return (
        <Box p={6}>
            <HStack justify="space-between" mb={6}>
                <VStack align="start" gap={1}>
                    <Heading size="lg">แจ้งซ่อม / บำรุงรักษา</Heading>
                    <Text color="gray.600">จัดการรายการแจ้งซ่อมจากผู้เช่า</Text>
                </VStack>
                <Button colorPalette="blue" onClick={() => setIsDialogOpen(true)}>
                    <LuPlus /> แจ้งซ่อมใหม่
                </Button>
            </HStack>

            <Tabs.Root value={selectedStatus} onValueChange={(e) => setSelectedStatus(e.value)} mb={6}>
                <Tabs.List>
                    <Tabs.Trigger value="all">ทั้งหมด</Tabs.Trigger>
                    <Tabs.Trigger value="pending">รอรับเรื่อง</Tabs.Trigger>
                    <Tabs.Trigger value="in_progress">กำลังดำเนินการ</Tabs.Trigger>
                    <Tabs.Trigger value="completed">เสร็จสิ้น</Tabs.Trigger>
                </Tabs.List>
            </Tabs.Root>

            <Card.Root>
                <Card.Body p={0}>
                    {isLoading ? (
                        <Box p={8} textAlign="center"><Text>Loading...</Text></Box>
                    ) : requests?.length === 0 ? (
                        <EmptyState
                            icon={<LuCircleCheck />}
                            title="ไม่พบรายการแจ้งซ่อม"
                            description="ไม่มีรายการที่ตรงกับเงื่อนไข"
                        />
                    ) : (
                        <Table.ScrollArea>
                            <Table.Root striped>
                                <Table.Header>
                                    <Table.Row>
                                        <Table.ColumnHeader>วันที่แจ้ง</Table.ColumnHeader>
                                        <Table.ColumnHeader>ห้อง / ผู้แจ้ง</Table.ColumnHeader>
                                        <Table.ColumnHeader>หัวข้อ / รายละเอียด</Table.ColumnHeader>
                                        <Table.ColumnHeader>ความเร่งด่วน</Table.ColumnHeader>
                                        <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                                        <Table.ColumnHeader textAlign="right">จัดการ</Table.ColumnHeader>
                                    </Table.Row>
                                </Table.Header>
                                <Table.Body>
                                    {requests?.map((req) => (
                                        <Table.Row key={req.id}>
                                            <Table.Cell whiteSpace="nowrap">
                                                {new Date(req.created_at).toLocaleDateString('th-TH')}
                                            </Table.Cell>
                                            <Table.Cell>
                                                <VStack align="start" gap={0}>
                                                    <Text fontWeight="medium">ห้อง {req.room?.room_number}</Text>
                                                    <Text fontSize="sm" color="gray.500">{req.tenant?.full_name || '-'}</Text>
                                                </VStack>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <VStack align="start" gap={0}>
                                                    <Text fontWeight="medium">{req.title}</Text>
                                                    <Text fontSize="sm" color="gray.500" truncate maxW="200px">
                                                        {req.description}
                                                    </Text>
                                                </VStack>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <Badge
                                                    colorPalette={
                                                        req.priority === 'urgent' ? 'red' :
                                                            req.priority === 'high' ? 'orange' :
                                                                req.priority === 'medium' ? 'blue' : 'gray'
                                                    }
                                                >
                                                    {req.priority.toUpperCase()}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell>
                                                <MaintenanceStatusBadge status={req.status} />
                                            </Table.Cell>
                                            <Table.Cell textAlign="right">
                                                <HStack justify="end" gap={1}>
                                                    {req.status === 'pending' && (
                                                        <IconButton
                                                            variant="ghost"
                                                            colorPalette="blue"
                                                            size="xs"
                                                            title="รับเรื่อง"
                                                            onClick={() => handleUpdateStatus(req.id, MaintenanceStatus.IN_PROGRESS)}
                                                        >
                                                            <LuClock />
                                                        </IconButton>
                                                    )}
                                                    {req.status === 'in_progress' && (
                                                        <IconButton
                                                            variant="ghost"
                                                            colorPalette="green"
                                                            size="xs"
                                                            title="เสร็จสิ้น"
                                                            onClick={() => handleUpdateStatus(req.id, MaintenanceStatus.COMPLETED)}
                                                        >
                                                            <LuCircleCheck />
                                                        </IconButton>
                                                    )}

                                                    <IconButton variant="ghost" size="xs" onClick={() => handleEdit(req)}>
                                                        <LuPencil />
                                                    </IconButton>
                                                    <IconButton
                                                        variant="ghost"
                                                        colorPalette="red"
                                                        size="xs"
                                                        onClick={() => handleDelete(req.id)}
                                                    >
                                                        <LuTrash2 />
                                                    </IconButton>
                                                </HStack>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))}
                                </Table.Body>
                            </Table.Root>
                        </Table.ScrollArea>
                    )}
                </Card.Body>
            </Card.Root>

            <MaintenanceRequestDialog
                open={isDialogOpen}
                onClose={handleCloseDialog}
                requestToEdit={requestToEdit}
            />
        </Box>
    );
};
