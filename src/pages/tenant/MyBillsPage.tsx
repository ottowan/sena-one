import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Badge, Text, HStack, Button, Table, Separator } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
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

// Sub-component for Invoice Details
const InvoiceDetailDialog = ({ invoice }: { invoice: any }) => {
    // Calculate effective rates (handling division by zero)
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
                    <DialogTitle>รายละเอียดใบแจ้งหนี้ - {invoice.billing_month}</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>
                <DialogBody>
                    <VStack align="stretch" gap={3}>
                        <HStack justify="space-between">
                            <Text color="gray.600">ค่าเช่าห้อง:</Text>
                            <Text fontWeight="medium">{formatCurrency(invoice.rent_amount)}</Text>
                        </HStack>

                        {/* Water Details */}
                        <Box p={3} bg="blue.50" borderRadius="md">
                            <Text fontWeight="bold" color="blue.700" mb={1}>ค่าน้ำประปา</Text>
                            <HStack justify="space-between" fontSize="sm">
                                <Text color="gray.600">
                                    มิเตอร์: {invoice.water_meter_last} {'->'} {invoice.water_meter_current}
                                </Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" mt={1}>
                                <Text color="gray.600">
                                    การคำนวณ: {invoice.water_usage} หน่วย x {waterRate} บ.
                                </Text>
                                <Text fontWeight="medium" color="blue.700">{formatCurrency(invoice.water_cost)}</Text>
                            </HStack>
                        </Box>

                        {/* Electricity Details */}
                        <Box p={3} bg="orange.50" borderRadius="md">
                            <Text fontWeight="bold" color="orange.700" mb={1}>ค่าไฟฟ้า</Text>
                            <HStack justify="space-between" fontSize="sm">
                                <Text color="gray.600">
                                    มิเตอร์: {invoice.electricity_meter_last} {'->'} {invoice.electricity_meter_current}
                                </Text>
                            </HStack>
                            <HStack justify="space-between" fontSize="sm" mt={1}>
                                <Text color="gray.600">
                                    การคำนวณ: {invoice.electricity_usage} หน่วย x {electricityRate} บ.
                                </Text>
                                <Text fontWeight="medium" color="orange.700">{formatCurrency(invoice.electricity_cost)}</Text>
                            </HStack>
                        </Box>

                        {/* Additional Charges */}
                        {invoice.additional_charges && invoice.additional_charges.length > 0 && (
                            <Box>
                                <Text fontWeight="medium" mb={1}>ค่าใช้จ่ายอื่นๆ</Text>
                                {invoice.additional_charges.map((charge: any, idx: number) => (
                                    <HStack key={idx} justify="space-between" pl={2} fontSize="sm" color="gray.600">
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

// Mobile Card Component
const MobileInvoiceCard = ({ invoice }: { invoice: any }) => {
    return (
        <Card.Root mb={4} variant="subtle">
            <Card.Body p={4}>
                <VStack align="stretch" gap={3}>
                    <HStack justify="space-between">
                        <Text fontWeight="bold" fontSize="lg">{invoice.billing_month}</Text>
                        <Badge colorPalette={invoice.status === 'paid' ? 'green' : invoice.status === 'pending' ? 'yellow' : 'red'}>
                            {invoice.status === 'paid' ? 'ชำระแล้ว' : invoice.status === 'pending' ? 'รอชำระ' : 'ยกเลิก'}
                        </Badge>
                    </HStack>

                    <HStack justify="space-between" color="gray.600" fontSize="sm">
                        <Text>ห้อง:</Text>
                        <Text>
                            {Array.isArray(invoice.contract?.room)
                                ? invoice.contract.room[0]?.room_number
                                : invoice.contract?.room?.room_number}
                        </Text>
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

export const MyBillsPage: React.FC = () => {
    const { profile } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
            // ... (Keep existing fetch logic)
            if (!profile?.id) return;

            // 1. Get Tenant ID
            const { data: tenant } = await supabase
                .from('tenants')
                .select('id')
                .eq('user_id', profile.id)
                .maybeSingle();

            if (!tenant) {
                setIsLoading(false);
                return;
            }

            // 2. Get Invoices by Tenant ID
            const { data } = await supabase
                .from('invoices')
                .select('*, contract:contracts(room:rooms(room_number))')
                .eq('tenant_id', tenant.id)
                .order('created_at', { ascending: false });

            setInvoices(data || []);
            setIsLoading(false);
        };

        fetchInvoices();
    }, [profile]);

    return (
        <VStack align="stretch" gap={6} py={4}>
            <Heading size="lg">บิลและการชำระเงิน</Heading>

            {/* Mobile View: Cards */}
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

            {/* Desktop View: Table */}
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
                                    <Table.Cell>{invoice.billing_month}</Table.Cell>
                                    <Table.Cell>
                                        {Array.isArray(invoice.contract?.room)
                                            ? invoice.contract.room[0]?.room_number
                                            : invoice.contract?.room?.room_number}
                                    </Table.Cell>
                                    <Table.Cell textAlign="right" fontWeight="bold">{formatCurrency(invoice.total_amount)}</Table.Cell>
                                    <Table.Cell>{invoice.due_date}</Table.Cell>
                                    <Table.Cell>
                                        <Badge colorPalette={invoice.status === 'paid' ? 'green' : invoice.status === 'pending' ? 'yellow' : 'red'}>
                                            {invoice.status === 'paid' ? 'ชำระแล้ว' : invoice.status === 'pending' ? 'รอชำระ' : 'ยกเลิก'}
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
