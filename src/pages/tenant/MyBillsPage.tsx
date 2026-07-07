import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Badge, Text, HStack, Button, Table, Separator } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { fetchByIds } from '../../lib/firestoreUtils';
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
                            <Text color="fg.muted">ค่าเช่าห้อง:</Text>
                            <Text fontWeight="medium">{formatCurrency(invoice.rent_amount)}</Text>
                        </HStack>

                        <Box p={3} bg="blue.subtle" borderRadius="md">
                            <Text fontWeight="bold" color="blue.fg" mb={1}>ค่าน้ำประปา</Text>
                            <HStack justify="space-between" fontSize="sm">
                                <Text color="fg.muted">
                                    มิเตอร์: {invoice.water_meter_last} {'->'} {invoice.water_meter_current}
                                </Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" mt={1}>
                                <Text color="fg.muted">
                                    การคำนวณ: {invoice.water_usage} หน่วย x {waterRate} บาท
                                </Text>
                                <Text fontWeight="medium" color="blue.fg">{formatCurrency(invoice.water_cost)}</Text>
                            </HStack>
                        </Box>

                        <Box p={3} bg="orange.subtle" borderRadius="md">
                            <Text fontWeight="bold" color="orange.fg" mb={1}>ค่าไฟฟ้า</Text>
                            <HStack justify="space-between" fontSize="sm">
                                <Text color="fg.muted">
                                    มิเตอร์: {invoice.electricity_meter_last} {'->'} {invoice.electricity_meter_current}
                                </Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" mt={1}>
                                <Text color="fg.muted">
                                    การคำนวณ: {invoice.electricity_usage} หน่วย x {electricityRate} บาท
                                </Text>
                                <Text fontWeight="medium" color="orange.fg">{formatCurrency(invoice.electricity_cost)}</Text>
                            </HStack>
                        </Box>

                        {invoice.additional_charges && invoice.additional_charges.length > 0 && (
                            <Box>
                                <Text fontWeight="medium" mb={1}>ค่าใช้จ่ายอื่น ๆ</Text>
                                {invoice.additional_charges.map((charge: any, index: number) => (
                                    <HStack key={index} justify="space-between" pl={2} fontSize="sm" color="fg.muted">
                                        <Text>- {charge.name}</Text>
                                        <Text>{formatCurrency(charge.amount)}</Text>
                                    </HStack>
                                ))}
                            </Box>
                        )}

                        <Separator />

                        <HStack justify="space-between" pt={2}>
                            <Text fontWeight="bold" fontSize="lg">ยอดรวมสุทธิ</Text>
                            <Text fontWeight="bold" fontSize="xl" color="blue.fg">{formatCurrency(invoice.total_amount)}</Text>
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

                    <HStack justify="space-between" color="fg.muted" fontSize="sm">
                        <Text>ห้อง:</Text>
                        <Text>{getRoomNumber(invoice)}</Text>
                    </HStack>

                    <HStack justify="space-between" color="fg.muted" fontSize="sm">
                        <Text>วันครบกำหนด:</Text>
                        <Text>{invoice.due_date}</Text>
                    </HStack>

                    <Separator />

                    <HStack justify="space-between">
                        <Text fontWeight="medium">ยอดชำระ</Text>
                        <Text fontWeight="bold" fontSize="xl" color="brand.fg">{formatCurrency(invoice.total_amount)}</Text>
                    </HStack>

                    <InvoiceDetailDialog invoice={invoice} />
                </VStack>
            </Card.Body>
        </Card.Root>
    );
};

export const MyBillsPage: React.FC = () => {
    const { profile } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        let cancelled = false;

        const fetchInvoices = async () => {
            if (!profile?.id) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                // Invoices carry a denormalized tenant_uid (== this user's uid)
                // so a tenant session can query them directly - Firestore
                // Security Rules require the query itself to be scoped this
                // way for a `list` read, not just the eventual results.
                const snap = await getDocs(query(collection(db, 'invoices'), where('tenant_uid', '==', profile.id)));
                const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
                const roomById = await fetchByIds<any>('rooms', rows.map((inv) => inv.room_id));
                const withRoom = rows
                    .map((inv) => ({ ...inv, room: roomById.get(inv.room_id) }))
                    .sort((a, b) => {
                        const monthCompare = String(b.billing_month || '').localeCompare(String(a.billing_month || ''));
                        if (monthCompare !== 0) return monthCompare;
                        return String(b.created_at || '').localeCompare(String(a.created_at || ''));
                    });

                if (!cancelled) setInvoices(withRoom);
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

    const filteredInvoices = invoices.filter(
        (invoice) => Number(String(invoice.billing_month || '').slice(0, 4)) === selectedYear
    );

    const yearSelect = (
        <Box w="150px">
            <select
                className="chakra-select"
                style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    width: '100%'
                }}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                    <option key={year} value={year}>พ.ศ. {year + 543}</option>
                ))}
            </select>
        </Box>
    );

    return (
        <VStack align="stretch" gap={6} py={4}>
            <HStack justify="space-between">
                <Heading size="lg">บิลและการชำระเงิน</Heading>
                {yearSelect}
            </HStack>

            <Box display={{ base: 'block', md: 'none' }}>
                {isLoading ? (
                    <Text textAlign="center">กำลังโหลด...</Text>
                ) : filteredInvoices.length === 0 ? (
                    <Text textAlign="center" color="fg.muted">ไม่พบประวัติการชำระเงินสำหรับปีนี้</Text>
                ) : (
                    filteredInvoices.map((invoice) => (
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
                            ) : filteredInvoices.length === 0 ? (
                                <Table.Row><Table.Cell colSpan={6} textAlign="center">ไม่พบประวัติการชำระเงินสำหรับปีนี้</Table.Cell></Table.Row>
                            ) : filteredInvoices.map((invoice) => (
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
