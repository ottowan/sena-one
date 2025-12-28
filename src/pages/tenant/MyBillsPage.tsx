import React, { useEffect, useState } from 'react';
import { Box, Card, Heading, VStack, Badge, Text, HStack, Button, Table } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { LuDownload } from 'react-icons/lu';

export const MyBillsPage: React.FC = () => {
    const { profile } = useAuth();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInvoices = async () => {
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

            <Card.Root>
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
                                        {/* Placeholder for Download/Pay action */}
                                        <Button size="xs" variant="ghost">
                                            <LuDownload /> รายละเอียด
                                        </Button>
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
