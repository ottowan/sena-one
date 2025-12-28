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
import { Input, VStack, Text, Textarea, Box, Icon, Image } from '@chakra-ui/react';
import { Field } from '../ui/field';
import { NativeSelectField, NativeSelectRoot } from '../ui/native-select';
import { LuUpload, LuX } from 'react-icons/lu';
import { useCreatePayment } from '../../hooks/usePayments';
import { PaymentMethod, type Invoice } from '../../types';

interface PaymentDialogProps {
    open: boolean;
    onClose: () => void;
    invoice: Invoice | null;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
    open,
    onClose,
    invoice,
}) => {
    const createPayment = useCreatePayment();

    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10)); // YYYY-MM-DD
    const [notes, setNotes] = useState('');
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [slipPreview, setSlipPreview] = useState<string | null>(null);

    // Initialize amount when invoice changes
    React.useEffect(() => {
        if (invoice) {
            setAmount(invoice.total_amount.toString());
        }
    }, [invoice, open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSlipFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setSlipPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveSlip = () => {
        setSlipFile(null);
        setSlipPreview(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoice) return;

        createPayment.mutate(
            {
                data: {
                    invoice_id: invoice.id,
                    amount: parseFloat(amount),
                    payment_method: paymentMethod,
                    payment_date: paymentDate,
                    notes: notes,
                },
                file: slipFile || undefined,
            },
            {
                onSuccess: () => {
                    onClose();
                    // Reset fields
                    setSlipFile(null);
                    setSlipPreview(null);
                    setNotes('');
                },
            }
        );
    };

    if (!invoice) return null;

    return (
        <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg">
            <DialogBackdrop />
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>บันทึกการชำระเงิน</DialogTitle>
                    <DialogCloseTrigger />
                </DialogHeader>

                <DialogBody>
                    <form onSubmit={handleSubmit} id="payment-form">
                        <VStack align="stretch" gap={4}>
                            <Box p={4} bg="blue.50" borderRadius="md">
                                <Text fontSize="sm" color="blue.700" fontWeight="medium">
                                    ใบแจ้งหนี้รอบ: {new Date(invoice.billing_month).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                                </Text>
                                <Text fontSize="lg" fontWeight="bold" color="blue.800">
                                    ยอดชำระ: ฿{invoice.total_amount.toLocaleString()}
                                </Text>
                            </Box>

                            <Field label="จำนวนเงินที่ชำระ" required>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </Field>

                            <Field label="วันที่โอน/ชำระ" required>
                                <Input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                />
                            </Field>

                            <Field label="ช่องทางการชำระ" required>
                                <NativeSelectRoot>
                                    <NativeSelectField
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    >
                                        <option value={PaymentMethod.TRANSFER}>โอนเงิน</option>
                                        <option value={PaymentMethod.QR}>สแกน QR Code</option>
                                        <option value={PaymentMethod.CASH}>เงินสด</option>
                                    </NativeSelectField>
                                </NativeSelectRoot>
                            </Field>

                            <Field label="หลักฐานการโอน (สลิป)">
                                {slipPreview ? (
                                    <Box position="relative" width="fit-content">
                                        <Image
                                            src={slipPreview}
                                            alt="Slip preview"
                                            maxH="200px"
                                            borderRadius="md"
                                            border="1px solid"
                                            borderColor="gray.200"
                                        />
                                        <Button
                                            size="xs"
                                            position="absolute"
                                            top={-2}
                                            right={-2}
                                            colorPalette="red"
                                            borderRadius="full"
                                            onClick={handleRemoveSlip}
                                            p={1}
                                        >
                                            <Icon>
                                                <LuX />
                                            </Icon>
                                        </Button>
                                    </Box>
                                ) : (
                                    <Box
                                        border="2px dashed"
                                        borderColor="gray.300"
                                        borderRadius="md"
                                        p={6}
                                        textAlign="center"
                                        cursor="pointer"
                                        onClick={() => document.getElementById('slip-upload')?.click()}
                                        _hover={{ borderColor: 'blue.500', bg: 'gray.50' }}
                                    >
                                        <VStack gap={2}>
                                            <Icon fontSize="2xl" color="gray.400">
                                                <LuUpload />
                                            </Icon>
                                            <Text fontSize="sm" color="gray.600">
                                                คลิกเพื่ออัปโหลดรูปภาพ
                                            </Text>
                                        </VStack>
                                        <input
                                            id="slip-upload"
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={handleFileChange}
                                        />
                                    </Box>
                                )}
                            </Field>

                            <Field label="หมายเหตุ">
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="ระบุหมายเหตุ (ถ้ามี)"
                                    rows={2}
                                />
                            </Field>
                        </VStack>
                    </form>
                </DialogBody>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        ยกเลิก
                    </Button>
                    <Button
                        type="submit"
                        form="payment-form"
                        colorPalette="green"
                        disabled={createPayment.isPending}
                    >
                        บันทึกการชำระ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </DialogRoot>
    );
};
