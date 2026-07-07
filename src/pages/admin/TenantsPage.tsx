import React, { useEffect, useRef, useState } from 'react';
import {
    Box,
    Grid,
    Heading,
    Text,
    Card,
    HStack,
    VStack,
    Icon,
    Input,
} from '@chakra-ui/react';
import { LuPlus, LuSearch, LuUsers } from 'react-icons/lu';
import { useTenants, useTenantStats, useDeleteTenant } from '../../hooks/useTenants';
import { TenantCard } from '../../components/tenants/TenantCard';
import { TenantTable } from '../../components/tenants/TenantTable';
import { TenantFormDialog } from '../../components/tenants/TenantFormDialog';
import { TenantDetailsDialog } from '../../components/tenants/TenantDetailsDialog';
import { ViewModeToggle, type ViewMode } from '../../components/common/ViewModeToggle';
import { Button } from '../../components/ui/button';
import type { Tenant } from '../../types';
import { tenantService } from '../../services/tenantService';
import { toaster } from '../../components/ui/toaster';
import { useQueryClient } from '@tanstack/react-query';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../../components/ui/native-select';

export const TenantsPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'pending' | ''>('');
    const [vehiclePlateFilter, setVehiclePlateFilter] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const queryClient = useQueryClient();
    const autoLinkRunKey = useRef('');

    const { data: tenants, isLoading } = useTenants({
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
        vehiclePlate: vehiclePlateFilter || undefined,
    });

    const { data: stats } = useTenantStats();
    const deleteTenant = useDeleteTenant();

    useEffect(() => {
        if (isLoading || !tenants?.length) return;

        const eligibleTenantIds = tenants
            .filter((tenant) => !tenant.user_id && tenant.phone && tenant.room?.id)
            .map((tenant) => tenant.id)
            .sort();
        const runKey = eligibleTenantIds.join(',');

        if (!runKey || autoLinkRunKey.current === runKey) return;
        autoLinkRunKey.current = runKey;

        tenantService.autoLinkUsersWithActiveContracts(eligibleTenantIds)
            .then((linkedCount) => {
                if (linkedCount > 0) {
                    toaster.create({
                        title: 'ผูกบัญชีผู้ใช้งานอัตโนมัติแล้ว',
                        description: `ผูกบัญชีให้ผู้เช่า ${linkedCount} รายการ`,
                        type: 'success',
                    });
                    queryClient.invalidateQueries({ queryKey: ['tenants'] });
                }
            })
            .catch((error) => {
                console.error('Error auto-linking tenant users:', error);
            });
    }, [isLoading, tenants, queryClient]);

    const handleView = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setDetailsDialogOpen(true);
    };

    const handleEdit = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setDialogOpen(true);
    };

    const handleDelete = async (tenant: Tenant) => {
        if (confirm(`ต้องการลบผู้เช่า ${tenant.full_name} ใช่หรือไม่?`)) {
            deleteTenant.mutate(tenant.id);
        }
    };

    const handleAddTenant = () => {
        setSelectedTenant(null);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedTenant(null);
    };

    return (
        <>
            <VStack align="stretch" gap={8}>
                {/* Header */}
                <HStack justify="space-between">
                    <Box>
                        <Heading size="2xl" mb={2}>
                            จัดการผู้เช่า
                        </Heading>
                        <Text color="gray.600" fontSize="lg">
                            จัดการข้อมูลผู้เช่าทั้งหมดในระบบ
                        </Text>
                    </Box>
                    <Button colorPalette="blue" size="lg" onClick={handleAddTenant}>
                        <Icon mr={2}>
                            <LuPlus />
                        </Icon>
                        เพิ่มผู้เช่า
                    </Button>
                </HStack>

                {/* Stats */}
                {stats && (
                    <Grid
                        templateColumns={{
                            base: '1fr',
                            md: 'repeat(2, 1fr)',
                            lg: 'repeat(4, 1fr)',
                        }}
                        gap={4}
                    >
                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ผู้เช่าทั้งหมด
                                    </Text>
                                    <Heading size="xl">{stats.total}</Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        กำลังเช่า
                                    </Text>
                                    <Heading size="xl" color="success.600">
                                        {stats.active}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ค้างชำระ
                                    </Text>
                                    <Heading size="xl" color="danger.600">
                                        {stats.overdue}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ใกล้หมดสัญญา
                                    </Text>
                                    <Heading size="xl" color="warning.600">
                                        {stats.expiringSoon}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </Grid>
                )}

                {/* Filters */}
                <Card.Root>
                    <Card.Body>
                        <VStack gap={4} align="stretch">
                            <Grid
                                templateColumns={{
                                    base: '1fr',
                                    md: 'repeat(3, 1fr)',
                                }}
                                gap={4}
                            >
                                <Box position="relative">
                                    <Icon
                                        position="absolute"
                                        left={3}
                                        top="50%"
                                        transform="translateY(-50%)"
                                        color="gray.400"
                                        zIndex={1}
                                    >
                                        <LuSearch />
                                    </Icon>
                                    <Input
                                        placeholder="ค้นหาชื่อ, เบอร์โทร, เลขบัตรประชาชน..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        pl={10}
                                    />
                                </Box>

                                <Input
                                    placeholder="ค้นหาทะเบียนรถ..."
                                    value={vehiclePlateFilter}
                                    onChange={(e) => setVehiclePlateFilter(e.target.value)}
                                />

                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={statusFilter}
                                        onChange={(e) =>
                                            setStatusFilter(e.target.value as 'active' | 'inactive' | 'pending' | '')
                                        }
                                    >
                                        <option value="">สถานะทั้งหมด</option>
                                        <option value="active">กำลังเช่า</option>
                                        <option value="inactive">ไม่ได้เช่า</option>
                                        <option value="pending">รอดำเนินการ</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Grid>

                            {/* View Mode Toggle */}
                            <HStack gap={2} justify="flex-end">
                                <Text fontSize="sm" color="gray.600">
                                    รูปแบบการแสดงผล:
                                </Text>
                                <ViewModeToggle value={viewMode} onChange={setViewMode} />
                            </HStack>
                        </VStack>
                    </Card.Body>
                </Card.Root>

                {/* Tenant List */}
                {isLoading ? (
                    <Box p={8} textAlign="center">
                        <Text color="gray.500">กำลังโหลด...</Text>
                    </Box>
                ) : tenants && tenants.length > 0 ? (
                    <>
                        {viewMode === 'table' ? (
                            <TenantTable
                                tenants={tenants}
                                onView={handleView}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ) : (
                            <Grid
                                templateColumns={{
                                    base: '1fr',
                                    md: viewMode === 'list' ? '1fr' : 'repeat(2, 1fr)',
                                    lg: viewMode === 'list' ? '1fr' : 'repeat(3, 1fr)',
                                }}
                                gap={6}
                            >
                                {tenants.map((tenant) => (
                                    <TenantCard
                                        key={tenant.id}
                                        tenant={tenant}
                                        onView={handleView}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </Grid>
                        )}
                    </>
                ) : (
                    <Card.Root>
                        <Card.Body>
                            <VStack gap={4} py={8}>
                                <Icon fontSize="4xl" color="gray.400">
                                    <LuUsers />
                                </Icon>
                                <VStack gap={2}>
                                    <Heading size="md" color="gray.600">
                                        ยังไม่มีผู้เช่า
                                    </Heading>
                                    <Text color="gray.500">
                                        เริ่มต้นโดยการเพิ่มผู้เช่าคนแรกของคุณ
                                    </Text>
                                </VStack>
                                <Button colorPalette="blue" onClick={handleAddTenant}>
                                    <Icon mr={2}>
                                        <LuPlus />
                                    </Icon>
                                    เพิ่มผู้เช่า
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                )}
            </VStack>

            {/* Tenant Form Dialog */}
            <TenantFormDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                tenant={selectedTenant}
            />

            {/* Tenant Details Dialog */}
            <TenantDetailsDialog
                open={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                tenant={selectedTenant}
            />
        </>
    );
};
