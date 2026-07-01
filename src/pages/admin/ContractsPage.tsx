import React, { useMemo, useState } from 'react';
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
import { LuPlus, LuSearch, LuFileText } from 'react-icons/lu';
import { useContracts, useContractStats } from '../../hooks/useContracts';
import { useRentRates } from '../../hooks/useSettings';
import { ContractCard } from '../../components/contracts/ContractCard';
import { ContractTable } from '../../components/contracts/ContractTable';
import { ContractFormDialog } from '../../components/contracts/ContractFormDialog';
import { ContractDetailsDialog } from '../../components/contracts/ContractDetailsDialog';
import { RenewContractDialog } from '../../components/contracts/RenewContractDialog';
import { TransferContractDialog } from '../../components/contracts/TransferContractDialog';
import { CancelContractDialog } from '../../components/contracts/CancelContractDialog';
import { ViewModeToggle, type ViewMode } from '../../components/common/ViewModeToggle';
import { Button } from '../../components/ui/button';
import type { Contract, ContractStatus } from '../../types';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../../components/ui/native-select';

type ContractSortKey = 'room_number' | 'start_date' | 'end_date';
type SortDirection = 'asc' | 'desc';

export const ContractsPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ContractStatus | ''>('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [renewDialogOpen, setRenewDialogOpen] = useState(false);
    const [transferDialogOpen, setTransferDialogOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [sortKey, setSortKey] = useState<ContractSortKey>('end_date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const { data: contracts, isLoading } = useContracts({
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
    });

    const { data: rentRates } = useRentRates();

    const { data: stats } = useContractStats();

    const sortedContracts = useMemo(() => {
        return [...(contracts || [])].sort((a, b) => {
            let comparison = 0;

            if (sortKey === 'room_number') {
                comparison = (a.room?.room_number || '').localeCompare(
                    b.room?.room_number || '',
                    undefined,
                    { numeric: true, sensitivity: 'base' }
                );
            } else {
                comparison = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
            }

            if (comparison === 0) {
                comparison = (a.room?.room_number || '').localeCompare(
                    b.room?.room_number || '',
                    undefined,
                    { numeric: true, sensitivity: 'base' }
                );
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [contracts, sortDirection, sortKey]);

    const handleSortChange = (nextSortKey: ContractSortKey) => {
        if (nextSortKey === sortKey) {
            setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
            return;
        }

        setSortKey(nextSortKey);
        setSortDirection('asc');
    };

    const handleView = (contract: Contract) => {
        setSelectedContract(contract);
        setDetailsDialogOpen(true);
    };

    const handleRenew = (contract: Contract) => {
        setSelectedContract(contract);
        setRenewDialogOpen(true);
    };

    const handleTransfer = (contract: Contract) => {
        setSelectedContract(contract);
        setTransferDialogOpen(true);
    };

    const handleCancel = async (contract: Contract) => {
        setSelectedContract(contract);
        setCancelDialogOpen(true);
    };

    const handleEdit = (contract: Contract) => {
        setSelectedContract(contract);
        setDialogOpen(true);
    };

    const handleAddContract = () => {
        setSelectedContract(null);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedContract(null);
    };

    return (
        <>
            <VStack align="stretch" gap={8}>
                <HStack justify="space-between">
                    <Box>
                        <Heading size="2xl" mb={2}>
                            จัดการสัญญาเช่า
                        </Heading>
                        <Text color="gray.600" fontSize="lg">
                            จัดการสัญญาเช่าทั้งหมดในระบบ
                        </Text>
                    </Box>
                    <Button colorPalette="blue" size="lg" onClick={handleAddContract}>
                        <Icon mr={2}>
                            <LuPlus />
                        </Icon>
                        สร้างสัญญา
                    </Button>
                </HStack>

                {stats && (
                    <Grid
                        templateColumns={{
                            base: '1fr',
                            md: 'repeat(2, 1fr)',
                            lg: 'repeat(5, 1fr)',
                        }}
                        gap={4}
                    >
                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        สัญญาทั้งหมด
                                    </Text>
                                    <Heading size="xl">{stats.total}</Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        สัญญาเหลือ 4 เดือน
                                    </Text>
                                    <Heading size="xl" color="blue.600">
                                        {stats.remainingFourMonths}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        สัญญาเหลือ 2 เดือน
                                    </Text>
                                    <Heading size="xl" color="orange.600">
                                        {stats.remainingTwoMonths}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        ใกล้หมดอายุ
                                    </Text>
                                    <Heading size="xl" color="warning.600">
                                        {stats.expiringSoon}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root>
                            <Card.Body>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.600" fontSize="sm">
                                        หมดอายุ
                                    </Text>
                                    <Heading size="xl" color="red.600">
                                        {stats.expiredByDate}
                                    </Heading>
                                </VStack>
                            </Card.Body>
                        </Card.Root>
                    </Grid>
                )}

                <Card.Root>
                    <Card.Body>
                        <VStack gap={4} align="stretch">
                            <Grid
                                templateColumns={{
                                    base: '1fr',
                                    md: 'repeat(2, 1fr)',
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
                                        placeholder="ค้นหาชื่อผู้เช่า, เลขห้อง..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        pl={10}
                                    />
                                </Box>

                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as ContractStatus | '')}
                                    >
                                        <option value="">สถานะทั้งหมด</option>
                                        <option value="active">กำลังใช้งาน</option>
                                        <option value="expired">หมดอายุ</option>
                                        <option value="terminated">ยกเลิก</option>
                                        <option value="renewed">ต่ออายุแล้ว</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Grid>

                            <HStack gap={2} justify="flex-end">
                                <Text fontSize="sm" color="gray.600">
                                    รูปแบบการแสดงผล:
                                </Text>
                                <ViewModeToggle value={viewMode} onChange={setViewMode} />
                            </HStack>
                        </VStack>
                    </Card.Body>
                </Card.Root>

                {isLoading ? (
                    <Box p={8} textAlign="center">
                        <Text color="gray.500">กำลังโหลด...</Text>
                    </Box>
                ) : sortedContracts.length > 0 ? (
                    <>
                        {viewMode === 'table' ? (
                            <ContractTable
                                contracts={sortedContracts}
                                rentRates={rentRates}
                                sortKey={sortKey}
                                sortDirection={sortDirection}
                                onSortChange={handleSortChange}
                                onView={handleView}
                                onEdit={handleEdit}
                                onRenew={handleRenew}
                                onTransfer={handleTransfer}
                                onCancel={handleCancel}
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
                                {sortedContracts.map((contract) => (
                                    <ContractCard
                                        key={contract.id}
                                        contract={contract}
                                        rentRates={rentRates}
                                        onView={handleView}
                                        onEdit={handleEdit}
                                        onRenew={handleRenew}
                                        onTransfer={handleTransfer}
                                        onCancel={handleCancel}
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
                                    <LuFileText />
                                </Icon>
                                <VStack gap={2}>
                                    <Heading size="md" color="gray.600">
                                        ยังไม่มีสัญญา
                                    </Heading>
                                    <Text color="gray.500">
                                        เริ่มต้นโดยการสร้างสัญญาเช่าแรกของคุณ
                                    </Text>
                                </VStack>
                                <Button colorPalette="blue" onClick={handleAddContract}>
                                    <Icon mr={2}>
                                        <LuPlus />
                                    </Icon>
                                    สร้างสัญญา
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                )}
            </VStack>

            <ContractFormDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                contract={selectedContract}
            />

            <ContractDetailsDialog
                open={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                contract={selectedContract}
            />

            <RenewContractDialog
                open={renewDialogOpen}
                onClose={() => setRenewDialogOpen(false)}
                contract={selectedContract}
            />

            <TransferContractDialog
                open={transferDialogOpen}
                onClose={() => setTransferDialogOpen(false)}
                contract={selectedContract}
            />

            <CancelContractDialog
                open={cancelDialogOpen}
                onClose={() => setCancelDialogOpen(false)}
                contract={selectedContract}
            />
        </>
    );
};
