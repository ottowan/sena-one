import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Badge, Text, HStack, Button, Table, Separator } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { pgliteClient } from '../../lib/pgliteClient';
import { formatCurrency } from '../../lib/utils';
import { LuFileText } from 'react-icons/lu';
import {
    DialogRoot,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
    DialogBackdrop,
    DialogActionTrigger,
} from '../../components/ui/dialog';

const getRoomNumber = (invoice: any) => {
    if (Array.isArray(invoice.contract?.room)) return invoice.contract.room[0]?.room_number;
    if (invoice.contract?.room?.room_number) return invoice.contract.room.room_number;
    if (Array.isArray(invoice.room)) return invoice.room[0]?.room_number;
    return invoice.room?.room_number || '-';
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'paid':
            return 'ชำระแล้ว';
        case 'pending':
            return 'รอชำระ';
        case 'cancelled':
            return 'ยกเลิก';
        default:
            return status;
    }
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'paid':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'cancelled':
            return 'red';
        default:
            return 'gray';
    }
};

const formatBillingMonth = (value: string) => {
    if (!value) return '-';
    const [year, month] = value.slice(0, 7).split('-').map(Number);
    if (!year || !month) return value;
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${months[month - 1]} ${year + 543}`;
};

const InvoiceDetailDialog = ({ invoice }: { invoice: any }) => {
    const waterRate = invoice.water_usage > 0 ? (invoice.water_cost / invoice.water_usage).toFixed(2) : 0;
    const electricityRate = invoice.electricity_usage > 0 ? (invoice.electricity_cost / invoice.electricity_usage).toFixed(2) : 0;

    return (
        <DialogRoot size="lg">
            <DialogBackdrop />
            <DialogTrigger asChild>
                <Button size="xs" variant="ghost" colorPalette="blue">
                    <LuFileText /> รายละเอียด
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>รายละเอียดใบแจ้งหนี้ - {formatBillingMonth(invoice.billing_month)}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>
                <DialogBody>
                    <VStack align="stretch" gap={3}>
                        <HStack justify="space-between">
                            <Text color="gray.600">ค่าเช่าห้อง:</Text>
                            <Text fontWeight="medium">{formatCurrency(invoice.rent_amount)}</Text>
                        </HStack>

                        <Box p={3} bg="blue.50" borderRadius="md">
                            <Text fontWeight="bold" color="blue.700" mb={1}>ค่าน้ำประปา</Text>
                            <HStack justify="space-between" fontSize="sm">
                                <Text color="gray.600">
                                    มิเตอร์: {invoice.water_meter_last} {'->'} {invoice.water_meter_current}
                                </Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" mt={1}>
                                <Text color="gray.600">
                                    การคำนวณ: {invoice.water_usage} หน่วย x {waterRate} บาท
                                </Text>
                                <Text fontWeight="medium" color="blue.700">{formatCurrency(invoice.water_cost)}</Text>
                            </HStack>
                        </Box>

                        <Box p={3} bg="orange.50" borderRadius="md">
                            <Text fontWeight="bold" color="orange.700" mb={1}>ค่าไฟฟ้า</Text>
                            <HStack justify="space-between" fontSize="sm">
                                <Text color="gray.600">
                                    มิเตอร์: {invoice.electricity_meter_last} {'->'} {invoice.electricity_meter_current}
                                </Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" mt={1}>
                                <Text color="gray.600">
                                    การคำนวณ: {invoice.electricity_usage} หน่วย x {electricityRate} บาท
                                </Text>
                                <Text fontWeight="medium" color="orange.700">{formatCurrency(invoice.electricity_cost)}</Text>
                            </HStack>
                        </Box>

                        {invoice.additional_charges && invoice.additional_charges.length > 0 && (
                            <Box>
                                <Text fontWeight="medium" mb={1}>ค่าใช้จ่ายอื่น ๆ</Text>
                                {invoice.additional_charges.map((charge: any, index: number) => (
                                    <HStack key={index} justify="space-between" pl={2} fontSize="sm" color="gray.600">
                                        <Text>- {charge.name}</Text>
                                        <Text>{formatCurrency(charge.amount)}</Text>
                                    </HStack>
                                ))}
                            </Box>
                        )}

                        <Separator />

                        <HStack justify="space-between" pt={2}>
                            <Text fontWeight="bold" fontSize="lg">ยอดรวมสุทธิ</Text>
                            <Text fontWeight="bold" fontSize="xl" color="blue.600">{formatCurrency(invoice.total_amount)}</Text>
                        </HStack>
                    </VStack>
                </DialogBody>
                <DialogFooter>
                    <DialogActionTrigger asChild>
                        <Button variant="outline">ปิด</Button>
                    </DialogActionTrigger>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};

const MobileInvoiceCard = ({ invoice }: { invoice: any }) => {
    return (
        <Card.Root mb={4} variant="subtle">
            <Card.Body p={4}>
                <VStack align="stretch" gap={3}>
                    <HStack justify="space-between">
                        <Text fontWeight="bold" fontSize="lg">{formatBillingMonth(invoice.billing_month)}</Text>
                        <Badge colorPalette={getStatusColor(invoice.status)}>
                            {getStatusLabel(invoice.status)}
                        </Badge>
                    </HStack>

                    <HStack justify="space-between" color="gray.600" fontSize="sm">
                        <Text>ห้อง:</Text>
                        <Text>{getRoomNumber(invoice)}</Text>
                    </HStack>

                    <HStack justify="space-between" color="gray.600" fontSize="sm">
                        <Text>วันครบกำหนด:</Text>
                        <Text>{invoice.due_date}</Text>
                    </HStack>

                    <Separator />

                    <HStack justify="space-between">
                        <Text fontWeight="medium">ยอดชำระ</Text>
                        <Text fontWeight="bold" fontSize="xl" color="brand.600">{formatCurrency(invoice.total_amount)}</Text>
                    </HStack>

                    <InvoiceDetailDialog invoice={invoice} />
                </VStack>
            </Card.Body>
        </Card.Root>
    );
};

const mergeInvoices = (...groups: any[][]) => {
    const byId = new Map<string, any>();
    groups.flat().forEach((invoice) => {
        if (invoice?.id) byId.set(invoice.id, invoice);
    });
    return [...byId.values()].sort((a, b) => {
        const monthCompare = String(b.billing_month || '').localeCompare(String(a.billing_month || ''));
        if (monthCompare !== 0) return monthCompare;
        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
};

const normalizePhone = (value?: string | null) => String(value || '').replace(/\D/g, '');

export const MyBillsPage: React.FC = () => {
    const { profile } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const fetchInvoices = async () => {
            if (!profile?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const profilePhone = normalizePhone(profile.phone);
                const { data: tenantRows, error: tenantError } = await pgliteClient
                    .from('tenants')
                    .select('id, current_room_id, phone, user_id');

                if (tenantError) throw tenantError;

                const matchingTenants = (tenantRows || []).filter((tenant) => {
                    const tenantPhone = normalizePhone(tenant.phone);
                    return tenant.user_id === profile.id || (profilePhone && tenantPhone === profilePhone);
                });

                if (matchingTenants.length === 0) {
                    if (!cancelled) setInvoices([]);
                    return;
                }

                const tenantIds = [...new Set(matchingTenants.map((tenant) => tenant.id).filter(Boolean))];

                const { data: contracts, error: contractError } = tenantIds.length
                    ? await pgliteClient
                        .from('contracts')
                        .select('id, room_id, tenant_id')
                        .in('tenant_id', tenantIds)
                    : { data: [], error: null };

                if (contractError) throw contractError;

                const contractIds = [...new Set((contracts || []).map((contract) => contract.id).filter(Boolean))];
                const roomIds = [...new Set([
                    ...matchingTenants.map((tenant) => tenant.current_room_id),
                    ...(contracts || []).map((contract) => contract.room_id),
                ].filter(Boolean))];

                const baseSelect = '*, contract:contracts(room:rooms(room_number)), room:rooms(room_number)';

                const [byTenant, byContracts, byRooms] = await Promise.all([
                    tenantIds.length
                        ? pgliteClient
                            .from('invoices')
                            .select(baseSelect)
                            .in('tenant_id', tenantIds)
                            .order('billing_month', { ascending: false })
                        : Promise.resolve({ data: [], error: null }),
                    contractIds.length
                        ? pgliteClient
                            .from('invoices')
                            .select(baseSelect)
                            .in('contract_id', contractIds)
                            .order('billing_month', { ascending: false })
                        : Promise.resolve({ data: [], error: null }),
                    roomIds.length
                        ? pgliteClient
                            .from('invoices')
                            .select(baseSelect)
                            .in('room_id', roomIds)
                            .order('billing_month', { ascending: false })
                        : Promise.resolve({ data: [], error: null }),
                ]);

                if (byTenant.error) throw byTenant.error;
                if (byContracts.error) throw byContracts.error;
                if (byRooms.error) throw byRooms.error;

                if (!cancelled) {
                    setInvoices(mergeInvoices(byTenant.data || [], byContracts.data || [], byRooms.data || []));
                }
            } catch (error) {
                console.error('Error fetching tenant invoices:', error);
                if (!cancelled) setInvoices([]);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void fetchInvoices();

        return () => {
            cancelled = true;
        };
    }, [profile?.id, profile?.phone]);

    return (
        <VStack align="stretch" gap={6} py={4}>
            <Heading size="lg">บิลและการชำระเงิน</Heading>

            <Box display={{ base: 'block', md: 'none' }}>
                {isLoading ? (
                    <Text textAlign="center">กำลังโหลด...</Text>
                ) : invoices.length === 0 ? (
                    <Text textAlign="center" color="gray.500">ไม่พบประวัติการชำระเงิน</Text>
                ) : (
                    invoices.map((invoice) => (
                        <MobileInvoiceCard key={invoice.id} invoice={invoice} />
                    ))
                )}
            </Box>

            <Card.Root display={{ base: 'none', md: 'block' }}>
                <Card.Body overflowX="auto">
                    <Table.Root interactive>
                        <Table.Header>
                            <Table.Row>
                                <Table.ColumnHeader>เดือน</Table.ColumnHeader>
                                <Table.ColumnHeader>ห้อง</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right">ยอดชำระ</Table.ColumnHeader>
                                <Table.ColumnHeader>วันครบกำหนด</Table.ColumnHeader>
                                <Table.ColumnHeader>สถานะ</Table.ColumnHeader>
                                <Table.ColumnHeader></Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {isLoading ? (
                                <Table.Row><Table.Cell colSpan={6} textAlign="center">กำลังโหลด...</Table.Cell></Table.Row>
                            ) : invoices.length === 0 ? (
                                <Table.Row><Table.Cell colSpan={6} textAlign="center">ไม่พบประวัติการชำระเงิน</Table.Cell></Table.Row>
                            ) : invoices.map((invoice) => (
                                <Table.Row key={invoice.id}>
                                    <Table.Cell>{formatBillingMonth(invoice.billing_month)}</Table.Cell>
                                    <Table.Cell>{getRoomNumber(invoice)}</Table.Cell>
                                    <Table.Cell textAlign="right" fontWeight="bold">{formatCurrency(invoice.total_amount)}</Table.Cell>
                                    <Table.Cell>{invoice.due_date}</Table.Cell>
                                    <Table.Cell>
                                        <Badge colorPalette={getStatusColor(invoice.status)}>
                                            {getStatusLabel(invoice.status)}
                                        </Badge>
                                    </Table.Cell>
                                    <Table.Cell>
                                        <InvoiceDetailDialog invoice={invoice} />
                                    </Table.Cell>
                                </Table.Row>
                            ))}
                        </Table.Body>
                    </Table.Root>
                </Card.Body>
            </Card.Root>
        </VStack>
    );
};
