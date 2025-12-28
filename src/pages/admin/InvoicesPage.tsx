import React, { useState } from 'react';
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
import { LuPlus, LuSearch, LuFileText, LuDownload, LuFiles, LuCalendar, LuFileSpreadsheet } from 'react-icons/lu';
import { exportMonthlyInvoices, exportRoomInvoices } from '../../lib/exportInvoice';
import { exportService } from '../../services/exportService';
import { toaster } from '../../components/ui/toaster';
import { useInvoices, useDeleteInvoice } from '../../hooks/useInvoices';
import { InvoiceCard } from '../../components/invoices/InvoiceCard';
import { InvoiceTable } from '../../components/invoices/InvoiceTable';
import { InvoiceFormDialog } from '../../components/invoices/InvoiceFormDialog';
import { InvoiceDetailsDialog } from '../../components/invoices/InvoiceDetailsDialog';
import { BulkInvoiceDialog } from '../../components/invoices/BulkInvoiceDialog';
import { ViewModeToggle, type ViewMode } from '../../components/common/ViewModeToggle';
import { Button } from '../../components/ui/button';
import {
    NativeSelectField,
    NativeSelectRoot,
} from '../../components/ui/native-select';
import type { Invoice } from '../../types';

export const InvoicesPage: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [monthFilter, setMonthFilter] = useState<string>('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const { data: invoices, isLoading } = useInvoices({
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
        month: monthFilter || undefined,
    });

    const deleteInvoice = useDeleteInvoice();

    const handleView = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setDetailsDialogOpen(true);
    };

    const handleDelete = async (invoice: Invoice) => {
        if (confirm(`ต้องการลบใบแจ้งหนี้ของเดือน ${new Date(invoice.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })} ของ ${invoice.tenant?.full_name} ใช่หรือไม่?`)) {
            deleteInvoice.mutate(invoice.id);
        }
    };

    const handleSelectAll = () => {
        if (selectedInvoices.length === invoices?.length) {
            setSelectedInvoices([]);
        } else {
            setSelectedInvoices(invoices?.map(inv => inv.id) || []);
        }
    };

    const handleSelectInvoice = (id: string) => {
        setSelectedInvoices(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleDeleteSelected = async () => {
        if (selectedInvoices.length === 0) return;

        if (confirm(`ต้องการลบใบแจ้งหนี้ ${selectedInvoices.length} รายการ ใช่หรือไม่?`)) {
            try {
                setIsDeleting(true);
                const { invoiceService } = await import('../../services/invoiceService');
                await invoiceService.deleteAllInvoices(selectedInvoices);

                toaster.create({
                    title: 'ลบสำเร็จ',
                    description: `ลบใบแจ้งหนี้ ${selectedInvoices.length} รายการแล้ว`,
                    type: 'success',
                });

                setSelectedInvoices([]);
                window.location.reload(); // Refresh to update list
            } catch (error: any) {
                toaster.create({
                    title: 'เกิดข้อผิดพลาด',
                    description: error.message || 'ไม่สามารถลบใบแจ้งหนี้ได้',
                    type: 'error',
                });
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleExport = async () => {
        try {
            // If no month selected, use current month
            let exportMonth = monthFilter;
            if (!exportMonth) {
                const now = new Date();
                exportMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            }

            await exportService.exportMonthlyInvoices(exportMonth);
            toaster.create({
                title: 'สำเร็จ',
                description: 'ดาวน์โหลดไฟล์ Excel เรียบร้อยแล้ว',
                type: 'success',
            });
        } catch (error: any) {
            console.error('Export error:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถ export ไฟล์ได้',
                type: 'error',
            });
        }
    };

    const handleExportByRoom = async (roomNumber: string) => {
        if (!invoices) return;

        try {
            const roomInvoices = invoices.filter(inv => inv.room?.room_number === roomNumber);
            if (roomInvoices.length === 0) {
                toaster.create({
                    title: 'ไม่มีข้อมูล',
                    description: `ไม่มีใบแจ้งหนี้สำหรับห้อง ${roomNumber}`,
                    type: 'warning',
                });
                return;
            }

            const fileName = await exportRoomInvoices(roomNumber, roomInvoices);

            toaster.create({
                title: 'Export สำเร็จ',
                description: `ดาวน์โหลดไฟล์ ${fileName} เรียบร้อยแล้ว`,
                type: 'success',
            });
        } catch (error: any) {
            console.error('Export error:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถ export ไฟล์ได้',
                type: 'error',
            });
        }
    };

    const handleAddInvoice = () => {
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    return (
        <>
            <VStack align="stretch" gap={8}>
                {/* Header */}
                <HStack justify="space-between">
                    <Box>
                        <Heading size="2xl" mb={2}>
                            จัดการใบแจ้งหนี้
                        </Heading>
                        <Text color="gray.600" fontSize="lg">
                            ออกใบแจ้งหนี้และติดตามสถานะการชำระเงิน
                        </Text>
                    </Box>
                    <HStack>
                        {selectedInvoices.length > 0 && (
                            <Button
                                colorPalette="red"
                                variant="solid"
                                onClick={handleDeleteSelected}
                                loading={isDeleting}
                            >
                                ลบที่เลือก ({selectedInvoices.length})
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleExport}
                            colorPalette="green"
                        >
                            <Icon mr={2}><LuFileSpreadsheet /></Icon>
                            Export Excel
                        </Button>
                        {monthFilter && (
                            <Text fontSize="sm" color="gray.600">
                                (เดือน {new Date(monthFilter + '-01').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })})
                            </Text>
                        )}
                        <Button colorPalette="blue" variant="subtle" onClick={() => setBulkDialogOpen(true)}>
                            <Icon mr={2}><LuFiles /></Icon>
                            สร้างหลายรายการ
                        </Button>
                        <Button colorPalette="blue" size="lg" onClick={handleAddInvoice}>
                            <Icon mr={2}><LuPlus /></Icon>
                            ออกใบแจ้งหนี้
                        </Button>
                    </HStack>
                </HStack>

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
                                        placeholder="ค้นหาชื่อผู้เช่า, เลขห้อง..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        pl={10}
                                    />
                                </Box>

                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                    >
                                        <option value="">สถานะทั้งหมด</option>
                                        <option value="pending">รอชำระ</option>
                                        <option value="paid">ชำระแล้ว</option>
                                        <option value="overdue">เกินกำหนด</option>
                                        <option value="cancelled">ยกเลิก</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>

                                <Input
                                    type="month"
                                    value={monthFilter}
                                    onChange={(e) => setMonthFilter(e.target.value)}
                                />
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

                {/* Invoice List */}
                {isLoading ? (
                    <Box p={8} textAlign="center">
                        <Text color="gray.500">กำลังโหลด...</Text>
                    </Box>
                ) : invoices && invoices.length > 0 ? (
                    <>
                        {viewMode === 'table' ? (
                            <InvoiceTable
                                invoices={invoices}
                                onView={handleView}
                                onDelete={handleDelete}
                                onExportRoom={handleExportByRoom}
                                selectedInvoices={selectedInvoices}
                                onSelectInvoice={handleSelectInvoice}
                                onSelectAll={handleSelectAll}
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
                                {invoices.map((invoice) => (
                                    <InvoiceCard
                                        key={invoice.id}
                                        invoice={invoice}
                                        onView={handleView}
                                        onDelete={handleDelete}
                                        onExportRoom={handleExportByRoom}
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
                                        ยังไม่มีใบแจ้งหนี้
                                    </Heading>
                                    <Text color="gray.500">
                                        เริ่มต้นโดยการออกใบแจ้งหนี้ใบแรกของคุณ
                                    </Text>
                                </VStack>
                                <Button colorPalette="blue" onClick={handleAddInvoice}>
                                    <Icon mr={2}>
                                        <LuPlus />
                                    </Icon>
                                    ออกใบแจ้งหนี้
                                </Button>
                            </VStack>
                        </Card.Body>
                    </Card.Root>
                )}
            </VStack>

            {/* Invoice Form Dialog */}
            <InvoiceFormDialog
                open={dialogOpen}
                onClose={handleCloseDialog}
            />

            {/* Invoice Details Dialog */}
            <InvoiceDetailsDialog
                open={detailsDialogOpen}
                onClose={() => setDetailsDialogOpen(false)}
                invoice={selectedInvoice}
            />

            {/* Bulk Invoice Dialog */}
            <BulkInvoiceDialog
                open={bulkDialogOpen}
                onClose={() => setBulkDialogOpen(false)}
            />
        </>
    );
};
