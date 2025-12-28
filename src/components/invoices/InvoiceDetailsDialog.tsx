import React, { useState } from 'react';
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
import { VStack, Grid, Text, HStack, Badge, Box, Separator, Icon } from '@chakra-ui/react';
import type { Invoice } from '../../types';
import { PaymentDialog } from '../../components/payments/PaymentDialog';
import { LuDollarSign } from 'react-icons/lu';

interface InvoiceDetailsDialogProps {
    open: boolean;
    onClose: () => void;
    invoice?: Invoice | null;
}

const getStatusColor = (status: string): string => {
    switch (status) {
        case 'paid':
            return 'green';
        case 'pending':
            return 'yellow';
        case 'overdue':
            return 'red';
        case 'cancelled':
            return 'gray';
        default:
            return 'gray';
    }
};

const getStatusLabel = (status: string): string => {
    switch (status) {
        case 'paid':
            return 'ชำระแล้ว';
        case 'pending':
            return 'รอชำระ';
        case 'overdue':
            return 'เกินกำหนด';
        case 'cancelled':
            return 'ยกเลิก';
        default:
            return status;
    }
};

export const InvoiceDetailsDialog: React.FC<InvoiceDetailsDialogProps> = ({
    open,
    onClose,
    invoice,
}) => {
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

    if (!invoice) return null;

    return (
        <>
            <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
                <DialogBackdrop />
                <DialogContent>
                    <DialogHeader>
                        <HStack justify="space-between" align="center" pr={8}>
                            <DialogTitle>รายละเอียดใบแจ้งหนี้</DialogTitle>
                            <Badge colorPalette={getStatusColor(invoice.status)} size="lg">
                                {getStatusLabel(invoice.status)}
                            </Badge>
                        </HStack>
                        <DialogCloseTrigger />
                    </DialogHeader>

                    <DialogBody>
                        <VStack align="stretch" gap={6}>
                            {/* Header Info */}
                            <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.500" fontSize="sm">เดือน/ปี</Text>
                                    <Text fontWeight="medium" fontSize="lg">
                                        {new Date(invoice.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                    </Text>
                                </VStack>
                                <VStack align="start" gap={1}>
                                    <Text color="gray.500" fontSize="sm">กำหนดชำระ</Text>
                                    <Text fontWeight="medium" fontSize="lg">
                                        {new Date(invoice.due_date).toLocaleDateString('th-TH')}
                                    </Text>
                                </VStack>
                            </Grid>

                            <Box p={4} borderWidth="1px" borderRadius="md" bg="gray.50">
                                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                                    <VStack align="start" gap={1}>
                                        <Text color="gray.500" fontSize="sm">ผู้เช่า</Text>
                                        <Text fontWeight="medium">{invoice.tenant?.full_name}</Text>
                                        <Text fontSize="sm" color="gray.600">{invoice.tenant?.phone}</Text>
                                    </VStack>
                                    <VStack align="start" gap={1}>
                                        <Text color="gray.500" fontSize="sm">ห้อง</Text>
                                        <Text fontWeight="medium">
                                            {invoice.room?.room_number} ({invoice.room?.room_type})
                                        </Text>
                                    </VStack>
                                </Grid>
                            </Box>

                            <Separator />

                            {/* Charges Breakdown */}
                            <VStack align="stretch" gap={3}>
                                <Text fontWeight="bold">รายการเรียกเก็บ</Text>

                                <HStack justify="space-between">
                                    <Text color="gray.600">ค่าเช่าห้องพัก</Text>
                                    <Text fontWeight="medium">฿{invoice.rent_amount.toLocaleString()}</Text>
                                </HStack>

                                <HStack justify="space-between">
                                    <Text color="gray.600">
                                        ค่าน้ำประปา ({invoice.water_usage} หน่วย)
                                    </Text>
                                    <Text fontWeight="medium">฿{invoice.water_cost.toLocaleString()}</Text>
                                </HStack>

                                <HStack justify="space-between">
                                    <Text color="gray.600">
                                        ค่าไฟฟ้า ({invoice.electricity_usage} หน่วย)
                                    </Text>
                                    <Text fontWeight="medium">฿{invoice.electricity_cost.toLocaleString()}</Text>
                                </HStack>

                                {invoice.additional_charges?.map((charge, index) => (
                                    <HStack key={index} justify="space-between">
                                        <Text color="gray.600">{charge.name}</Text>
                                        <Text fontWeight="medium">฿{charge.amount.toLocaleString()}</Text>
                                    </HStack>
                                ))}

                                <Separator />

                                <HStack justify="space-between" bg="blue.50" p={3} borderRadius="md">
                                    <Text fontWeight="bold" color="blue.700">ยอดรวมทั้งสิ้น</Text>
                                    <Text fontWeight="bold" fontSize="xl" color="blue.700">
                                        ฿{invoice.total_amount.toLocaleString()}
                                    </Text>
                                </HStack>
                            </VStack>
                        </VStack>
                    </DialogBody>

                    <DialogFooter>
                        {invoice.status !== 'paid' && (
                            <Button
                                colorPalette="green"
                                onClick={() => setPaymentDialogOpen(true)}
                            >
                                <Icon>
                                    <LuDollarSign />
                                </Icon>
                                แจ้งชำระเงิน
                            </Button>
                        )}
                        <Button variant="outline" onClick={onClose}>
                            ปิด
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </DialogRoot>

            <PaymentDialog
                open={paymentDialogOpen}
                onClose={() => setPaymentDialogOpen(false)}
                invoice={invoice}
            />
        </>
    );
};
