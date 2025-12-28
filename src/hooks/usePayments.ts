import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import type { PaymentFormData } from '../types';
import { toaster } from '../components/ui/toaster';

export const useCreatePayment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ data, file }: { data: PaymentFormData; file?: File }) =>
            paymentService.createPayment(data, file),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['invoices'] });
            queryClient.invalidateQueries({ queryKey: ['invoice', variables.data.invoice_id] });
            queryClient.invalidateQueries({ queryKey: ['payments', variables.data.invoice_id] });

            toaster.create({
                title: 'บันทึกการชำระเงินสำเร็จ',
                type: 'success',
            });
        },
        onError: (error: any) => {
            console.error('Error creating payment:', error);
            toaster.create({
                title: 'เกิดข้อผิดพลาด',
                description: error.message || 'ไม่สามารถบันทึกการชำระเงินได้',
                type: 'error',
            });
        },
    });
};

export const usePayments = (invoiceId: string) => {
    return useQuery({
        queryKey: ['payments', invoiceId],
        queryFn: () => paymentService.getPaymentsByInvoiceId(invoiceId),
        enabled: !!invoiceId,
    });
};
